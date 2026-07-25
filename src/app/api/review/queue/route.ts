// ============================================================================
// 1E.4 (SLICE R4) — GET /api/review/queue: kolejka konceptów „na dziś" do
// powtórki. Wzorzec: /api/exam/start (ADR-014 D3) — auth, 404 przy fladze OFF,
// strip klucza, obsługa błędów.
//
// Kolejka = stany studenta z terminem <= now (getDueQueue, R3), najpilniejsze
// pierwsze, przycięte TWARDYM capem serwera (K2). Dla każdego konceptu dokładamy
// JEDNO pytanie z banku (loadReviewQuestions, owner-side, HURTEM — zero N+1),
// zawsze BEZ klucza. Koncept bez pytania w banku jest pomijany defensywnie
// (kontrakt pojemności — nie pokazujemy pustej powtórki).
//
// ── DECYZJA K4: OWNER-SIDE + TWARDY K1 (parytet z exam) ─────────────────────
// Odczyt R4 idzie OWNER-SIDE (`db`, przez getDueQueue z R3 i loadReviewQuestions),
// NIE przez app_student/withTenantContext. Trzy powody, spójne z trasami egzaminu
// (które są w całości owner-side):
//   (a) question_items to tabela DENY (zero grantów app_student) — treść pytań
//       MUSI iść owner-side, roli runtime baza by odmówiła; ta sama tabela co bank
//       egzaminu (loadExamBank owner-side).
//   (b) getDueQueue (R3, scalony) jest zahardkodowany na `db` (owner) — przełączenie
//       na app_student wymagałoby przepisania serwisu z `main`, poza zakresem R4.
//   (c) parytet z exam-service/exam routes: izolacja najemcy jest egzekwowana
//       KODEM, nie bazą — JEDYNĄ granicą jest studentId rozwiązany z SESJI (K1),
//       NIGDY z query/payloadu. RLS 0042 zostaje warstwą obrony dla przyszłych
//       ścieżek runtime, nie dla tego odczytu.
// Konsekwencja: skoro owner omija RLS, to K1 (studentId z sesji) jest jedyną
// ścianą — dlatego test izolacji A↔B pilnuje TEJ granicy (bramka Quinn, W2).
//
// FLAGA OFF (spacedRepetition) → 404: trasa nie istnieje, dopóki flaga zgaszona.
// ============================================================================

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStudentByUserId } from "@/lib/assessment/exam-service";
import { auth } from "@/lib/auth/server";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";
import { loadReviewQuestions } from "@/lib/review/review-questions";
import { getDueQueue } from "@/lib/review/review-service";

// K2 — TWARDY cap rozmiaru kolejki po stronie serwera. Klient NIE dyktuje
// nieograniczonego `limit` (DoS / wyczerpanie pamięci) — zawsze min(żądanie, CAP).
// Zgodne z rzędem wielkości planu D3 (~10–20/dzień). To cap DoS trasy, ODRĘBNY od
// dobowego capu NOWYCH kart z enrollmentu (D3, decyzja Sophii w R6).
const REVIEW_QUEUE_CAP = 20;

/** Parsuje ?limit= do [1, CAP]; brak/śmieci → CAP (bezpieczny domyślny). */
function resolveLimit(url: string): number {
	const raw = new URL(url).searchParams.get("limit");
	if (raw === null) return REVIEW_QUEUE_CAP;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return REVIEW_QUEUE_CAP;
	return Math.min(parsed, REVIEW_QUEUE_CAP);
}

export async function GET(req: Request) {
	if (!isFeatureEnabled("spacedRepetition")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const student = await getStudentByUserId(session.user.id);
	if (!student) {
		return NextResponse.json({ error: "Najpierw uzupełnij profil studenta." }, { status: 404 });
	}

	try {
		// Limiter per user (odczyt lekki) PRZED zapytaniem do bazy.
		const rl = await applyRateLimit(rateLimiters.reviewQueue, `user:${session.user.id}`);
		if (!rl.success) return rateLimitResponse(rl.reset);

		const now = new Date();
		const limit = resolveLimit(req.url);

		// K1: studentId WYŁĄCZNIE z sesji (student.id), nigdy z query/payloadu.
		const due = await getDueQueue(student.id, now, limit);

		// Pytania HURTEM (jeden inArray) — zero N+1. Owner-side, klucz stripowany.
		const questions = await loadReviewQuestions(due.map((d) => d.conceptId));

		const queue = due
			.map((entry) => {
				const question = questions.get(entry.conceptId);
				if (!question) return null; // koncept bez pytania → pomijamy (pojemność)
				return {
					conceptId: entry.conceptId,
					state: entry.state,
					due: entry.due,
					reps: entry.reps,
					lapses: entry.lapses,
					question, // bez klucza (buildReviewQuestionPayload)
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);

		return NextResponse.json({ queue, cap: REVIEW_QUEUE_CAP });
	} catch (err) {
		logError("review.queue", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się wczytać kolejki powtórek." }, { status: 500 });
	}
}
