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
	isEntryCareerGoal,
	isRealCareerGoal,
	matchCareerGoal,
	normalizeGoalKey,
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

	it("ETAP H: dokładnie 5 ścieżek z adnotacją profilu (lekka kopia klienta pickera)", () => {
		const noted = CAREER_PATHS.filter((p) => p.profileNote).map((p) => p.careerGoal);
		expect(noted.sort()).toEqual(
			[
				"Engineering Manager",
				"PHP Developer",
				"Python Developer",
				"Solution Architect",
				"UX/UI Designer",
			].sort(),
		);
		// Treść niepusta i sensowna (uczciwy sygnał dla studenta, nie placeholder).
		expect(CAREER_PATHS.find((p) => p.careerGoal === "UX/UI Designer")?.profileNote).toContain(
			"Dane wstępne",
		);
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

describe("matchCareerGoal — ugruntowanie etykiety LLM w 23 ścieżkach (F2)", () => {
	it("trafienie dosłowne → ta sama kanoniczna etykieta", () => {
		expect(matchCareerGoal("Data Analyst")).toBe("Data Analyst");
		expect(matchCareerGoal(".NET Developer")).toBe(".NET Developer");
	});

	it("trim wokół etykiety → kanoniczna", () => {
		expect(matchCareerGoal("  Data Engineer  ")).toBe("Data Engineer");
	});

	it("wielkość liter nie psuje dopasowania (mapuje do kanonicznej)", () => {
		expect(matchCareerGoal("data analyst")).toBe("Data Analyst");
		expect(matchCareerGoal("FRONTEND DEVELOPER")).toBe("Frontend Developer");
	});

	it("ogon interpunkcji i podwójne spacje → kanoniczna", () => {
		expect(matchCareerGoal("Data Analyst.")).toBe("Data Analyst");
		expect(matchCareerGoal("Full-Stack  Developer")).toBe("Full-Stack Developer");
	});

	it("cel spoza katalogu → null (do odsiania)", () => {
		expect(matchCareerGoal("Pilot")).toBeNull();
		expect(matchCareerGoal("Inżynier danych")).toBeNull(); // brak aliasu = brak dopasowania (świadomie bez fuzzy)
		expect(matchCareerGoal("")).toBeNull();
	});
});

describe("isEntryCareerGoal — bramka 21 ścieżek wejściowych (D1, Pomocnik)", () => {
	it("ścieżka wejściowa → true", () => {
		expect(isEntryCareerGoal("Data Analyst")).toBe(true);
		expect(isEntryCareerGoal("DevOps Engineer")).toBe(true);
	});
	it("rola docelowa (w 23, ale nie wejściowa) → false", () => {
		expect(isEntryCareerGoal("Solution Architect")).toBe(false);
		expect(isEntryCareerGoal("Engineering Manager")).toBe(false);
	});
	it("cel spoza katalogu → false", () => {
		expect(isEntryCareerGoal("Pilot")).toBe(false);
	});
});

describe("normalizeGoalKey — ścisła normalizacja (nie fuzzy)", () => {
	it("zdejmuje diakrytyki, casing i kolapsuje spacje", () => {
		expect(normalizeGoalKey("  Inżynier  DANYCH. ")).toBe("inzynier danych");
	});
});

describe("entryCareerPaths — ścieżki wejściowe (Pomocnik proponuje aktywnie)", () => {
	it("19 ścieżek = 20 wybieralnych − 1 rola docelowa wśród nich", () => {
		const entry = entryCareerPaths();
		expect(entry).toHaveLength(19);
		expect(entry.every((p) => p.targetRole === false)).toBe(true);
	});
});

describe("groupCareerPathsByFamily — grupowanie po 5 rodzinach e-CF (D1)", () => {
	it("5 rodzin w kolejności CAREER_FAMILIES, suma ścieżek = 20 wybieralnych", () => {
		const groups = groupCareerPathsByFamily();
		expect(groups.map((g) => g.family)).toEqual([...CAREER_FAMILIES]);
		expect(groups.reduce((n, g) => n + g.paths.length, 0)).toBe(20);
	});

	it("każda ścieżka trafia do swojej rodziny (brak sieroty)", () => {
		const groups = groupCareerPathsByFamily();
		for (const g of groups) {
			expect(g.paths.every((p) => p.family === g.family)).toBe(true);
		}
	});
});
