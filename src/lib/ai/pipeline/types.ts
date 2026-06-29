/**
 * Wspólne typy potoku oceny zgłoszeń (Faza 1 — ocena oparta na treści).
 *
 * Design: docs/design/skillbridge-weryfikacja-pipeline-techniczny-v0.1.md (§1).
 * Każdy krok zwraca `StepResult<T>` z `{ ok, data, flags }`. Orkiestrator
 * (index.ts) zbiera flagi ze wszystkich kroków; krok 5 czyta zbiorczą listę,
 * by zdecydować status. Krok przy awarii zwraca pusty wynik + flagę, NIE
 * wywraca całego żądania (fail-closed — nigdy automatycznie `verified` przy
 * niepewności).
 */

import type { ReviewResult } from "@/lib/ai/review-submission";

/** Typ pracy (deliverable). Decyduje, co liczy się jako dowód i jak wygląda twarde sprawdzenie. */
export type DeliverableType = "code" | "document" | "detection_rule" | "sql" | "mixed";

export const DELIVERABLE_TYPES: readonly DeliverableType[] = [
	"code",
	"document",
	"detection_rule",
	"sql",
	"mixed",
] as const;

/**
 * Flaga diagnostyczna podnoszona przez krok. Krok 5 routuje na jej podstawie.
 * `code` to stabilny identyfikator (do logiki), `message` to opis PL dla człowieka.
 */
export type PipelineFlag = {
	code: PipelineFlagCode;
	message: string;
};

export type PipelineFlagCode =
	| "empty_or_unreadable" // krok 1: repo puste/niedostępne/brak plików
	| "content_truncated" // krok 1: pakiet obcięty do budżetu kontekstu
	| "hard_check_failed" // krok 2: walidacja struktury/składni nie przeszła
	| "semantic_parse_failed" // krok 3: model nie zwrócił poprawnego JSON
	| "missing_evidence" // krok 3: brak dowodu w kryteriach o dużej wadze
	| "high_cheat_risk" // krok 4: zagregowane ryzyko ≥ próg
	| "borderline_score"; // krok 5: wynik na pograniczu

/** Wynik pojedynczego kroku potoku. */
export type StepResult<T> = {
	ok: boolean;
	data: T;
	flags: PipelineFlag[];
};

/** Pojedynczy pobrany plik z repo studenta (krok 1). */
export type FetchedFile = {
	path: string;
	content: string;
	/** Liczba linii w treści po ewentualnym obcięciu (do nagłówka „L1–Ln"). */
	lineCount: number;
	/** Plik obcięty z powodu limitu rozmiaru pojedynczego pliku. */
	truncated: boolean;
};

/** Metadane wejścia przekazywane modelowi (<INPUT_META> w promptcie v0.2). */
export type InputMeta = {
	truncated: boolean;
	omittedFiles: string[];
};

/** Wynik kroku 1 — pobranie treści. */
export type FetchContentData = {
	/** Sklejony, ustrukturyzowany dokument-pakiet (nagłówki ścieżek + treść). */
	artifact: string;
	/** Treść README.md (osobno — kontrakt wejścia §I.3). "" gdy brak. */
	readme: string;
	/** Pliki faktycznie pobrane treściowo. */
	files: FetchedFile[];
	/** Ścieżki plików pominiętych (limit rozmiaru/liczby/filtr binariów). */
	omittedFiles: string[];
	inputMeta: InputMeta;
	/** Domyślna gałąź repo (do kroku 4 — historia commitów). null gdy nieznana. */
	defaultBranch: string | null;
};

/** Wynik kroku 2 — twarde sprawdzenia (deterministyczne, bez AI, bez uruchamiania). */
export type HardTestResults = {
	deliverableType: DeliverableType;
	/** README ma strukturę Cel · Uruchomienie · Wnioski? null = nie dotyczy typu. */
	readmeStructureOk: boolean | null;
	/** Składnia plików kodu/SQL/reguł poprawna (analiza statyczna)? null = nie dotyczy. */
	syntaxOk: boolean | null;
	/** Wskazany plik wejściowy / deliverable obecny? null = nie dotyczy. */
	inputFilePresent: boolean | null;
	/** Faza 1: zawsze null (NIE uruchamiamy kodu — piaskownica to Faza 2). */
	runOk: boolean | null;
	messages: string[];
};

/** Ocena pojedynczego kryterium zwrócona przez model (krok 3, prompt v0.2). */
export type CriterionEvaluation = {
	criterionId: string;
	status: "met" | "partially_met" | "not_met" | "not_assessable";
	score: number; // 0..max_points danego kryterium
	evidenceFound: boolean;
	evidence: string;
	filePath: string;
	justification: string; // PL
};

/** Sygnały AI ze spójności stylu / martwego kodu (krok 3, część cheat-risk). */
export type AiCheatSignals = {
	styleInconsistency: { flag: boolean; evidence: string };
	deadCode: { flag: boolean; evidence: string };
	readmeMismatch: { flag: boolean; evidence: string };
	notes: string; // PL
};

/** Surowy wynik kroku 3 (ocena semantyczna + feedback + sygnały AI). */
export type SemanticData = {
	evaluations: CriterionEvaluation[];
	cheatSignals: AiCheatSignals;
	integrityFlags: string; // PL
	studentFeedback: string; // PL — Etap 1, dla studenta
	evaluatorSummary: string; // PL — Etap 2, dla człowieka oceniającego (premium)
};

/** Pełny obiekt sygnałów cheat-risk zapisywany w aiReviewJson (§5.3). */
export type CheatSignals = {
	// automatyka (GitHub API — krok 4)
	commitCount: number | null;
	authorCount: number | null;
	timespanMinutes: number | null;
	singleCommit: boolean | null;
	bulkInitialCommit: boolean | null;
	shortTimespan: boolean | null;
	// AI (krok 3)
	styleInconsistency: boolean;
	deadCodeRatio: boolean;
	readmeMismatch: boolean;
	notes: string;
	// deterministycznie liczone w kodzie (krok 4)
	aggregatedRisk: number; // 0.0–1.0
};

/** Rekomendacja dla człowieka-nie-eksperta (Etap 2, §6.1). */
export type Recommendation = {
	verdict: "approve" | "reject" | "borderline";
	rationale: string; // PL, język laika
	evidenceRefs: string[];
};

/** Metadane treści zapisywane w aiReviewJson (krok 1). */
export type ContentMeta = {
	filesFetched: string[];
	filesSkipped: string[];
	truncated: boolean;
};

/**
 * Pełny dokument aiReviewJson po redesignie (§4.4/§5.3/§6.1).
 * `review` zachowuje kształt ReviewResult (wsteczna zgodność L1–L3).
 * Pozostałe pola to rodzeństwo `review` — dokumenty do wyświetlenia, nie pola SQL.
 */
export type PipelineReviewJson = {
	review: ReviewResult;
	studentFeedback?: SemanticData["studentFeedback"];
	evaluatorSummary?: SemanticData["evaluatorSummary"];
	integrityFlags?: string;
	recommendation?: Recommendation;
	cheatSignals?: CheatSignals;
	hardChecks?: HardTestResults;
	contentMeta?: ContentMeta;
};

/** Znormalizowane kryterium rubryki podawane modelowi (<RUBRIC>). */
export type NormalizedRubricItem = {
	id: string;
	description: string;
	/** Maks. punkty = waga z rubricJson (sumują się do ~100). */
	maxPoints: number;
};

/** Wynik całego potoku zwracany route'owi. */
export type PipelineResult = {
	/** Finalny wynik 0–100 (deterministyczny, liczony w kodzie z wyniku×waga). */
	score: number;
	status: "verified" | "submitted" | "rejected";
	needsHumanReview: boolean;
	aiReviewJson: PipelineReviewJson;
	flags: PipelineFlag[];
};
