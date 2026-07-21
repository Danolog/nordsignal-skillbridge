// @vitest-environment node
//
// Blok C (C3/C4) — czyste elementy passport-verified: budowa listy kompetencji
// dokumentu z kredencjałów (status zawsze 'acquired', popyt z katalogu roli).

import { describe, expect, it } from "vitest";
import { contextCountLabel } from "@/components/passport/verified-stats-panel";
import { buildVerifiedPassportCompetencies, freshnessBucket } from "@/lib/passport-verified";

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

// MIS.3 — kubełki świeżości: <90 świeża, 90–180 starzejąca się, >180 do odświeżenia.
describe("freshnessBucket (MIS.3)", () => {
	const now = new Date("2026-07-21T12:00:00Z");
	const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

	it("granice progów: 89 świeża / 90 i 180 starzejąca się / 181 do odświeżenia", () => {
		expect(freshnessBucket(daysAgo(0), now)).toBe("fresh");
		expect(freshnessBucket(daysAgo(89), now)).toBe("fresh");
		expect(freshnessBucket(daysAgo(90), now)).toBe("aging");
		expect(freshnessBucket(daysAgo(180), now)).toBe("aging");
		expect(freshnessBucket(daysAgo(181), now)).toBe("stale");
	});
});

describe("contextCountLabel (MIS.3) — polska liczba mnoga", () => {
	it("1 kontekst / 2–4 konteksty / 5+ i 12–14 kontekstów", () => {
		expect(contextCountLabel(1)).toBe("1 kontekst");
		expect(contextCountLabel(2)).toBe("2 konteksty");
		expect(contextCountLabel(4)).toBe("4 konteksty");
		expect(contextCountLabel(5)).toBe("5 kontekstów");
		expect(contextCountLabel(12)).toBe("12 kontekstów");
		expect(contextCountLabel(22)).toBe("22 konteksty");
	});
});
