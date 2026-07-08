// ============================================================================
// A5/1.11 — POST /api/assessment/start: start (lub wznowienie) sesji diagnozy.
// Spec: docs/design/skillbridge-a5-bank-pytan-diagnoza-spec-v0.2.md §2.5/§4.
//
// Body: {"competencyNames": string[]} — Opcja A (decyzja Darka): diagnoza
// mierzy TYLKO kompetencje zaznaczone przez studenta; careerGoal bierzemy
// z wiersza studenta (krok 0 kreatora), nie z body.
//
// Cykl życia (§2.5): jedna aktywna sesja per student (partial unique 0030);
// wznowienie na zamrożonym planie, gdy odcisk wejścia się zgadza i sesja nie
// wygasła (TTL 7 dni); mismatch/TTL → abandoned + nowa sesja. Plan liczony
// deterministycznie (sól = id sesji, wykluczenia itemów poprzednich sesji).
// Zero pokrycia banku → 422 z listą `uncovered` (1.12 degraduje do samooceny).
//
// Odpowiedź: pierwsze/następne pytanie (stem+opcje) — NIGDY answer_json.
// ============================================================================

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
	buildPlan,
	computeInputHash,
	expectedNext,
	type SessionAnswer,
} from "@/lib/assessment/plan";
import {
	buildQuestionPayload,
	getStudentByUserId,
	isSessionExpired,
	loadDiagnosticBank,
	loadExcludedItemIds,
} from "@/lib/assessment/service";
import type { AssessmentPlan } from "@/lib/assessment/types";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { assessmentAnswers, assessmentSessions } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

const StartSchema = z.object({
	competencyNames: z.array(z.string().min(1).max(200)).min(1).max(60),
});

function isUniqueViolation(err: unknown): boolean {
	return (
		typeof err === "object" && err !== null && (err as { code?: string }).code === "23505" && true
	);
}

export async function POST(req: Request) {
	if (!isFeatureEnabled("diagnosticAssessment")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	let competencyNames: string[];
	try {
		const parsed = StartSchema.safeParse(await req.json());
		if (!parsed.success) {
			return NextResponse.json(
				{ error: 'Wymagane body: {"competencyNames": string[]}' },
				{ status: 400 },
			);
		}
		competencyNames = parsed.data.competencyNames;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const student = await getStudentByUserId(session.user.id);
	if (!student) {
		return NextResponse.json({ error: "Najpierw uzupełnij profil studenta." }, { status: 404 });
	}

	const inputHash = computeInputHash(student.careerGoal, competencyNames);

	try {
		// Aktywna sesja: wznowienie na zamrożonym planie ALBO abandon (mismatch/TTL).
		const [active] = await db
			.select()
			.from(assessmentSessions)
			.where(
				and(
					eq(assessmentSessions.studentId, student.id),
					eq(assessmentSessions.kind, "diagnostic"),
					eq(assessmentSessions.status, "in_progress"),
				),
			);

		if (active) {
			if (active.inputHash === inputHash && !isSessionExpired(active.startedAt)) {
				const plan = active.planJson as AssessmentPlan;
				const answers: SessionAnswer[] = await db
					.select({
						questionItemId: assessmentAnswers.questionItemId,
						isCorrect: assessmentAnswers.isCorrect,
						position: assessmentAnswers.position,
					})
					.from(assessmentAnswers)
					.where(eq(assessmentAnswers.sessionId, active.id));
				const total = plan.competencies.length * 2;
				const next = expectedNext(plan, answers);
				const question = next ? await buildQuestionPayload(next, total) : null;
				return NextResponse.json({
					sessionId: active.id,
					resumed: true,
					uncovered: plan.uncovered,
					total,
					// null = wszystkie pytania odpowiedziane → klient woła complete.
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

		// Nowa sesja: deterministyczny plan (sól = id sesji, wykluczenia z historii).
		const [bank, excluded] = await Promise.all([
			loadDiagnosticBank(competencyNames),
			loadExcludedItemIds(student.id),
		]);
		const sessionId = randomUUID();
		const plan = buildPlan(competencyNames, bank, sessionId, excluded);

		if (plan.competencies.length === 0) {
			// Jawna degradacja (spec §4): brak pokrycia banku ≠ cichy fallback —
			// 1.12 pokaże samoocenę dla ścieżek/kompetencji bez treści.
			return NextResponse.json(
				{ error: "Bank pytań nie pokrywa wybranych kompetencji.", uncovered: plan.uncovered },
				{ status: 422 },
			);
		}

		await db.insert(assessmentSessions).values({
			id: sessionId,
			studentId: student.id,
			tenantId: student.tenantId,
			kind: "diagnostic",
			careerGoal: student.careerGoal,
			inputHash,
			planJson: plan,
		});

		const total = plan.competencies.length * 2;
		const next = expectedNext(plan, []);
		const question = next ? await buildQuestionPayload(next, total) : null;
		return NextResponse.json(
			{ sessionId, resumed: false, uncovered: plan.uncovered, total, question },
			{ status: 201 },
		);
	} catch (err) {
		if (isUniqueViolation(err)) {
			// Równoległy start (partial unique uq_assessment_sessions_active).
			return NextResponse.json({ error: "Sesja diagnozy już trwa." }, { status: 409 });
		}
		logError("assessment.start", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się rozpocząć diagnozy." }, { status: 500 });
	}
}
