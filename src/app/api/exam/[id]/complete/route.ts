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
//    atomy) + mikrocopy. Ślad aktywności podejścia jest już wpięty przez
//    assessment_answers (patrz src/lib/rhythm/activity.ts) — bez zmian tutaj.
//  - 1E.7 · L0: ZDANY egzamin zostawia ślad w drabinie — upsert
//    curriculum_module_progress (status='completed', verified_by_method)
//    W TEJ SAMEJ transakcji co werdykt. Wcześniej trasa pisała wyłącznie do
//    assessment_sessions, a P5 (exam-gate.ts) okazało się w całości read-only:
//    student zdawał egzamin, a moduł zostawał niezaliczony i następny
//    zablokowany. Kaskada completeItem tego nie łata — pozycji kind='exam' nie
//    da się ukończyć żadną trasą, więc w module z egzaminem nigdy nie domyka.
//  - 1E.7 · L5: dowód rozróżnia DROGĘ zaliczenia — 'exam' (student przeszedł
//    pozycje modułu i zdał) vs 'test_out' (zdał BEZ ani jednej zaliczonej
//    pozycji). Rozstrzygane w chwili zapisu, z tej samej transakcji; bramka
//    (exam-gate.ts) traktuje obie wartości równorzędnie — zmienia się dowód,
//    nie zachowanie.
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
import { getCompletedItemCounts } from "@/lib/curriculum/ladder";
import { db } from "@/lib/db";
import { assessmentAnswers, assessmentSessions, curriculumModuleProgress } from "@/lib/db/schema";
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

			// 1E.7 · L0 — ŚLAD W DRABINIE. Zdany egzamin ⇒ moduł zaliczony metodą
			// 'exam' (E4 bramki, odblokowanie następnego modułu przez ladder.ts).
			// W TRANSAKCJI, nie po niej: ślad drabiny nie jest dodatkiem edukacyjnym
			// jak hak FSRS niżej (best-effort). Werdykt bez śladu = stan „zdane, ale
			// niezaliczone" — dokładnie naprawiany defekt. Gdy upsert padnie, cały
			// complete się cofa: student dostaje 500 i może powtórzyć complete
			// (sesja zostaje in_progress, więc powtórka jest legalna).
			// OWNER-SIDE: `db` to połączenie właściciela (src/lib/db/index.ts) —
			// wymagane, bo curriculum_module_progress ma FORCE RLS, a app_student ma
			// wyłącznie SELECT. Wzorzec zapisu jak completeItem (completion.ts).
			// tenant_id z `student.tenantId` (jedno źródło, nie z sesji egzaminu).
			//
			// 1E.7 · L5 — DOWÓD ROZRÓŻNIA 'exam' OD 'test_out'. Decyzja produktowa
			// (docs/product/decyzje-1e7-placement-v0.1.md, rama „diagnoza OTWIERA,
			// egzamin ZALICZA", sign-off Darka 2026-07-26): zaliczenie modułu BEZ
			// przechodzenia go to 'test_out', przejście modułu + zdany egzamin to 'exam'.
			// Kryterium = liczba ZALICZONYCH pozycji modułu w chwili zapisu (zero ⇒
			// test-out) — dokładnie ten sam pod-stan, który bramka nazywa `test_out`
			// (exam-gate.ts: moduł available, zero pozycji). Liczy `getCompletedItemCounts`,
			// czyli ta sama funkcja, która karmi pasek postępu drabiny — bo na DZISIEJSZYCH
			// danych obie liczby wychodzą identycznie (`skipped_by_placement` nie ma ani
			// jednego pisarza w kodzie produkcyjnym).
			// ⚠ TO JEST STAN PRZEJŚCIOWY, NIE KONTRAKT. Sophia v0.6 §7 pkt 3 rozstrzyga
			// wiążąco: pozycja pominięta przez diagnozę NIE liczy się jako przerobiona,
			// gdy rozstrzygamy JAKIM DOWODEM student zaliczył moduł — inaczej dowód
			// `test_out` skasowałby samego siebie (ten status powstaje WYŁĄCZNIE na
			// pozycjach modułu zaliczonego test-outem). Rozdzielenie na dwie jawnie
			// nazwane funkcje wchodzi, gdy cokolwiek zacznie ten status zapisywać —
			// patrz komentarz przy `getCompletedItemCounts` w ladder.ts.
			// W CHWILI ZAPISU I W TEJ SAMEJ TRANSAKCJI, nie wstecz: po fakcie tego się
			// nie odtworzy (liczby pozycji nie zapisujemy nigdzie), a odczyt spoza
			// transakcji mógłby zobaczyć pozycję ukończoną RÓWNOLEGLE między werdyktem
			// a zapisem dowodu i zamienić 'test_out' w 'exam'.
			// ⚠ ZACHOWANIE BRAMKI SIĘ NIE ZMIENIA: exam-gate.ts:70 traktuje obie
			// wartości równorzędnie (E4 verified) — zmienia się WYŁĄCZNIE zapisany dowód.
			// ⚠ DŁUG OKNA L0→L5 (2026-07-26 → dziś) NIE JEST SPŁACALNY WSTECZ: wiersze
			// zapisane w tym oknie mają 'exam' także dla ścieżki test-out i po fakcie
			// NIE dają się odróżnić. Na prodzie okno jest puste (zero sesji egzaminu
			// modułowego), więc spłata jest czysta — backfillu nie ma i nie będzie.
			// onConflictDoUpdate obowiązkowy: ponowne zdanie po restarcie cyklu
			// trafiłoby w uq_curriculum_module_progress_student_module (23505).
			// `set` celowo WĄSKI (jak completion.ts:72) — nie dotykamy pól, których
			// nie ustawiamy świadomie.
			// NIEZMIENNIK KOLEJNOŚCI BLOKAD (adresat: autor L1 i dalszych plasterków):
			// żadna transakcja nie bierze blokady na assessment_sessions PO
			// curriculum_module_progress. Ta trasa trzyma FOR UPDATE na
			// assessment_sessions i dokłada pod ten sam lock wiersz drabiny.
			// Dziś pisarze drabiny to: ta trasa + kaskada completeItem (completion.ts,
			// wołana z /api/curriculum/items/[id]/{answer,complete}) — żaden z pozostałych
			// nie dotyka assessment_sessions, więc cyklu blokad (deadlock) nie ma; zostaje
			// krótka rywalizacja o ten sam wiersz (student, moduł).
			// Pierwszy realny kandydat do złamania niezmiennika: L1 placementu — czyta
			// sesję diagnozy i zapisze własny nośnik odblokowania. Kolejność ma zostać ta sama.
			// L5 dokłada tu WYŁĄCZNIE ODCZYT (liczba zaliczonych pozycji) — zero nowych
			// blokad, więc kolejność blokad jest nienaruszona.
			if (resultJson.passed && assessment.moduleId) {
				const completedItems =
					(await getCompletedItemCounts(student.id, [assessment.moduleId], tx)).get(
						assessment.moduleId,
					) ?? 0;
				// L5: zero zaliczonych pozycji ⇒ student zdał egzamin BEZ przechodzenia
				// modułu (test-out). Wystarczy jedna zaliczona pozycja, żeby dowodem był
				// 'exam' — „przeszedł moduł" celowo nie znaczy „komplet pozycji": komplet
				// bez zdanego egzaminu i tak nie zalicza modułu (bramka E3), a stopniowanie
				// „ile procent modułu" nie jest tu żadną decyzją produktową.
				const verifiedByMethod = completedItems === 0 ? "test_out" : "exam";
				await tx
					.insert(curriculumModuleProgress)
					.values({
						studentId: student.id,
						tenantId: student.tenantId,
						moduleId: assessment.moduleId,
						status: "completed",
						verifiedByMethod,
						completedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: [curriculumModuleProgress.studentId, curriculumModuleProgress.moduleId],
						set: {
							status: "completed",
							verifiedByMethod,
							completedAt: new Date(),
							updatedAt: new Date(),
						},
					});
			}
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
