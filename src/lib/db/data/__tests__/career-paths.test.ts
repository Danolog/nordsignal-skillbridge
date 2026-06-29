// @vitest-environment node
/**
 * Partia 4 — katalog 23 realnych ścieżek kariery (career-paths.ts).
 *
 * Reguła twarda (HITL, Built-to-Sell): lista NIE jest generowana przez model. Tu
 * pilnujemy kontraktu, na którym opiera się picker (element 1) i bramka isRealCareerGoal
 * w GET /api/onboarding/market-catalog (cel spoza listy → katalog pusty, prośba o wybór).
 */

import { describe, expect, it } from "vitest";
import {
	CAREER_FAMILIES,
	CAREER_PATHS,
	entryCareerPaths,
	groupCareerPathsByFamily,
	isRealCareerGoal,
} from "@/lib/db/data/career-paths";

describe("CAREER_PATHS — 23 realne ścieżki (zrzut JustJoinIT)", () => {
	it("dokładnie 23 ścieżki", () => {
		expect(CAREER_PATHS).toHaveLength(23);
	});

	it("każda etykieta unikalna (klucz katalogu rynku — bez kolizji)", () => {
		const labels = CAREER_PATHS.map((p) => p.careerGoal);
		expect(new Set(labels).size).toBe(23);
	});

	it("dokładnie 2 role docelowe (Solution Architect, Engineering Manager)", () => {
		const targets = CAREER_PATHS.filter((p) => p.targetRole).map((p) => p.careerGoal);
		expect(targets).toEqual(["Solution Architect", "Engineering Manager"]);
	});
});

describe("isRealCareerGoal — bramka celu realnego", () => {
	it("realna ścieżka → true (dokładna etykieta)", () => {
		expect(isRealCareerGoal("Data Analyst")).toBe(true);
		expect(isRealCareerGoal("Frontend Developer")).toBe(true);
		expect(isRealCareerGoal("Solution Architect")).toBe(true);
	});

	it("trim — białe znaki wokół nie psują dopasowania", () => {
		expect(isRealCareerGoal("  Data Analyst  ")).toBe(true);
	});

	it("cel spoza listy (wolny tekst z Pomocnika) → false", () => {
		expect(isRealCareerGoal("Zostać kosmonautą")).toBe(false);
		expect(isRealCareerGoal("data analyst")).toBe(false); // wielkość liter ma znaczenie (klucz dosłowny)
		expect(isRealCareerGoal("")).toBe(false);
	});
});

describe("entryCareerPaths — ścieżki wejściowe (Pomocnik proponuje aktywnie)", () => {
	it("21 ścieżek = 23 − 2 role docelowe", () => {
		const entry = entryCareerPaths();
		expect(entry).toHaveLength(21);
		expect(entry.every((p) => p.targetRole === false)).toBe(true);
	});
});

describe("groupCareerPathsByFamily — grupowanie po 5 rodzinach e-CF (D1)", () => {
	it("5 rodzin w kolejności CAREER_FAMILIES, suma ścieżek = 23", () => {
		const groups = groupCareerPathsByFamily();
		expect(groups.map((g) => g.family)).toEqual([...CAREER_FAMILIES]);
		expect(groups.reduce((n, g) => n + g.paths.length, 0)).toBe(23);
	});

	it("każda ścieżka trafia do swojej rodziny (brak sieroty)", () => {
		const groups = groupCareerPathsByFamily();
		for (const g of groups) {
			expect(g.paths.every((p) => p.family === g.family)).toBe(true);
		}
	});
});
