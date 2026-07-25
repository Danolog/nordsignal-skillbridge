// ============================================================================
// 1E.3 (ADR-014 D3) — POST /api/exam/[id]/complete: domknięcie egzaminu.
// Wzorzec: /api/assessment/[id]/complete (diagnoza A5).
//
//  - idempotencja: UPDATE ... WHERE status='in_progress' pod FOR UPDATE; drugi
//    complete → 409 (werdykt zapisany raz),
//  - werdykt: gradeExam (licznik błędów vs maxErrors z planu) → result_json
//    {passed, errorCount, failedConcepts, correctives},
//  - P4: po OBLANIU z wyczerpanym cap 2 (correctives=true) dokładamy do
//    result_json paczkę remediacji (buildCorrectivesPackage: koncept → ≤3
//    atomy) + mikrocopy. ZERO zapisu do curriculum_module_progress (integracja
//    z drabiną = P5). Ślad aktywności podejścia jest już wpięty przez
//    assessment_answers (patrz src/lib/rhythm/activity.ts) — bez zmian tutaj.
//
// Wynik wraca do klienta (passed + licznik + koncepty) — dopiero tu student
// poznaje werdykt (w trakcie egzaminu zero feedbacku).
//
// FLAGA OFF (masteryGate) → 404.
// ============================================================================

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
	type ExamPlan,
	type ExamResultJson,
	type ExamSessionAnswer,
	gradeExam,
} from "@/lib/assessment/exam";
import {
	buildCorrectivesPackage,
	getStudentByUserId,
	isExamSessionExpired,
} from "@/lib/assessment/exam-service";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { assessmentAnswers, assessmentSessions } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { enrollModuleConceptsOnMasteryPass } from "@/lib/review/enroll-hook";

class ExamCompleteConflictError extends Error {}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("masteryGate")) {
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
				throw new ExamCompleteConflictError("Egzamin nie jest aktywny.");
			}
			if (isExamSessionExpired(assessment.startedAt)) {
				await tx
					.update(assessmentSessions)
					.set({ status: "abandoned" })
					.where(eq(assessmentSessions.id, id));
				throw new ExamCompleteConflictError("Egzamin wygasł — rozpocznij od nowa.");
			}

			const plan = assessment.planJson as ExamPlan;
			const answers: ExamSessionAnswer[] = await tx
				.select({
					position: assessmentAnswers.position,
					isCorrect: assessmentAnswers.isCorrect,
				})
				.from(assessmentAnswers)
				.where(eq(assessmentAnswers.sessionId, id));

			const result = gradeExam(plan, answers);
			if (!result) {
				return { kind: "incomplete" as const };
			}
			// P4: po OBLANIU z wyczerpanym cap 2 (result.correctives) dokładamy paczkę
			// remediacji (koncept błędnego pytania → ≤3 atomy). Retry PRZED cap 2 i
			// egzamin zdany → correctives=false → paczki brak (tylko werdykt).
			const resultJson: ExamResultJson = result.correctives
				? {
						...result,
						correctivesPackage: await buildCorrectivesPackage(
							result.failedConcepts,
							result.errorCount,
							result.maxErrors,
						),
					}
				: result;
			await tx
				.update(assessmentSessions)
				.set({ status: "completed", resultJson, completedAt: new Date() })
				.where(and(eq(assessmentSessions.id, id), eq(assessmentSessions.status, "in_progress")));
			// moduleId wypchnięty do outcome (1E.4 R5): hook enrollment poza transakcją
			// potrzebuje adresu modułu. Dla 'module_exam' CHECK
			// assessment_sessions_module_exam_requires_module gwarantuje non-null.
			return { kind: "completed" as const, result: resultJson, moduleId: assessment.moduleId };
		});

		if (outcome.kind === "not_found") {
			return NextResponse.json({ error: "Sesja nie istnieje" }, { status: 404 });
		}
		if (outcome.kind === "incomplete") {
			return NextResponse.json(
				{ error: "Egzamin nieukończony — odpowiedz na wszystkie pytania." },
				{ status: 422 },
			);
		}

		// 1E.4 (R5) — zasiew konceptów kluczowych do powtórek przy ZDANYM mastery gate.
		// GATING SZCZELNY: isFeatureEnabled JEST OSTATNIM, zwierającym warunkiem — przy
		// fladze OFF wyrażenie zwiera się PRZED wejściem w hook, więc ZERO dodatkowych
		// zapytań i odpowiedź trasy jest identyczna jak dziś (inwariant flag-OFF, Quinn
		// dowodzi bajt-w-bajt). Bramka jest TU (miejsce wywołania), nie w hooku.
		// `outcome.moduleId` guard: dla 'module_exam' CHECK gwarantuje non-null; warunek
		// zawęża typ i broni przed teoretyczną sesją bez modułu (nie zasiewamy w próżnię).
		// BEST-EFFORT: .catch + logError — błąd zasiewu NIE propaguje do odpowiedzi;
		// enrollment (dodatek edukacyjny) nie może wywalić studentowi ZDANEGO egzaminu
		// (§7: mastery gate > powtórki). Idempotencja hooka czyni re-fire bezpiecznym.
		// `moduleId` do lokalnej stałej — narrowing property (outcome.moduleId: string|null)
		// nie przeżyłby wewnątrz domknięcia `.catch`; const utrwala typ `string`.
		const passedModuleId = outcome.result.passed ? outcome.moduleId : null;
		if (passedModuleId && isFeatureEnabled("spacedRepetition")) {
			await enrollModuleConceptsOnMasteryPass(student.id, passedModuleId).catch((err) =>
				logError("review.enroll", err, { studentId: student.id, moduleId: passedModuleId }),
			);
		}

		return NextResponse.json({ completed: true, result: outcome.result });
	} catch (err) {
		if (err instanceof ExamCompleteConflictError) {
			return NextResponse.json({ error: err.message }, { status: 409 });
		}
		logError("exam.complete", err, { sessionId: id, userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zakończyć egzaminu." }, { status: 500 });
	}
}
