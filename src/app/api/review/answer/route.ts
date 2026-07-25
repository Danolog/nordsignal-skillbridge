// ============================================================================
// 1E.4 (SLICE R4) — POST /api/review/answer: ocena odpowiedzi na powtórkę
// konceptu. Wzorzec: /api/exam/[id]/answer (ADR-014 D3) — auth, 404 przy fladze
// OFF, strip klucza, mapowanie błędów bazy, rate-limit.
//
// Serwer liczy poprawność sam (grade.ts, 0 LLM — klucz z banku owner-side, nigdy
// nie opuszcza serwera), NIE ufa deklaracji klienta. Stan FSRS przelicza i utrwala
// recordReview (R3, transakcja UPDATE stanu + INSERT logu). Odpowiedź niesie
// werdykt (ocena FORMUJĄCA §7 — maszyna samowystarczalna) + termin następnej
// powtórki, NIGDY klucza.
//
// ── Bramki (wzorzec answer route) ──────────────────────────────────────────
// flaga off → 404, brak sesji → 401, złe body → 400, brak studenta → 404,
// limit → 429, pytanie spoza konceptu / retired / nieistniejące → 404 (K3),
// koncept spoza harmonogramu studenta → 409, FK-violation (23503) → 404 (K3).
//
// ── K1 / K4 (jak w queue) ──────────────────────────────────────────────────
// studentId WYŁĄCZNIE z sesji (getStudentByUserId), nigdy z body. Zapis owner-side
// (recordReview, R3 — review_states/review_logs to tabele bez grantu zapisu dla
// app_student, więc zapis MUSI iść owner-side). Granicą najemcy jest studentId z
// sesji — test izolacji tego pilnuje (bramka Quinn).
//
// ── hintDepth SERWEROWO (#217) ─────────────────────────────────────────────
// Przepływ powtórki w MVP v0.1 NIE ma drabinki podpowiedzi (hinty żyją w osobnej
// pętli curriculum `/api/curriculum/items/[id]/hint`, ADR-018 — nie w powtórce).
// Dlatego hintDepth = 0 na stałe, WYPROWADZONE serwerowo — NIGDY z payloadu klienta
// (payload nawet nie ma tego pola; `.strict()` odrzuci próbę wstrzyknięcia).
// mapAnswerToRating (scheduler R2) obsługuje 0 poprawnie. Gdy R5+ wprowadzi hinty
// do powtórki, głębokość policzy serwer analogicznie do trasy hint, nie klient.
// ============================================================================

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentByUserId } from "@/lib/assessment/exam-service";
import { gradeAnswer } from "@/lib/assessment/grade";
import { auth } from "@/lib/auth/server";
import { isForeignKeyViolation } from "@/lib/db/pg-error";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";
import { loadGradableQuestion } from "@/lib/review/review-questions";
import { ConceptNotScheduledError, recordReview } from "@/lib/review/review-service";

// `.strict()`: DOKŁADNIE te pola — jakiekolwiek nadmiarowe (w tym próba podania
// `hintDepth`/`isCorrect` przez klienta) → 400. confidence: 1..3 lub NULL (sonda
// pewności MIS.1 bywa OFF). answerIndex: 0-based, sufit jak `selected` egzaminu.
const AnswerSchema = z
	.object({
		conceptId: z.string().uuid(),
		questionItemId: z.string().uuid(),
		answerIndex: z.number().int().min(0).max(50),
		confidence: z.number().int().min(1).max(3).nullable().optional(),
	})
	.strict();

export async function POST(req: Request) {
	if (!isFeatureEnabled("spacedRepetition")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	let body: z.infer<typeof AnswerSchema>;
	try {
		const parsed = AnswerSchema.safeParse(await req.json());
		if (!parsed.success) {
			return NextResponse.json(
				{
					error:
						'Wymagane body: {"conceptId": uuid, "questionItemId": uuid, "answerIndex": int, "confidence"?: 1|2|3|null}',
				},
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
		// Dwa wymiary limitera (burst + wolumen dobowy) PRZED gradingiem/zapisem.
		const burst = await applyRateLimit(rateLimiters.reviewAnswer, `user:${session.user.id}`);
		if (!burst.success) return rateLimitResponse(burst.reset);
		const daily = await applyRateLimit(rateLimiters.reviewDaily, `user:${session.user.id}`);
		if (!daily.success) return rateLimitResponse(daily.reset);

		// K3: walidacja server-side — pytanie musi ISTNIEĆ, być active i należeć do
		// podanego konceptu. Owner-side (klucz z banku). Niepasujące → 404 (nie 500).
		const question = await loadGradableQuestion(body.questionItemId, body.conceptId);
		if (!question) {
			return NextResponse.json(
				{ error: "Pytanie nie należy do tego konceptu lub nie istnieje." },
				{ status: 404 },
			);
		}
		// MVP v0.1 powtarza wyłącznie single_choice (kolejka pokazuje tylko takie).
		// Item innego typu przypięty do konceptu → nie jest powtórką → 409.
		if (question.type !== "single_choice") {
			return NextResponse.json(
				{ error: "To pytanie nie nadaje się do powtórki." },
				{ status: 409 },
			);
		}

		// Serwer LICZY poprawność (nie ufa klientowi): klucz `answerKey` z banku
		// owner-side, odpowiedź studenta = {selected: answerIndex}. Fail-closed
		// (zły kształt → false, nie wyjątek — grade.ts).
		const isCorrect = gradeAnswer(question.type, question.answerKey, {
			selected: body.answerIndex,
		});

		const confidence = body.confidence ?? null;
		// hintDepth wyprowadzony SERWEROWO (patrz nagłówek) — 0 w MVP powtórki.
		const hintDepth = 0;

		const result = await recordReview(
			student.id,
			body.conceptId,
			{ questionItemId: body.questionItemId, isCorrect, confidence, hintDepth },
			new Date(),
		);

		// Copy NEUTRALNY (plan §3): „wróci wcześniej", nie „oblałeś". explanationMd =
		// wyjaśnienie edukacyjne (ocena formująca §7), NIGDY klucz.
		const feedback = {
			message: isCorrect
				? "Dobrze — ten koncept wróci w większym odstępie."
				: "Ten koncept wróci wcześniej do powtórki.",
			explanation: question.explanationMd,
		};

		return NextResponse.json({
			isCorrect: result.isCorrect,
			nextDue: result.nextDue,
			feedback,
		});
	} catch (err) {
		// Koncept spoza harmonogramu studenta → 409 (recordReview nie tworzy stanu w
		// locie; to nie błąd serwera, tylko stan nie do oceny).
		if (err instanceof ConceptNotScheduledError) {
			return NextResponse.json(
				{ error: "Ten koncept nie jest w Twojej kolejce powtórek." },
				{ status: 409 },
			);
		}
		// FK-violation (23503) — np. wyścig z kasowaniem konceptu/pytania → 404 (K3),
		// czytelny błąd klienta, nie surowe 500 z detalem bazy.
		if (isForeignKeyViolation(err)) {
			return NextResponse.json({ error: "Zasób powtórki nie istnieje." }, { status: 404 });
		}
		logError("review.answer", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać powtórki." }, { status: 500 });
	}
}
