// ============================================================================
// A5/1.11 — POST /api/assessment/[id]/answer: odpowiedź na oczekiwane pytanie.
// Spec §2.2/§2.4 [REV]: serwer egzekwuje staircase — item ≠ oczekiwany następny
// krok planu → 409 bez gradingu (klient nie może odpowiadać poza kolejnością
// ani na item spoza planu). Odpowiedź trasy NIE zawiera is_correct ani
// explanation_md (diagnoza bez feedbacku w trakcie — integralność §2.2);
// zwraca tylko „przyjęto + następne pytanie".
//
// Zapis owner-side w JEDNEJ transakcji (FOR UPDATE na sesji): grading
// deterministyczny (grade.ts, 0 LLM) + INSERT; wyścig na UNIQUE(session_id,
// position)/(session_id, question_item_id) → 409.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeAnswer } from "@/lib/assessment/grade";
import { expectedNext, type SessionAnswer } from "@/lib/assessment/plan";
import {
	buildQuestionPayload,
	getStudentByUserId,
	isSessionExpired,
} from "@/lib/assessment/service";
import type { AssessmentPlan, QuestionType } from "@/lib/assessment/types";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/pg-error";
import { assessmentAnswers, assessmentSessions, questionItems } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

/** Konflikt stanu sesji/kolejności → 409 (wzorzec review-queue decision). */
class AnswerConflictError extends Error {}

const AnswerSchema = z.object({
	questionItemId: z.string().uuid(),
	// Kształt per typ pytania; grade.ts jest fail-closed, ale walidacja tnie
	// rozmiar payloadu zanim cokolwiek trafi do bazy (answer_json).
	answer: z.union([
		z.object({ selected: z.number().int().min(0).max(50) }),
		z.object({ selected: z.array(z.number().int().min(0).max(50)).max(20) }),
		z.object({ value: z.string().max(500) }),
	]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("diagnosticAssessment")) {
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
				{ error: 'Wymagane body: {"questionItemId": uuid, "answer": {...}}' },
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
		const result = await db.transaction(async (tx) => {
			const [assessment] = await tx
				.select()
				.from(assessmentSessions)
				.where(eq(assessmentSessions.id, id))
				.for("update");

			// Nieistniejąca ALBO cudza sesja → to samo 404 (nie potwierdzamy istnienia).
			if (!assessment || assessment.studentId !== student.id) {
				return { outcome: "not_found" as const };
			}
			if (assessment.status !== "in_progress") {
				throw new AnswerConflictError("Sesja diagnozy nie jest aktywna.");
			}
			if (isSessionExpired(assessment.startedAt)) {
				await tx
					.update(assessmentSessions)
					.set({ status: "abandoned" })
					.where(eq(assessmentSessions.id, id));
				throw new AnswerConflictError("Sesja diagnozy wygasła — rozpocznij od nowa.");
			}

			const plan = assessment.planJson as AssessmentPlan;
			const answers: SessionAnswer[] = await tx
				.select({
					questionItemId: assessmentAnswers.questionItemId,
					isCorrect: assessmentAnswers.isCorrect,
					position: assessmentAnswers.position,
				})
				.from(assessmentAnswers)
				.where(eq(assessmentAnswers.sessionId, id));

			const expected = expectedNext(plan, answers);
			if (!expected) {
				throw new AnswerConflictError("Wszystkie pytania mają już odpowiedź — zakończ diagnozę.");
			}
			if (expected.itemId !== body.questionItemId) {
				// Item spoza planu albo poza kolejnością staircase — bez gradingu.
				throw new AnswerConflictError("Pytanie niezgodne z kolejnością testu.");
			}

			const [item] = await tx
				.select({
					id: questionItems.id,
					type: questionItems.type,
					answerJson: questionItems.answerJson,
				})
				.from(questionItems)
				.where(eq(questionItems.id, expected.itemId));
			if (!item) {
				// Plan wskazuje item, którego nie ma (retire po starcie sesji byłby
				// błędem procesu treści — itemy są niemutowalne, nie kasowane).
				throw new Error(`Item ${expected.itemId} z planu nie istnieje w banku`);
			}

			const isCorrect = gradeAnswer(item.type as QuestionType, item.answerJson, body.answer);
			await tx.insert(assessmentAnswers).values({
				sessionId: id,
				studentId: student.id,
				tenantId: student.tenantId,
				questionItemId: expected.itemId,
				answerJson: body.answer,
				isCorrect,
				position: expected.position,
			});

			const next = expectedNext(plan, [
				...answers,
				{ questionItemId: expected.itemId, isCorrect, position: expected.position },
			]);
			return { outcome: "accepted" as const, plan, next };
		});

		if (result.outcome === "not_found") {
			return NextResponse.json({ error: "Sesja nie istnieje" }, { status: 404 });
		}

		const total = result.plan.competencies.length * 2;
		const question = result.next ? await buildQuestionPayload(result.next, total) : null;
		// Bez is_correct — wyniki dopiero w complete (spec §2.2).
		return NextResponse.json({ accepted: true, done: question === null, question });
	} catch (err) {
		if (err instanceof AnswerConflictError) {
			return NextResponse.json({ error: err.message }, { status: 409 });
		}
		if (isUniqueViolation(err)) {
			return NextResponse.json({ error: "Odpowiedź już zapisana." }, { status: 409 });
		}
		logError("assessment.answer", err, { sessionId: id, userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać odpowiedzi." }, { status: 500 });
	}
}
