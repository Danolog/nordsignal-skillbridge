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
	computeDemandCoverage,
	computeMarketCoverage,
	coverageWeight,
	DESCRIPTION_LEVEL_1,
	demandToPriority,
	estimatedHoursForGap,
	isPossessionLevel,
	kindLabelKey,
	LABELS_BY_KIND,
	type MarketCatalogItem,
	POSSESSION_OPTIONS,
	possessionLabelsForKind,
	ratingOptionsForKind,
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

// ── C3: etykiety samooceny per rodzaj (narzędzie vs koncepcja) ───────────────

describe("kindLabelKey — wybór zestawu etykiet wg rodzaju", () => {
	it("tool/concept dostają własny zestaw; reszta (cert/meta/soft/null/undefined) → default", () => {
		expect(kindLabelKey("tool")).toBe("tool");
		expect(kindLabelKey("concept")).toBe("concept");
		expect(kindLabelKey("cert")).toBe("default");
		expect(kindLabelKey("meta")).toBe("default");
		expect(kindLabelKey("soft")).toBe("default");
		expect(kindLabelKey(null)).toBe("default");
		expect(kindLabelKey(undefined)).toBe("default");
	});
});

describe("LABELS_BY_KIND — czasowniki per rodzaj (Decyzje wiążące #3)", () => {
	it("narzędzie się OBSŁUGUJE (1..4)", () => {
		expect(LABELS_BY_KIND.tool).toEqual({
			1: "nie znam",
			2: "uczę się",
			3: "obsługuję",
			4: "swobodnie",
		});
	});
	it("koncepcję się ROZUMIE/STOSUJE (1..4)", () => {
		expect(LABELS_BY_KIND.concept).toEqual({
			1: "nie znam",
			2: "poznaję",
			3: "rozumiem",
			4: "stosuję",
		});
	});
	it("default = dawne etykiety PRD (cert/meta/soft/null)", () => {
		expect(LABELS_BY_KIND.default).toEqual({
			1: "nie znam",
			2: "uczę się",
			3: "znam",
			4: "dobrze znam",
		});
	});
});

describe("possessionLabelsForKind — 3 szczeble posiadania (onboarding, Brak osobno)", () => {
	it("narzędzie: poziomy 2/3/4 z czasownikiem narzędzia", () => {
		const out = possessionLabelsForKind("tool");
		expect(out.map((o) => o.level)).toEqual([2, 3, 4]);
		expect(out.map((o) => o.label)).toEqual(["uczę się", "obsługuję", "swobodnie"]);
	});
	it("koncepcja: czasownik koncepcji", () => {
		expect(possessionLabelsForKind("concept").map((o) => o.label)).toEqual([
			"poznaję",
			"rozumiem",
			"stosuję",
		]);
	});
	it("null/cert → default (uczę się/znam/dobrze znam)", () => {
		expect(possessionLabelsForKind(null).map((o) => o.label)).toEqual([
			"uczę się",
			"znam",
			"dobrze znam",
		]);
		expect(possessionLabelsForKind("cert").map((o) => o.label)).toEqual([
			"uczę się",
			"znam",
			"dobrze znam",
		]);
	});
	it("każdy szczebel ma opis-tooltip (title) niepusty", () => {
		expect(possessionLabelsForKind("tool").every((o) => o.title.length > 0)).toBe(true);
	});
});

describe("ratingOptionsForKind — 4 szczeble skali (panel B4, nie znam osobnym szczeblem)", () => {
	it("zwraca wartości 1..4 z opisem szczebla 1 wspólnym dla każdego rodzaju", () => {
		const out = ratingOptionsForKind("tool");
		expect(out.map((o) => o.value)).toEqual([1, 2, 3, 4]);
		expect(out[0]).toEqual({ value: 1, label: "nie znam", description: DESCRIPTION_LEVEL_1 });
		expect(out.map((o) => o.label)).toEqual(["nie znam", "uczę się", "obsługuję", "swobodnie"]);
	});
	it("brak rodzaju (null) == zestaw PRD (default)", () => {
		expect(ratingOptionsForKind(null).map((o) => o.label)).toEqual([
			"nie znam",
			"uczę się",
			"znam",
			"dobrze znam",
		]);
	});
});

describe("computeDemandCoverage — pokrycie WAŻONE POPYTEM (Blok C, D3)", () => {
	const catalog = [
		{ competencyName: "Python", demandPercentage: 55 },
		{ competencyName: "SQL", demandPercentage: 40 },
		{ competencyName: "NumPy", demandPercentage: 2 },
		{ competencyName: "Git", demandPercentage: 3 },
	];

	it("pusty katalog → 0 (bez dzielenia przez zero)", () => {
		expect(computeDemandCoverage([], [{ name: "Python" }])).toBe(0);
	});

	it("brak posiadanych → 0", () => {
		expect(computeDemandCoverage(catalog, [])).toBe(0);
	});

	it("komplet katalogu @1.0 → 100", () => {
		expect(
			computeDemandCoverage(
				catalog,
				catalog.map((c) => ({ name: c.competencyName })),
			),
		).toBe(100);
	});

	it("waży popytem, nie sztukami: Python (55%) ≫ NumPy (2%)", () => {
		const python = computeDemandCoverage(catalog, [{ name: "Python" }]);
		const numpy = computeDemandCoverage(catalog, [{ name: "NumPy" }]);
		expect(python).toBe(55); // 55/100
		expect(numpy).toBe(2); // 2/100
		expect(python).toBeGreaterThan(numpy);
	});

	it("kompetencja spoza katalogu roli nie podnosi pokrycia i nie wchodzi do mianownika", () => {
		expect(computeDemandCoverage(catalog, [{ name: "Haskell" }])).toBe(0);
		expect(computeDemandCoverage(catalog, [{ name: "Python" }, { name: "Haskell" }])).toBe(55);
	});

	it("dopasowanie nazw przez normalizację (trim + lower)", () => {
		expect(computeDemandCoverage(catalog, [{ name: "  python " }])).toBe(55);
	});

	it("duplikaty nazw liczone raz — wygrywa najwyższa waga", () => {
		expect(
			computeDemandCoverage(catalog, [
				{ name: "Python", weight: 0.5 },
				{ name: "python", weight: 1 },
			]),
		).toBe(55);
	});

	it("waga 0.5 (in_progress) daje połowę popytu pozycji", () => {
		expect(computeDemandCoverage(catalog, [{ name: "SQL", weight: 0.5 }])).toBe(20);
	});

	it("własność: monotoniczność — dodanie pozycji z katalogu nigdy nie obniża wyniku", () => {
		for (let t2 = 0; t2 < 100; t2++) {
			const size = 1 + Math.floor(Math.random() * 10);
			const cat = Array.from({ length: size }, (_, i) => ({
				competencyName: `k${i}`,
				demandPercentage: 1 + Math.floor(Math.random() * 60),
			}));
			const picked = cat.filter(() => Math.random() < 0.5).map((c) => ({ name: c.competencyName }));
			const before = computeDemandCoverage(cat, picked);
			const rest = cat.find((c) => !picked.some((p) => p.name === c.competencyName));
			if (!rest) continue;
			const after = computeDemandCoverage(cat, [...picked, { name: rest.competencyName }]);
			expect(after).toBeGreaterThanOrEqual(before);
		}
	});

	it("własność: wynik zawsze w przedziale 0–100 (wagi domykane do [0,1])", () => {
		for (let t2 = 0; t2 < 100; t2++) {
			const size = 1 + Math.floor(Math.random() * 8);
			const cat = Array.from({ length: size }, (_, i) => ({
				competencyName: `k${i}`,
				demandPercentage: Math.floor(Math.random() * 70),
			}));
			const possessed = cat.map((c) => ({
				name: c.competencyName,
				weight: Math.random() * 2, // celowo także >1 — funkcja domyka
			}));
			const v = computeDemandCoverage(cat, possessed);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(100);
		}
	});
});
