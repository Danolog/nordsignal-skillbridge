// Test przełączenia źródła modelu (1.0): po preloadzie z DB (flaga on)
// competency-groups musi unieważnić indeksy zbudowane na statycznym JSON
// (mechanizm pokolenia loadera) — inaczej serwowałby stary model do końca
// życia procesu mimo udanego odczytu z DB.
//
// Świeże moduły przez vi.resetModules + dynamiczne importy: stan loadera
// i cache indeksów competency-groups są modułowe.

import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
vi.mock("@/lib/db", () => ({
	db: { query: { careerModelVersions: { findFirst: (...a: unknown[]) => findFirstMock(...a) } } },
}));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

const DB_MODEL = {
	paths: [
		{
			careerGoal: "Data Scientist",
			profileNote: "nota testowa z DB",
			areas: [
				{
					name: "Testowa grupa",
					description: "opis z DB",
					unionShare: 50,
					leaves: [{ name: "Python", kind: "tool" }],
				},
			],
		},
	],
};
const DB_CONTENT = JSON.stringify(DB_MODEL);

beforeEach(() => {
	vi.resetModules();
	findFirstMock.mockReset();
	vi.unstubAllEnvs();
});

describe("podmiana modelu statyczny → DB (pokolenie unieważnia indeksy)", () => {
	it("getCompetencyContext i getPathProfileNote widzą model z DB po preloadzie", async () => {
		vi.stubEnv("FLAG_CAREER_MODEL_FROM_DB", "1");
		const { careerModelChecksum, ensureCareerModelLoaded } = await import("../loader");
		const { getCompetencyContext, getPathProfileNote } = await import(
			"@/lib/onboarding/competency-groups"
		);
		findFirstMock.mockResolvedValue({
			content: DB_CONTENT,
			checksum: careerModelChecksum(DB_CONTENT),
			snapshot: "test",
		});

		// Indeks zbudowany PRZED preloadem — na statycznym JSON (23 ścieżki).
		const before = getCompetencyContext("Data Scientist", "Python");
		expect(before?.groupName).not.toBe("Testowa grupa");

		await ensureCareerModelLoaded();

		// Po preloadzie: pokolenie wzrosło → indeks przebudowany na modelu z DB.
		const after = getCompetencyContext("Data Scientist", "Python");
		expect(after?.groupName).toBe("Testowa grupa");
		expect(after?.kind).toBe("tool");
		expect(getPathProfileNote("Data Scientist")).toBe("nota testowa z DB");
	});

	it("flaga off: indeksy i noty zostają na statycznym JSON mimo wołania preloadu", async () => {
		const { ensureCareerModelLoaded } = await import("../loader");
		const { getCompetencyContext } = await import("@/lib/onboarding/competency-groups");

		await ensureCareerModelLoaded();

		const ctx = getCompetencyContext("Data Scientist", "Python");
		expect(findFirstMock).not.toHaveBeenCalled();
		expect(ctx?.groupName).not.toBe("Testowa grupa");
	});
});
