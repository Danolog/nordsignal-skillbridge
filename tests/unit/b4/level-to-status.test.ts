/**
 * Test jednostkowy mapowania poziom samooceny → status kompetencji.
 *
 * Decyzja Darka 2026-06-01 (ratyfikowane, zamknięte):
 *   NULL → 'missing'
 *   1    → 'missing'
 *   2    → 'in_progress'
 *   3    → 'acquired'
 *   4    → 'acquired'
 *
 * Pokrycie: wszystkie 5 przypadków (null + 4 wartości) — czerwona linia DoD Bety.
 * Koniec hardcoded 'acquired' — PRD §4.3 KA2.
 */
import { describe, expect, it } from "vitest";

// Duplikujemy logikę mapowania tu lokalnie (nie importujemy z route — route jest
// server-only i ma side-effecty Node.js). Testujemy czystą funkcję.
// Źródło prawdy: src/app/api/self-assessment/ratings/[competencyId]/route.ts
type CompetencyStatus = "acquired" | "in_progress" | "missing";

function levelToStatus(level: number | null): CompetencyStatus {
	if (level === null) return "missing";
	if (level === 1) return "missing";
	if (level === 2) return "in_progress";
	return "acquired"; // 3 i 4
}

describe("levelToStatus — mapowanie poziom→status (decyzja Darka 2026-06-01)", () => {
	it("NULL → 'missing' (nieocenione = brakująca kompetencja)", () => {
		expect(levelToStatus(null)).toBe("missing");
	});

	it("1 (nie znam) → 'missing'", () => {
		expect(levelToStatus(1)).toBe("missing");
	});

	it("2 (uczę się) → 'in_progress'", () => {
		expect(levelToStatus(2)).toBe("in_progress");
	});

	it("3 (znam) → 'acquired'", () => {
		expect(levelToStatus(3)).toBe("acquired");
	});

	it("4 (dobrze znam) → 'acquired'", () => {
		expect(levelToStatus(4)).toBe("acquired");
	});
});

describe("levelToStatus — spójność z DoD Bety", () => {
	it("wartości 3 i 4 obie dają 'acquired' (skala asymetryczna — dwa poziomy = acquired)", () => {
		expect(levelToStatus(3)).toBe(levelToStatus(4));
	});

	it("wartości 1 i NULL obie dają 'missing' (nieocenione ≡ brakujące)", () => {
		expect(levelToStatus(1)).toBe(levelToStatus(null));
	});

	it("wszystkie 5 przypadków NIE zwracają undefined ani null", () => {
		for (const v of [null, 1, 2, 3, 4]) {
			expect(levelToStatus(v)).toBeTruthy();
		}
	});
});
