// @vitest-environment node
/**
 * Partia 4 — PARYTET liczby pokrycia: front (computeMarketCoverage) == paszport
 * (calculateCoverage). To „koniec rozjazdu liczb": nagłówek w onboardingu pokazuje
 * to samo %, co paszport/pulpit po zapisie.
 *
 * Most: student zaznacza poziomy (2/3/4) z katalogu rynku rozmiaru N.
 *   • FRONT liczy computeMarketCoverage(N, poziomy).
 *   • PASZPORT (po zapisie) ma kompetencje ze statusem levelToStatus(poziom) + luki
 *     = N − liczba_zaznaczonych; calculateCoverage(komp, luki).
 * Obie strony MUSZĄ dać tę samą liczbę dla każdego wyboru — to weryfikujemy.
 */

import { describe, expect, it } from "vitest";
import { db } from "@/lib/db"; // tylko typowo — calculateCoverage jest czysta
import {
	computeDemandCoverage,
	computeMarketCoverage,
	coverageWeight,
	type PossessionLevel,
} from "@/lib/onboarding/market-catalog";
import { calculateCoverage } from "@/lib/passport-utils";
import { levelToStatus } from "@/lib/self-assessment";

void db; // świadomie nieużywane — import trzyma ścieżkę modułu spójną z prod

/** Odtwarza liczbę paszportu z tego samego wyboru, którym karmimy front. */
function passportCoverage(catalogSize: number, levels: PossessionLevel[]): number {
	const comps = levels.map((lvl) => ({ status: levelToStatus(lvl) }));
	const gapCount = catalogSize - levels.length; // niezaznaczone = luki
	return calculateCoverage(comps, gapCount);
}

describe("Parytet pokrycia front↔paszport (computeMarketCoverage == calculateCoverage)", () => {
	const cases: { catalogSize: number; levels: PossessionLevel[]; label: string }[] = [
		{ catalogSize: 10, levels: [], label: "0 zaznaczeń → 0%" },
		{ catalogSize: 10, levels: [2, 3, 4], label: "mieszanka 3 poziomów" },
		{ catalogSize: 5, levels: [2, 2, 3, 4, 4], label: "komplet, mieszane wagi" },
		{ catalogSize: 7, levels: [2], label: "jedna Podstawowa (0.5/7)" },
		{ catalogSize: 4, levels: [4, 4, 4, 4], label: "komplet Zaawansowany → 100%" },
		{ catalogSize: 12, levels: [3, 3, 2, 4, 2, 2], label: "dłuższy katalog, dużo Podstawowych" },
	];

	for (const c of cases) {
		it(`${c.label} — N=${c.catalogSize}, poziomy=[${c.levels.join(",")}]`, () => {
			const front = computeMarketCoverage(c.catalogSize, c.levels);
			const passport = passportCoverage(c.catalogSize, c.levels);
			expect(front).toBe(passport);
		});
	}

	it("własność ogólna: parytet trzyma dla losowych wyborów (200 prób)", () => {
		const levelsPool: PossessionLevel[] = [2, 3, 4];
		for (let t = 0; t < 200; t++) {
			const size = 1 + Math.floor(Math.random() * 20);
			const selCount = Math.floor(Math.random() * (size + 1));
			const levels: PossessionLevel[] = Array.from(
				{ length: selCount },
				() => levelsPool[Math.floor(Math.random() * 3)],
			);
			expect(computeMarketCoverage(size, levels)).toBe(passportCoverage(size, levels));
		}
	});
});

/**
 * Blok C planu napraw (C3, decyzja D3): paszport przestaje derywować z deklaracji,
 * więc parytet front↔paszport zmienia SENS — to odtąd parytet WZORU (obie strony
 * wołają computeDemandCoverage), nie równość wartości. Stare describe wyżej zostaje
 * jako strażnik zachowania przy fladze OFF (domyślnej).
 */
describe("Parytet WZORU (Blok C): front i paszport wołają computeDemandCoverage", () => {
	const catalog = [
		{ competencyName: "Python", demandPercentage: 55 },
		{ competencyName: "SQL", demandPercentage: 40 },
		{ competencyName: "Statystyka", demandPercentage: 25 },
		{ competencyName: "NumPy", demandPercentage: 2 },
	];

	it("te same posiadane @ tej samej wadze → identyczna liczba po obu stronach (ten sam wzór)", () => {
		const names = ["Python", "Statystyka"];
		// PASZPORT: kredencjały z verified_competencies, waga 1.0.
		const passport = computeDemandCoverage(
			catalog,
			names.map((name) => ({ name })),
		);
		// FRONT: deklaracje na poziomie 3/4 → coverageWeight = 1.0.
		const front = computeDemandCoverage(
			catalog,
			names.map((name) => ({ name, weight: coverageWeight(3) })),
		);
		expect(front).toBe(passport);
	});

	it("rozjazd WARTOŚCI jest legalny: deklaracja 'uczę się' (0.5) < kredencjał (1.0)", () => {
		const declared = computeDemandCoverage(catalog, [
			{ name: "Python", weight: coverageWeight(2) },
		]);
		const confirmed = computeDemandCoverage(catalog, [{ name: "Python" }]);
		expect(declared).toBeLessThan(confirmed);
		expect(confirmed).toBe(Math.round((55 / 122) * 100)); // Σ popytu katalogu = 122
	});

	it("własność: dla dowolnego wyboru wynik frontu z wagami 1.0 == wynik paszportu", () => {
		for (let t2 = 0; t2 < 100; t2++) {
			const picked = catalog.filter(() => Math.random() < 0.5).map((c) => c.competencyName);
			const passport = computeDemandCoverage(
				catalog,
				picked.map((name) => ({ name })),
			);
			const front = computeDemandCoverage(
				catalog,
				picked.map((name) => ({ name, weight: 1 })),
			);
			expect(front).toBe(passport);
		}
	});
});
