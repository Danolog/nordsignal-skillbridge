// ============================================================================
// A5/1.11 — POST /api/assessment/[id]/complete: domknięcie diagnozy.
// Spec §2.5/§3 [REV]:
//  - idempotencja: UPDATE ... WHERE status='in_progress' pod FOR UPDATE;
//    drugi complete → 409 (zapis do competencies tylko przy pierwszym),
//  - koperta wyniku: koncepty (źródło prawdy — placement 1E.7) + kompetencje
//    (rollup 1–4) w result_json,
//  - PRECEDENCJA zapisu do competencies: diagnoza nadpisuje WYŁĄCZNIE wiersze
//    verified_by_method IN ('self','diagnostic') — przyszłe silniejsze metody
//    (np. weryfikacja receiptem) nie mogą być zdegradowane słabszym dowodem,
//  - poziom → status przez ratyfikowane levelToStatus (B4); poziom ląduje
//    też w self_assessment (jedna kolumna poziomu; provenance w
//    verified_by_method='diagnostic' — migracja 0029 CHECK).
// Wynik wraca do klienta (poziomy per kompetencja + uncovered) — dopiero tu
// student poznaje rezultat (w trakcie testu zero feedbacku, §2.2).
// ============================================================================

import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { computeResult, type SessionAnswer } from "@/lib/assessment/plan";
import { getStudentByUserId, isSessionExpired } from "@/lib/assessment/service";
import type { AssessmentPlan } from "@/lib/assessment/types";
import { auth } from "@/lib/auth/server";
import { recordPlacementOnDiagnosisComplete } from "@/lib/curriculum/placement-service";
import { db } from "@/lib/db";
import { assessmentAnswers, assessmentSessions, competencies } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { levelToStatus } from "@/lib/self-assessment";

/** Konflikt stanu sesji → 409. */
class CompleteConflictError extends Error {}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("diagnosticAssessment")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	if (!z.string().uuid().safeParse(id).success) {
		return NextResponse.json({ error: "Nieprawidłowe id sesji" }, { status: 400 });
	}

	const student = await getStudentByUserId(session.user.id);
	if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

	try {
		const outcome = await db.transaction(async (tx) => {
			const [assessment] = await tx
				.select()
				.from(assessmentSessions)
				.where(eq(assessmentSessions.id, id))
				.for("update");

			if (!assessment || assessment.studentId !== student.id) {
				return { kind: "not_found" as const };
			}
			if (assessment.status !== "in_progress") {
				// Drugi complete (albo sesja porzucona) — wynik już zapisany/nieosiągalny.
				throw new CompleteConflictError("Sesja diagnozy nie jest aktywna.");
			}
			if (isSessionExpired(assessment.startedAt)) {
				await tx
					.update(assessmentSessions)
					.set({ status: "abandoned" })
					.where(eq(assessmentSessions.id, id));
				throw new CompleteConflictError("Sesja diagnozy wygasła — rozpocznij od nowa.");
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

			const result = computeResult(plan, answers);
			if (!result) {
				return { kind: "incomplete" as const };
			}

			await tx
				.update(assessmentSessions)
				.set({ status: "completed", resultJson: result, completedAt: new Date() })
				.where(and(eq(assessmentSessions.id, id), eq(assessmentSessions.status, "in_progress")));

			// Precedencja (§2.5): nadpisujemy tylko 'self'/'diagnostic'. Wiersze,
			// których student nie ma (kompetencja zbadana, ale niezapisana w
			// onboardingu), pomijamy — tworzenie wierszy to przepływ 1.12.
			let updatedCompetencies = 0;
			for (const [name, level] of Object.entries(result.competencies)) {
				const updated = await tx
					.update(competencies)
					.set({
						selfAssessment: level,
						status: levelToStatus(level),
						verifiedByMethod: "diagnostic",
					})
					.where(
						and(
							eq(competencies.studentId, student.id),
							eq(competencies.name, name),
							inArray(competencies.verifiedByMethod, ["self", "diagnostic"]),
						),
					)
					.returning({ id: competencies.id });
				updatedCompetencies += updated.length;
			}

			// `sessionKind` (nie `kind` — to dyskryminanta wyniku transakcji) niesie
			// rodzaj sesji na zewnątrz: hook placementu 1E.7 wolno odpalić WYŁĄCZNIE
			// dla 'diagnostic'. Ta trasa nie filtruje po rodzaju (egzamin modułowy ma
			// własną — /api/exam/[id]/complete), więc sesja 'module_exam' własnego
			// studenta domknięta tędy policzyłaby placement z wyniku EGZAMINU.
			// Rozróżnienie exam/test_out to L5; do tego czasu bramka jest tu.
			return {
				kind: "completed" as const,
				sessionKind: assessment.kind,
				result,
				updatedCompetencies,
			};
		});

		if (outcome.kind === "not_found") {
			return NextResponse.json({ error: "Sesja nie istnieje" }, { status: 404 });
		}
		if (outcome.kind === "incomplete") {
			return NextResponse.json(
				{ error: "Diagnoza nie jest ukończona — odpowiedz na wszystkie pytania." },
				{ status: 422 },
			);
		}

		// 1E.7 (L3) — trwały nośnik odblokowania: zapis pełnego werdyktu placementu
		// dla modułów, które ta diagnoza OTWARŁA (diagnoza otwiera, egzamin zalicza).
		// GATING SZCZELNY: isFeatureEnabled JEST OSTATNIM, zwierającym warunkiem —
		// przy fladze OFF wyrażenie zwiera się PRZED wejściem w hook, więc ZERO
		// dodatkowych zapytań i odpowiedź trasy identyczna jak dziś (inwariant
		// flag-OFF). Bramka jest TU (miejsce wywołania), nie w hooku — wzorzec 1E.4 R5.
		// PO TRANSAKCJI: zapis idzie połączeniem właściciela i nie należy do
		// transakcji diagnozy — wciągnięcie go tam związałoby domknięcie diagnozy
		// z awarią dodatku.
		// BEST-EFFORT: .catch + logError — błąd placementu NIE propaguje do
		// odpowiedzi. Student ma dostać swój wynik diagnozy nawet gdy nośnik
		// odblokowania padnie; idempotencja hooka (ON CONFLICT DO NOTHING) czyni
		// ponowny zapłon przy retry bezpiecznym.
		// `diagnosisResult` do lokalnej stałej: zawężenie typu nie przeżyłoby
		// wewnątrz domknięcia `.catch` (parytet z hookiem enrollment 1E.4 R5).
		const diagnosisResult = outcome.sessionKind === "diagnostic" ? outcome.result : null;
		if (diagnosisResult && isFeatureEnabled("placementDiagnostic")) {
			await recordPlacementOnDiagnosisComplete(student, id, diagnosisResult).catch((err) =>
				logError("curriculum.placement", err, { studentId: student.id, sessionId: id }),
			);
		}

		return NextResponse.json({
			completed: true,
			result: outcome.result,
			updatedCompetencies: outcome.updatedCompetencies,
		});
	} catch (err) {
		if (err instanceof CompleteConflictError) {
			return NextResponse.json({ error: err.message }, { status: 409 });
		}
		logError("assessment.complete", err, { sessionId: id, userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zakończyć diagnozy." }, { status: 500 });
	}
}
