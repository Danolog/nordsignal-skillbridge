import {
	VIVA_MAX_POINTS_PER_ANSWER,
	VIVA_PASS_THRESHOLD,
	VIVA_QUESTION_COUNT,
	VIVA_TTL_MINUTES,
	type VivaProjection,
	type VivaResult,
	type VivaSessionStatus,
	type VivaVerdict,
} from "@/lib/viva/types";

/**
 * B7/1.16a (ADR-013) — deterministyczna logika sesji obrony (bez LLM, bez DB):
 * expiry liczone leniwie (wzorzec isSessionExpired z 1.11), rozstrzygnięcie
 * progu W KODZIE. Trasy używają tych czystych funkcji — testowalne unitowo.
 */

/** TTL liczy się od odsłonięcia pierwszego pytania (startedAt). */
export function isVivaSessionExpired(startedAt: Date | null, now: Date = new Date()): boolean {
	if (!startedAt) return false; // pending — zegar jeszcze nie ruszył
	return now.getTime() - startedAt.getTime() > VIVA_TTL_MINUTES * 60_000;
}

/**
 * Rozstrzygnięcie po komplecie werdyktów: ≥4/6 = passed, inaczej failed
 * (3/6 świadomie failed→człowiek — ADR-013 D2.3). Niekompletny zestaw to
 * błąd programisty (trasy wołają dopiero po ostatniej odpowiedzi).
 */
export function resolveVivaOutcome(verdicts: VivaVerdict[]): {
	status: Extract<VivaSessionStatus, "passed" | "failed">;
	result: VivaResult;
} {
	if (verdicts.length !== VIVA_QUESTION_COUNT) {
		throw new Error(`resolveVivaOutcome: oczekiwano ${VIVA_QUESTION_COUNT} werdyktów`);
	}
	const totalPoints = verdicts.reduce((sum, v) => sum + v.points, 0);
	return {
		status: totalPoints >= VIVA_PASS_THRESHOLD ? "passed" : "failed",
		result: {
			totalPoints,
			maxPoints: VIVA_QUESTION_COUNT * VIVA_MAX_POINTS_PER_ANSWER,
			passThreshold: VIVA_PASS_THRESHOLD,
			verdicts: verdicts.map((v, i) => ({
				position: i,
				points: v.points,
				justification: v.justification,
			})),
		},
	};
}

/** Projekcja do aiReviewJson.viva — zapisywana w TEJ SAMEJ tx co status sesji. */
export function vivaProjection(
	state: VivaSessionStatus,
	opts?: { score?: number; completedAt?: Date },
): VivaProjection {
	return {
		state,
		questionCount: VIVA_QUESTION_COUNT,
		...(opts?.score !== undefined ? { score: opts.score } : {}),
		...(opts?.completedAt ? { completedAt: opts.completedAt.toISOString() } : {}),
	};
}
