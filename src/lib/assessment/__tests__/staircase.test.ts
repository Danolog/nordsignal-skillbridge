/**
 * A5/1.11 — golden test staircase (spec §2.4): tabela wyników jest SKOŃCZONA
 * (4 trajektorie) i testowana WYCZERPUJĄCO. Zmiana któregokolwiek przypadku
 * = zmiana kontraktu diagnozy (decyzja Darka), nie refaktor.
 */
import { describe, expect, it } from "vitest";
import { levelFromTrajectory, nextStep, secondDifficulty } from "../staircase";
import type { TrajectoryStep } from "../types";

const step = (difficulty: 1 | 2 | 3, correct: boolean): TrajectoryStep => ({
	difficulty,
	correct,
});

describe("nextStep — sterowanie staircase", () => {
	it("pusta trajektoria → start od trudności 2", () => {
		expect(nextStep([])).toEqual({ done: false, difficulty: 2 });
	});
	it("d2 poprawnie → trudność 3", () => {
		expect(nextStep([step(2, true)])).toEqual({ done: false, difficulty: 3 });
	});
	it("d2 błędnie → trudność 1", () => {
		expect(nextStep([step(2, false)])).toEqual({ done: false, difficulty: 1 });
	});
	it("2 odpowiedzi → done (dokładnie 2 pytania per kompetencja)", () => {
		expect(nextStep([step(2, true), step(3, false)])).toEqual({ done: true });
	});
	it("fail-closed: trajektoria o nieoczekiwanym kształcie → done, nie pytanie poza tabelą", () => {
		expect(nextStep([step(3, true)])).toEqual({ done: true });
	});
});

describe("levelFromTrajectory — GOLDEN: wyczerpujące 4 trajektorie tabeli §2.4", () => {
	it("d2✓ d3✓ → poziom 4", () => {
		expect(levelFromTrajectory([step(2, true), step(3, true)])).toBe(4);
	});
	it("d2✓ d3✗ → poziom 3", () => {
		expect(levelFromTrajectory([step(2, true), step(3, false)])).toBe(3);
	});
	it("d2✗ d1✓ → poziom 2", () => {
		expect(levelFromTrajectory([step(2, false), step(1, true)])).toBe(2);
	});
	it("d2✗ d1✗ → poziom 1", () => {
		expect(levelFromTrajectory([step(2, false), step(1, false)])).toBe(1);
	});
});

describe("levelFromTrajectory — kształty spoza tabeli → null (decyzja u wołającego)", () => {
	it("niepełna trajektoria (1 odpowiedź)", () => {
		expect(levelFromTrajectory([step(2, true)])).toBeNull();
	});
	it("pusta trajektoria", () => {
		expect(levelFromTrajectory([])).toBeNull();
	});
	it("zła gałąź: d2✓ a potem d1 (niezgodne ze staircase)", () => {
		expect(levelFromTrajectory([step(2, true), step(1, true)])).toBeNull();
	});
	it("zły start: pierwsze pytanie nie-d2", () => {
		expect(levelFromTrajectory([step(1, true), step(2, true)])).toBeNull();
	});
});

describe("secondDifficulty — gałąź planu", () => {
	it("poprawna pierwsza → 3; błędna → 1", () => {
		expect(secondDifficulty(true)).toBe(3);
		expect(secondDifficulty(false)).toBe(1);
	});
});
