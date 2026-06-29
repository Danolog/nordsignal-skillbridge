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
import { computeMarketCoverage, type PossessionLevel } from "@/lib/onboarding/market-catalog";
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
