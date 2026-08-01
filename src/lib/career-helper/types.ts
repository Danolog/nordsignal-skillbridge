/**
 * B0 — Pomocnik Wyboru Kariery. Typy + treść ankiety (front).
 *
 * Treść pytań i opcji jest 1:1 z briefem Sophii v0.1 (sekcja 2) i spec B0 §3.3.
 * Microcopy HITL jest 1:1 z spec §7. Disclaimer + komunikat kryzysowy żyją w
 * kodzie komponentu (DisclaimerBanner / paused_crisis), NIE z LLM/API.
 *
 * Kontrakt API: zamrożony przez Ethana (`docs/briefings/2026-05-31-ethan-
 * ratyfikacja-streaming-kontrakt-b0.md`) + realny backend (PR #49).
 */

// --- Ankieta (ekran 1, spec §3.3 + brief Sophii §2) -------------------------

export type SurveyQuestionType = "single-choice" | "multi-choice" | "textarea";

export type SurveyQuestionDef = {
	id: "q1" | "q2" | "q3" | "q4";
	number: 1 | 2 | 3 | 4;
	question: string;
	type: SurveyQuestionType;
	options?: string[];
	maxSelections?: number;
	placeholder?: string;
	minLength?: number;
	maxLength?: number;
};

/** Treść 1:1 z briefem Sophii v0.1 §2 (opcje) + spec B0 §3.3 (typy, walidacja). */
export const SURVEY_QUESTIONS: readonly SurveyQuestionDef[] = [
	{
		id: "q1",
		number: 1,
		question: "Co jest dla Ciebie najważniejsze po studiach?",
		type: "single-choice",
		options: [
			"Praca w branży zgodnej ze studiami",
			"Praca w branży, ale niekoniecznie zgodnej ze studiami",
			"Własna działalność / freelance",
			"Dalsza nauka (magisterskie / drugi kierunek / specjalizacja)",
			"Jeszcze się nie zdecydowałem/am",
		],
	},
	{
		id: "q2",
		number: 2,
		question: "Jak najchętniej pracujesz?",
		type: "single-choice",
		options: [
			"Sam/a — moje tempo, moja decyzja",
			"W zespole — energia od innych ludzi",
			"Hybrydowo — czasem sam/a, czasem z zespołem",
			"Nie wiem, nie miałem/am okazji sprawdzić",
		],
	},
	{
		id: "q3",
		number: 3,
		question: "Co Cię w pracy nakręca? (zaznacz max 3)",
		type: "multi-choice",
		maxSelections: 3,
		options: [
			"Rozwiązywanie konkretnych problemów",
			"Tworzenie czegoś nowego od zera",
			"Pomaganie ludziom",
			"Analizowanie danych / liczb",
			"Organizowanie i planowanie",
			"Komunikacja, prezentacja, sprzedaż",
			"Praca z technologią",
			"Praca z kontekstem międzynarodowym",
		],
	},
	{
		id: "q4",
		number: 4,
		question: "Powiedz w 2–3 zdaniach, czego się spodziewasz, że Pomocnik Ci dziś pomoże.",
		type: "textarea",
		minLength: 10,
		maxLength: 280,
		placeholder:
			"Np. „Spodziewam się, że pomożesz mi nazwać, co mnie naprawdę interesuje. Studiuję informatykę, ale czuję się rozdarty między dev a analityką.”",
	},
] as const;

export type SurveyAnswers = {
	q1: string;
	q2: string;
	q3: string[];
	q4: string;
};

export const EMPTY_SURVEY_ANSWERS: SurveyAnswers = { q1: "", q2: "", q3: [], q4: "" };

/** Pojedyncza odpowiedź ankiety jako wartość kontrolki. */
export type SurveyAnswerValue = string | string[];

// --- Kontrakt API (zamrożony, Ethan §3–5 + backend PR #49) ------------------

/** GET /api/career-helper/session/[id] — rehydracja chatu (spec §4.4). */
export type SessionStatus = "in_progress" | "completed" | "interrupted" | "restarted";

export type SessionStateResponse = {
	messages: { role: "ai" | "user"; content: string }[];
	turn: number;
	status: SessionStatus;
};

/** POST /api/career-helper/survey — start sesji. */
export type SurveyResponse = { sessionId: string; redirectTo: string };

/**
 * POST /api/career-helper/session/[id]/summary — podsumowanie (blokująco).
 * Realny backend (PR #49): summaryText jest null gdy judged=false. BEZ
 * probability/% w careerPaths (guardrail HITL po stronie typu).
 */
export type CareerPathResult = { label: string; why: string };

export type SummaryResponse =
	| {
			judged: true;
			judgedFor: "R2";
			summaryText: string;
			careerPaths: CareerPathResult[];
	  }
	| {
			judged: false;
			judgedFor: "warstwa4_failed";
			summaryText: string | null;
			careerPaths: CareerPathResult[];
	  };

/** POST /api/career-helper/session/[id]/select-path. */
export type SelectPathResponse = { studentCareerPathId: string; isPrimary: boolean };

/** POST /api/career-helper/session/[id]/restart. */
export type RestartResponse = { sessionId: string; redirectTo: string };

/** Twardy limit tur — w kodzie (golden ADR-001 §3.1), spójny z backendem. */
export const MAX_TURNS = 9;

// --- A4: łączny (end-to-end) limit czasu na „Pokaż podsumowanie" -------------
//
// Limit liczony OD STRONY STUDENTA: obejmuje wszystkie próby POST /summary razem
// z odczekaniami między nimi — nie jest limitem pojedynczej próby. Bez niego
// klient robił 3 próby bez żadnego górnego ograniczenia: 60 s (twardy limit
// funkcji na Vercelu) + 1,5 s + 60 s + 3 s + 60 s = 184,5 s kręciołka, po czym
// dopiero pokazywał uczciwy degrade.
//
// WARTOŚĆ 90 s wynika z trzech zmierzonych liczb, nie z sufitu:
//   1. serwer po zmianie A4 oddaje odpowiedź najpóźniej po ~50 s
//      (SUMMARY_TOTAL_BUDGET_MS) — tyle może trwać pierwsza próba,
//   2. odczekanie przed drugą próbą: 1,5 s,
//   3. udane podsumowanie trwa typowo 20–40 s (Opus 4.8: generator + sędzia;
//      analogi z ai_usage_ledger na produkcji: generacja 18,4–23,5 s, sędzia
//      2,9–3,4 s) — druga próba dostaje ~38 s, czyli mieści cały ten zakres.
// 50 + 1,5 + 38,5 = 90 s. Nie ucinamy więc żadnego przebiegu, który miał realną
// szansę się udać, a najgorszy przypadek u studenta spada z 185 s do 90 s.
export const SUMMARY_CLIENT_BUDGET_MS = 90_000;

/**
 * Próg, poniżej którego NIE zaczynamy kolejnej próby — nie zdąży się domknąć,
 * a student i tak czeka. Oparty na dolnej granicy udanego przebiegu (generacja
 * 18,4 s + sędzia 2,9 s ≈ 21 s; ai_usage_ledger, produkcja).
 */
export const SUMMARY_MIN_ATTEMPT_MS = 20_000;
