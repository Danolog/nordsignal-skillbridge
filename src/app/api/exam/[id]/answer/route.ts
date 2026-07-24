// ============================================================================
// 1E.3 (ADR-014 D3) — POST /api/exam/[id]/answer: odpowiedź na oczekiwane
// pytanie egzaminu. Wzorzec: /api/assessment/[id]/answer (diagnoza A5).
//
// Serwer egzekwuje kolejność LINIOWĄ: slot ≠ oczekiwana następna pozycja → 409
// bez gradingu. Odpowiedź trasy NIE zawiera is_correct ani feedbacku (integralność
// egzaminu — werdykt dopiero w complete); zwraca „przyjęto + następne pytanie".
//
// Grading deterministyczny (grade.ts, 0 LLM) po kluczu z banku (owner-side,
// question_items DENY) — klucz nigdy nie opuszcza serwera. Zapis w transakcji
// (FOR UPDATE na sesji); wyścig na UNIQUE(session_id, position) → 409.
//
// FLAGA OFF (masteryGate) → 404.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
	type ExamPlan,
	type ExamSessionAnswer,
	expectedExamPosition,
	resolveVariant,
} from "@/lib/assessment/exam";
import {
	buildExamQuestionPayload,
	getStudentByUserId,
	isExamSessionExpired,
	loadExamBank,
} from "@/lib/assessment/exam-service";
import { gradeAnswer } from "@/lib/assessment/grade";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { assessmentAnswers, assessmentSessions } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

/** Konflikt stanu/kolejności → 409 (wzorzec diagnozy). */
class ExamConflictError extends Error {}

const AnswerSchema = z.object({
	slotRef: z.string().min(1).max(40),
	answer: z.object({ selected: z.number().int().min(0).max(50) }),
});

function isUniqueViolation(err: unknown): boolean {
	return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("masteryGate")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	if (!z.string().uuid().safeParse(id).success) {
		return NextResponse.json({ error: "Nieprawidłowe id sesji" }, { status: 400 });
	}

	let body: z.infer<typeof AnswerSchema>;
	try {
		const parsed = AnswerSchema.safeParse(await req.json());
		if (!parsed.success) {
			return NextResponse.json(
				{ error: 'Wymagane body: {"slotRef": string, "answer": {"selected": int}}' },
				{ status: 400 },
			);
		}
		body = parsed.data;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const student = await getStudentByUserId(session.user.id);
	if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

	try {
		// Klucz z banku owner-side (treść niemutowalna) — poza transakcją zapisu.
		const [meta] = await db
			.select({
				studentId: assessmentSessions.studentId,
				moduleId: assessmentSessions.moduleId,
				planJson: assessmentSessions.planJson,
			})
			.from(assessmentSessions)
			.where(eq(assessmentSessions.id, id));
		if (!meta || meta.studentId !== student.id || !meta.moduleId) {
			return NextResponse.json({ error: "Sesja nie istnieje" }, { status: 404 });
		}
		const plan = meta.planJson as ExamPlan;
		const bank = await loadExamBank(meta.moduleId, plan.moduleSlug);
		if (!bank) {
			return NextResponse.json({ error: "Bank egzaminu niedostępny." }, { status: 422 });
		}

		const result = await db.transaction(async (tx) => {
			const [assessment] = await tx
				.select()
				.from(assessmentSessions)
				.where(eq(assessmentSessions.id, id))
				.for("update");
			if (!assessment || assessment.studentId !== student.id) {
				return { outcome: "not_found" as const };
			}
			if (assessment.status !== "in_progress") {
				throw new ExamConflictError("Egzamin nie jest aktywny.");
			}
			if (isExamSessionExpired(assessment.startedAt)) {
				await tx
					.update(assessmentSessions)
					.set({ status: "abandoned" })
					.where(eq(assessmentSessions.id, id));
				throw new ExamConflictError("Egzamin wygasł — rozpocznij od nowa.");
			}

			const answers: ExamSessionAnswer[] = await tx
				.select({
					position: assessmentAnswers.position,
					isCorrect: assessmentAnswers.isCorrect,
				})
				.from(assessmentAnswers)
				.where(eq(assessmentAnswers.sessionId, id));

			const expected = expectedExamPosition(plan, answers);
			if (!expected) {
				throw new ExamConflictError("Wszystkie pytania mają odpowiedź — zakończ egzamin.");
			}
			if (expected.slotRef !== body.slotRef) {
				throw new ExamConflictError("Pytanie niezgodne z kolejnością egzaminu.");
			}
			const variant = resolveVariant(bank, expected.variantRef);
			if (!variant || variant.itemId === undefined) {
				throw new Error(`Wariant ${expected.variantRef} z planu nieobecny w banku`);
			}

			const isCorrect = gradeAnswer("single_choice", { correct: variant.correct }, body.answer);
			// Zapis odpowiedzi = jednocześnie ŚLAD AKTYWNOŚCI (P4/1.18): answered_at
			// tego wiersza czyta getActivityTrace (assessment_answers w UNION), więc
			// podejście do egzaminu liczy się do streaka bez osobnego wpięcia.
			await tx.insert(assessmentAnswers).values({
				sessionId: id,
				studentId: student.id,
				tenantId: assessment.tenantId,
				questionItemId: variant.itemId,
				answerJson: body.answer,
				isCorrect,
				position: expected.position,
			});

			const next = expectedExamPosition(plan, [
				...answers,
				{ position: expected.position, isCorrect },
			]);
			return { outcome: "accepted" as const, next };
		});

		if (result.outcome === "not_found") {
			return NextResponse.json({ error: "Sesja nie istnieje" }, { status: 404 });
		}
		const total = plan.items.length;
		const variant = result.next ? resolveVariant(bank, result.next.variantRef) : null;
		const question =
			result.next && variant
				? buildExamQuestionPayload(variant, result.next.slotRef, result.next.position, total)
				: null;
		// Bez is_correct — werdykt dopiero w complete.
		return NextResponse.json({ accepted: true, done: question === null, question });
	} catch (err) {
		if (err instanceof ExamConflictError) {
			return NextResponse.json({ error: err.message }, { status: 409 });
		}
		if (isUniqueViolation(err)) {
			return NextResponse.json({ error: "Odpowiedź już zapisana." }, { status: 409 });
		}
		logError("exam.answer", err, { sessionId: id, userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać odpowiedzi." }, { status: 500 });
	}
}
