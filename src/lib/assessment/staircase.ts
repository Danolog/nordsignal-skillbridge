// ============================================================================
// A5/1.11 — deterministyczny staircase (spec §2.4, ZATWIERDZONE).
//
// Wyszukiwanie binarne po 3 trudnościach = dokładnie 2 pytania per
// kompetencja; wynik na skali poziomów 1–4 identycznej z samooceną B4
// (levelToStatus: 1→missing, 2→in_progress, 3/4→acquired):
//
//   start: pytanie trudność 2
//     ✓ → pytanie trudność 3:  ✓ → poziom 4   ✗ → poziom 3
//     ✗ → pytanie trudność 1:  ✓ → poziom 2   ✗ → poziom 1
//
// Tabela wyników jest SKOŃCZONA (4 trajektorie) — golden test wyczerpujący
// w __tests__/staircase.test.ts. Zmiana tej tabeli = zmiana kontraktu
// diagnozy (decyzja Darka), nie refaktor.
// ============================================================================

import type { CompetencyLevel, Difficulty, NextStep, TrajectoryStep } from "./types";

/**
 * nextStep — jaka trudność ma być zadana jako następna dla jednej kompetencji.
 * Trajektoria dłuższa niż 2 kroki lub o nieoczekiwanym kształcie → done
 * (fail-closed: silnik nie zada pytania poza tabelą §2.4).
 */
export function nextStep(trajectory: readonly TrajectoryStep[]): NextStep {
	if (trajectory.length === 0) return { done: false, difficulty: 2 };
	if (trajectory.length === 1 && trajectory[0].difficulty === 2) {
		return { done: false, difficulty: trajectory[0].correct ? 3 : 1 };
	}
	return { done: true };
}

/**
 * levelFromTrajectory — deterministyczne mapowanie trajektorii → poziom 1–4.
 * Wyłącznie 4 legalne trajektorie z tabeli §2.4; kształt spoza tabeli
 * (np. sesja przerwana po 1 pytaniu) → null, decyzję podejmuje wołający
 * (complete wymaga pełnych trajektorii).
 */
export function levelFromTrajectory(trajectory: readonly TrajectoryStep[]): CompetencyLevel | null {
	if (trajectory.length !== 2) return null;
	const [first, second] = trajectory;
	if (first.difficulty !== 2) return null;
	if (first.correct) {
		if (second.difficulty !== 3) return null;
		return second.correct ? 4 : 3;
	}
	if (second.difficulty !== 1) return null;
	return second.correct ? 2 : 1;
}

/** Trudność drugiego pytania wynikająca z pierwszej odpowiedzi (gałąź planu). */
export function secondDifficulty(firstCorrect: boolean): Difficulty {
	return firstCorrect ? 3 : 1;
}
