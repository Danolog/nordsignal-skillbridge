// ============================================================================
// A5/1.11 — typy silnika testu adaptacyjnego (diagnoza zamiast samooceny).
// Spec: docs/design/skillbridge-a5-bank-pytan-diagnoza-spec-v0.2.md
// (ZATWIERDZONE Darek 2026-07-08).
//
// Silnik to CZYSTE funkcje (0 LLM, 0 kosztu): grade.ts (ocena odpowiedzi),
// staircase.ts (adaptacja trudności + poziom z trajektorii), plan.ts
// (deterministyczny plan sesji). Trasy API w src/app/api/assessment/*.
// ============================================================================

/** Typ pytania — lustro CHECK-a question_items_type_values (schema.ts). */
export type QuestionType = "single_choice" | "multi_choice" | "numeric" | "short_text";

/** Trudność itemu (1–3); wynik diagnozy jest na skali poziomów 1–4 (jak samoocena B4). */
export type Difficulty = 1 | 2 | 3;

/** Poziom kompetencji — ta sama skala co selfAssessment (levelToStatus B4). */
export type CompetencyLevel = 1 | 2 | 3 | 4;

/**
 * Klucz odpowiedzi (question_items.answer_json) per typ — spec §2.3.
 * NIGDY nie opuszcza serwera (tabela DENY, trasy nie zwracają answer_json).
 */
export type AnswerKey =
	| { correct: number } // single_choice: indeks poprawnej opcji (od 0)
	| { correct: number[] } // multi_choice: zbiór indeksów (równość zbiorów, bez punktów częściowych)
	| { value: number; tolerance: number; relative?: boolean } // numeric
	| { accepted: string[] }; // short_text: lista akceptowanych po normalizacji

/**
 * Odpowiedź studenta (assessment_answers.answer_json) per typ.
 * numeric przyjmuje string — normalizacja polskiego zapisu („3,14", spacje
 * tysięcy) dzieje się w grade.ts, nie na kliencie.
 */
export type StudentAnswer =
	| { selected: number } // single_choice
	| { selected: number[] } // multi_choice
	| { value: string }; // numeric / short_text

/** Item banku w kształcie potrzebnym silnikowi (podzbiór wiersza question_items). */
export interface BankItem {
	id: string;
	conceptId: string;
	conceptSlug: string;
	competencyName: string;
	difficulty: Difficulty;
}

/**
 * Plan pozycji jednej kompetencji: staircase wymaga zamrożenia OBU rozgałęzień
 * (d2 → d3 albo d1), więc plan niesie 3 item-idy, z których zadane będą 2.
 * WYŁĄCZNIE identyfikatory — nigdy treść itemu ani klucz (spec §2.2: student
 * ma SELECT na swój wiersz sesji, treść w planie = wyciek).
 */
export interface PlanCompetency {
	competencyName: string;
	conceptSlug: string;
	items: { d1: string; d2: string; d3: string };
}

/** Zamrożony plan sesji (assessment_sessions.plan_json). */
export interface AssessmentPlan {
	schemaVersion: 1;
	kind: "diagnostic";
	/** Kolejność zadawania = kolejność listy (posortowana przy budowie — determinizm). */
	competencies: PlanCompetency[];
	/** Kompetencje bez pokrycia w banku — jawna degradacja, NIE cichy fallback. */
	uncovered: string[];
}

/** Jedna oceniona odpowiedź w trajektorii kompetencji. */
export interface TrajectoryStep {
	difficulty: Difficulty;
	correct: boolean;
}

/** Następny krok silnika dla jednej kompetencji. */
export type NextStep = { done: false; difficulty: Difficulty } | { done: true };

/** Oczekiwane następne pytanie sesji (walidacja server-side przy answer). */
export interface ExpectedQuestion {
	competencyName: string;
	conceptSlug: string;
	itemId: string;
	difficulty: Difficulty;
	/** Pozycja 0-based w sekwencji odpowiedzi sesji (assessment_answers.position). */
	position: number;
}

/**
 * Koperta wyniku (assessment_sessions.result_json) — spec §3 [REV]:
 * koncepty = źródło prawdy (placement 1E.7 mapuje moduły na koncepty),
 * kompetencje = rollup dla 1.12 (zapis do competencies przez levelToStatus).
 */
export interface AssessmentResult {
	schemaVersion: 1;
	kind: "diagnostic";
	concepts: Record<string, { asked: number; correct: number; level: CompetencyLevel }>;
	competencies: Record<string, CompetencyLevel>;
	uncovered: string[];
}
