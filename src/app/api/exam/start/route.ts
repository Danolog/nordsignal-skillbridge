// ============================================================================
// 1E.3 (ADR-014 D3) — POST /api/exam/start: start (lub wznowienie) egzaminu
// modułowego. Wzorzec: /api/assessment/start (diagnoza A5).
//
// Body: {"moduleId": uuid}. Egzamin mierzy JEDEN moduł; parametry (liczba pytań,
// licznik błędów) z curriculum_modules.exam_config_json (zamrożone w planie).
//
// Cykl życia (jak diagnoza): jedna aktywna sesja per (student, module_exam,
// module_id) — partial unique; wznowienie na zamrożonym planie przy zgodnym
// odcisku (moduł+podejście) i żywym TTL; mismatch/TTL → abandoned + nowa.
//
// FLAGA OFF (masteryGate) → 404: trasa nie istnieje, dopóki bramka nie zapalona.
// Odpowiedź: pierwsze/następne pytanie (stem+opcje) — NIGDY klucza.
// ============================================================================

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
	buildExamPlan,
	type ExamPlan,
	type ExamSessionAnswer,
	expectedExamPosition,
	resolveVariant,
} from "@/lib/assessment/exam";
import {
	buildExamQuestionPayload,
	computeExamInputHash,
	evaluateExamCycle,
	getStudentByUserId,
	isExamSessionExpired,
	loadExamBank,
	loadModuleExamConfig,
} from "@/lib/assessment/exam-service";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/pg-error";
import { assessmentAnswers, assessmentSessions, curriculumModules } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

const StartSchema = z.object({ moduleId: z.string().uuid() });

export async function POST(req: Request) {
	if (!isFeatureEnabled("masteryGate")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	let moduleId: string;
	try {
		const parsed = StartSchema.safeParse(await req.json());
		if (!parsed.success) {
			return NextResponse.json({ error: 'Wymagane body: {"moduleId": uuid}' }, { status: 400 });
		}
		moduleId = parsed.data.moduleId;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const student = await getStudentByUserId(session.user.id);
	if (!student) {
		return NextResponse.json({ error: "Najpierw uzupełnij profil studenta." }, { status: 404 });
	}

	try {
		const [module] = await db
			.select({ id: curriculumModules.id, slug: curriculumModules.slug })
			.from(curriculumModules)
			.where(eq(curriculumModules.id, moduleId));
		if (!module) return NextResponse.json({ error: "Moduł nie istnieje." }, { status: 404 });

		const config = await loadModuleExamConfig(moduleId);
		if (!config) {
			return NextResponse.json(
				{ error: "Moduł nie ma skonfigurowanego egzaminu." },
				{ status: 422 },
			);
		}
		const bank = await loadExamBank(moduleId, module.slug);
		if (!bank) {
			return NextResponse.json(
				{ error: "Brak banku pytań egzaminacyjnych dla modułu." },
				{ status: 422 },
			);
		}

		// Podejście liczone w obrębie BIEŻĄCEGO cyklu (ADR-014 D3 / decyzje P5 Sophii
		// D1/D2): cykl = do EXAM_MAX_ATTEMPTS(2) oblań; correctives odbyte resetują
		// cykl (podejście od 1). evaluateExamCycle derywuje granicę cyklu z istniejących
		// danych (znaczniki czasu assessment_sessions + curriculum_item_answers) —
		// zero nowej kolumny, zero migracji.
		const cycle = await evaluateExamCycle(student.id, moduleId);

		// S-C (2 oblania w cyklu, correctives NIEODBYTE) → /start ODRZUCA utworzenie
		// sesji stanem `correctives_required` (D2 — domyka lukę clampAttempt(3)=2, brak
		// wariantu B w nieskończoność). 423 Locked + paczka correctives z result_json
		// oblanej sesji (ta sama, którą P4 pokazał przy 2. oblaniu) — front renderuje
		// Ekran 5 także z tej odpowiedzi, nie tylko z ekranu wyniku.
		if (cycle.correctivesRequired) {
			if (!cycle.correctivesPackage) {
				// Niezmiennik D2: correctivesRequired ⟹ paczka obecna (z result_json oblanej
				// cap-2 sesji, którą P4 zapisał). Brak paczki = stan ZDEGRADOWANY (np. stare
				// result_json bez paczki). NIE degraduj cicho do generycznego błędu — zasygnalizuj
				// jawnie (log/Sentry), a klient dostaje 423 correctives_required bez paczki i
				// pokazuje DEDYKOWANĄ twardą blokadę (bez retry), nie „network".
				logError(
					"exam.start.correctivesMissing",
					new Error("correctivesRequired bez correctivesPackage (result_json zdegradowany)"),
					{ userId: session.user.id, moduleId },
				);
			}
			return NextResponse.json(
				{ state: "correctives_required", correctivesPackage: cycle.correctivesPackage },
				{ status: 423 },
			);
		}
		const attempt = cycle.attempt;

		// Aktywna sesja: wznowienie na zamrożonym planie ALBO abandon (mismatch/TTL).
		const [active] = await db
			.select()
			.from(assessmentSessions)
			.where(
				and(
					eq(assessmentSessions.studentId, student.id),
					eq(assessmentSessions.kind, "module_exam"),
					eq(assessmentSessions.moduleId, moduleId),
					eq(assessmentSessions.status, "in_progress"),
				),
			);

		if (active) {
			const inputHash = computeExamInputHash(moduleId, (active.planJson as ExamPlan).attempt);
			if (active.inputHash === inputHash && !isExamSessionExpired(active.startedAt)) {
				const plan = active.planJson as ExamPlan;
				const answers: ExamSessionAnswer[] = await db
					.select({
						position: assessmentAnswers.position,
						isCorrect: assessmentAnswers.isCorrect,
					})
					.from(assessmentAnswers)
					.where(eq(assessmentAnswers.sessionId, active.id));
				const total = plan.items.length;
				const nextItem = expectedExamPosition(plan, answers);
				const variant = nextItem ? resolveVariant(bank, nextItem.variantRef) : null;
				const question =
					nextItem && variant
						? buildExamQuestionPayload(variant, nextItem.slotRef, nextItem.position, total)
						: null;
				return NextResponse.json({
					sessionId: active.id,
					resumed: true,
					attempt: plan.attempt,
					total,
					question,
				});
			}
			await db
				.update(assessmentSessions)
				.set({ status: "abandoned" })
				.where(
					and(eq(assessmentSessions.id, active.id), eq(assessmentSessions.status, "in_progress")),
				);
		}

		// Nowa sesja: plan zamrożony przed 1. pokazaniem (sól = id sesji).
		const sessionId = randomUUID();
		const plan = buildExamPlan(bank, config, sessionId, attempt);
		const inputHash = computeExamInputHash(moduleId, attempt);

		await db.insert(assessmentSessions).values({
			id: sessionId,
			studentId: student.id,
			tenantId: student.tenantId,
			kind: "module_exam",
			moduleId,
			inputHash,
			planJson: plan,
		});

		const total = plan.items.length;
		const nextItem = expectedExamPosition(plan, []);
		const variant = nextItem ? resolveVariant(bank, nextItem.variantRef) : null;
		const question =
			nextItem && variant
				? buildExamQuestionPayload(variant, nextItem.slotRef, nextItem.position, total)
				: null;
		return NextResponse.json(
			{ sessionId, resumed: false, attempt: plan.attempt, total, question },
			{ status: 201 },
		);
	} catch (err) {
		if (isUniqueViolation(err)) {
			return NextResponse.json({ error: "Egzamin tego modułu już trwa." }, { status: 409 });
		}
		logError("exam.start", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się rozpocząć egzaminu." }, { status: 500 });
	}
}
