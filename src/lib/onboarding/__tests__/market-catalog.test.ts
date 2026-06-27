// @vitest-environment node
/**
 * Partia 4 — czyste funkcje skali biegłości + pokrycia rynku (market-catalog.ts).
 *
 * Zero DB, zero modelu: deterministyczne reguły (Built-to-Sell). Testujemy:
 *   • computeMarketCoverage / coverageWeight — wzór pokrycia (mirror calculateCoverage),
 *   • demandToPriority / estimatedHoursForGap — priorytet luki (reguła WZGLĘDNA r = popyt/max, bez krotności),
 *   • isPossessionLevel / POSSESSION_OPTIONS — kontrakt skali 3 poziomów posiadania,
 *   • annotateWithSyllabus — adnotacja „w programie studiów" (D4), dopasowanie jednostronne.
 */

import { describe, expect, it } from "vitest";
import {
	annotateWithSyllabus,
	computeMarketCoverage,
	coverageWeight,
	demandToPriority,
	estimatedHoursForGap,
	isPossessionLevel,
	type MarketCatalogItem,
	POSSESSION_OPTIONS,
} from "@/lib/onboarding/market-catalog";

function item(name: string, demand: number, category = "Język i framework"): MarketCatalogItem {
	return { competencyName: name, demandPercentage: demand, category };
}

describe("coverageWeight — waga pozycji wg poziomu (mirror calculateCoverage)", () => {
	it("Podstawowy (2) = 0.5; Średni (3) = 1.0; Zaawansowany (4) = 1.0", () => {
		expect(coverageWeight(2)).toBe(0.5);
		expect(coverageWeight(3)).toBe(1);
		expect(coverageWeight(4)).toBe(1);
	});
});

describe("computeMarketCoverage — % pokrycia kompetencji rynku (9c B1)", () => {
	it("katalog pusty/0 → 0% (zero dzielenia przez zero)", () => {
		expect(computeMarketCoverage(0, [])).toBe(0);
		expect(computeMarketCoverage(0, [4, 4])).toBe(0);
		expect(computeMarketCoverage(-3, [4])).toBe(0);
	});

	it("brak zaznaczeń → 0% (uczciwy start juniora, cały rynek jako luki)", () => {
		expect(computeMarketCoverage(10, [])).toBe(0);
	});

	it("komplet na poziomie Zaawansowany → 100%", () => {
		expect(computeMarketCoverage(4, [4, 4, 4, 4])).toBe(100);
	});

	it("same Podstawowe (waga 0.5) → połowa pokrycia", () => {
		expect(computeMarketCoverage(4, [2, 2, 2, 2])).toBe(50);
	});

	it("mieszanka poziomów liczona po wadze, z zaokrągleniem", () => {
		// (0.5 + 1) / 3 = 0.5 → 50%
		expect(computeMarketCoverage(3, [2, 3])).toBe(50);
		// (1 + 0.5) / 8 = 0.1875 → round(18.75) = 19%
		expect(computeMarketCoverage(8, [4, 2])).toBe(19);
	});
});

describe("demandToPriority — reguła WZGLĘDNA (r = popyt/max ścieżki)", () => {
	it("krytyczna ≥0,66, ważna 0,33–0,66, miło-mieć <0,33 (rola rozdrobniona, max=12)", () => {
		// Cyber po kuracji: SIEM krytyczny mimo 12% (max ścieżki).
		expect(demandToPriority(12, 12)).toBe("critical"); // r=1
		expect(demandToPriority(8, 12)).toBe("critical"); // r=0,67
		expect(demandToPriority(6, 12)).toBe("important"); // r=0,5
		expect(demandToPriority(4, 12)).toBe("important"); // r=0,33 (granica włącznie)
		expect(demandToPriority(3, 12)).toBe("nice_to_have"); // r=0,25
	});

	it("działa też dla ról skoncentrowanych (Java: max=81)", () => {
		expect(demandToPriority(81, 81)).toBe("critical"); // Java r=1
		expect(demandToPriority(48, 81)).toBe("important"); // Spring Boot r=0,59
		expect(demandToPriority(19, 81)).toBe("nice_to_have"); // Kafka r=0,23
	});

	it("max=0 (pusty/zerowy katalog) → miło-mieć, bez dzielenia przez zero", () => {
		expect(demandToPriority(0, 0)).toBe("nice_to_have");
	});
});

describe("estimatedHoursForGap — godziny wg priorytetu (deterministyczne)", () => {
	it("critical 8h, important 5h, nice_to_have 3h", () => {
		expect(estimatedHoursForGap("critical")).toBe(8);
		expect(estimatedHoursForGap("important")).toBe(5);
		expect(estimatedHoursForGap("nice_to_have")).toBe(3);
	});
});

describe("isPossessionLevel — walidacja wejścia (2/3/4)", () => {
	it("akceptuje 2, 3, 4", () => {
		expect(isPossessionLevel(2)).toBe(true);
		expect(isPossessionLevel(3)).toBe(true);
		expect(isPossessionLevel(4)).toBe(true);
	});

	it("odrzuca 1 (Brak nie jest poziomem posiadania), 5, 0, null, string", () => {
		expect(isPossessionLevel(1)).toBe(false);
		expect(isPossessionLevel(5)).toBe(false);
		expect(isPossessionLevel(0)).toBe(false);
		expect(isPossessionLevel(null)).toBe(false);
		expect(isPossessionLevel("3")).toBe(false);
	});
});

describe("POSSESSION_OPTIONS — kontrakt skali 3 poziomów posiadania", () => {
	it("3 opcje, poziomy 2/3/4, kropki 1/2/3, tiery wg ratyfikacji", () => {
		expect(POSSESSION_OPTIONS).toHaveLength(3);
		expect(POSSESSION_OPTIONS.map((o) => o.level)).toEqual([2, 3, 4]);
		expect(POSSESSION_OPTIONS.map((o) => o.dots)).toEqual([1, 2, 3]);
		expect(POSSESSION_OPTIONS.map((o) => o.tier)).toEqual(["Podstawowy", "Średni", "Zaawansowany"]);
	});
});

describe("annotateWithSyllabus — adnotacja „w programie studiów” (D4)", () => {
	const catalog = [item("SQL", 90), item("Python", 80), item("PostgreSQL", 30)];

	it("pusty sylabus → wszystkie inSyllabus=false (nie generuje, tylko adnotuje)", () => {
		const out = annotateWithSyllabus(catalog, []);
		expect(out.map((c) => c.inSyllabus)).toEqual([false, false, false]);
	});

	it("dopasowanie dokładne (case-insensitive + trim)", () => {
		const out = annotateWithSyllabus(catalog, ["  sql  ", "PYTHON"]);
		expect(out.find((c) => c.competencyName === "SQL")?.inSyllabus).toBe(true);
		expect(out.find((c) => c.competencyName === "Python")?.inSyllabus).toBe(true);
		expect(out.find((c) => c.competencyName === "PostgreSQL")?.inSyllabus).toBe(false);
	});

	it("sylabus ZAWIERA nazwę rynku → flaga (np. „SQL podstawy” → katalog „SQL”)", () => {
		const out = annotateWithSyllabus(catalog, ["SQL podstawy"]);
		expect(out.find((c) => c.competencyName === "SQL")?.inSyllabus).toBe(true);
	});

	it("jednostronność: „SQL” w sylabusie NIE rozszerza się na „PostgreSQL” (anty-nad-dopasowanie)", () => {
		const out = annotateWithSyllabus(catalog, ["SQL"]);
		expect(out.find((c) => c.competencyName === "PostgreSQL")?.inSyllabus).toBe(false);
	});

	it("nie mutuje wejścia (zwraca nowe obiekty)", () => {
		const out = annotateWithSyllabus(catalog, ["SQL"]);
		expect(out[0]).not.toBe(catalog[0]);
		expect(catalog[0]).not.toHaveProperty("inSyllabus");
	});
});
