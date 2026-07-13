// @vitest-environment node
//
// Blok C (C3/C4) — czyste elementy passport-verified: budowa listy kompetencji
// dokumentu z kredencjałów (status zawsze 'acquired', popyt z katalogu roli).

import { describe, expect, it } from "vitest";
import { buildVerifiedPassportCompetencies } from "@/lib/passport-verified";

describe("buildVerifiedPassportCompetencies — lista dokumentu z kredencjałów", () => {
	const catalog = [
		{ competencyName: "Python", demandPercentage: 55 },
		{ competencyName: "SQL", demandPercentage: 40 },
	];

	it("status zawsze 'acquired' — „w trakcie\" to pojęcie Kanbana, nie kredencjału", () => {
		const rows = buildVerifiedPassportCompetencies(["Python", "SQL"], catalog);
		expect(rows).toHaveLength(2);
		for (const r of rows) expect(r.status).toBe("acquired");
	});

	it("popyt per kompetencja dokładany z katalogu przez normalizację nazwy", () => {
		const rows = buildVerifiedPassportCompetencies(["  python "], catalog);
		expect(rows[0]).toEqual({ name: "  python ", status: "acquired", marketPercentage: 55 });
	});

	it("kredencjał spoza katalogu roli dostaje marketPercentage: null (jest na liście, nie w mianowniku)", () => {
		const rows = buildVerifiedPassportCompetencies(["Haskell"], catalog);
		expect(rows[0].marketPercentage).toBeNull();
	});

	it("pusta lista kredencjałów → pusty dokument (uczciwa prawda nowego studenta)", () => {
		expect(buildVerifiedPassportCompetencies([], catalog)).toEqual([]);
	});
});
