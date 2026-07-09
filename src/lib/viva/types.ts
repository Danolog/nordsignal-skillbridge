import { z } from "zod";

/**
 * B7/1.16a (ADR-013) — obrona ustna: typy i STAŁE (limity w kodzie, nie
 * w prompcie; parametry ratyfikowane sign-offem Darka 2026-07-09).
 */

/** Liczba pytań obrony (D2.1). */
export const VIVA_QUESTION_COUNT = 3;
/** Maks. punktów za odpowiedź (werdykt sędziego 0–2). */
export const VIVA_MAX_POINTS_PER_ANSWER = 2;
/** Próg zdania: ≥4/6 (3/6 = failed → człowiek, świadomie — ADR-013 D2.3). */
export const VIVA_PASS_THRESHOLD = 4;
/** TTL sesji od odsłonięcia pierwszego pytania; sesja wznawialna w oknie. */
export const VIVA_TTL_MINUTES = 60;
/** Cap długości odpowiedzi studenta. */
export const VIVA_ANSWER_MAX_LEN = 2000;

/** Stany sesji (CHECK w 0032). Jedno źródło prawdy = viva_sessions.status. */
export type VivaSessionStatus =
	| "pending"
	| "in_progress"
	| "passed"
	| "failed"
	| "inconclusive"
	| "expired"
	| "superseded";

/**
 * Pytanie zamrożonego planu. Walidowane schematem PRZED zapisem do sesji
 * (second-order injection: treść generuje model z niezaufanego repo,
 * a wyświetlamy ją studentowi).
 */
export const VivaQuestionSchema = z.object({
	position: z.number().int().min(0),
	question: z.string().min(10).max(600),
	/** Odwołanie do miejsca w pracy (plik/sekcja) — opcjonalne, czysty tekst. */
	filePath: z.string().max(300).optional(),
	/**
	 * Wycinek ocenianej treści, którego dotyczy pytanie — idzie do sędziego
	 * razem z odpowiedzią (niezaufany, w tagu untrusted).
	 */
	excerpt: z.string().max(1500).optional(),
});
export type VivaQuestion = z.infer<typeof VivaQuestionSchema>;

export const VivaPlanSchema = z.array(VivaQuestionSchema).length(VIVA_QUESTION_COUNT);

/** Werdykt sędziego per odpowiedź — zapis w viva_answers.verdictJson. */
export type VivaVerdict = {
	points: 0 | 1 | 2;
	justification: string;
};

/** Projekcja do aiReviewJson.viva (ADR-013 D3) — zapisywana w tx zmiany stanu. */
export type VivaProjection = {
	state: VivaSessionStatus;
	score?: number;
	questionCount: number;
	completedAt?: string;
};

/** resultJson sesji po zamknięciu (bez surowych odpowiedzi — retencja D3). */
export type VivaResult = {
	totalPoints: number;
	maxPoints: number;
	passThreshold: number;
	verdicts: Array<{ position: number; points: number; justification: string }>;
};
