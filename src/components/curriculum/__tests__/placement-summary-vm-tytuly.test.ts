// 1E.7 L6 · naprawa K1 (przegląd Leo) — FAKT „ile otworzyła diagnoza" kontra
// PREZENTACJA „co da się nazwać". To były dwie różne rzeczy liczone z jednej listy.
//
// Wada, którą ten plik pinuje: `zeroUnlocked` przełącza teksty na warianty zerowe
// (§8: „…dlatego zaczynamy od początku ścieżki"), a liczył się z listy PO filtrze
// prezentacyjnym. Moduł bez tytułu wypadał z listy — i student z DWOMA otwartymi
// modułami czytał, że diagnoza nie otworzyła nic. Pusty tytuł jest osiągalny:
// `curriculum_modules.title` jest `NOT NULL`, a `NOT NULL` nie zabrania `''`.
//
// Druga połowa naprawy: serwer i klient miały DWIE definicje „moduł ma tytuł"
// (serwer przepuszczał `''`, klient odsiewał). Teraz obie strony wołają
// `jestTytulemDoPokazania` z `placement-title.ts`.

import { describe, expect, it } from "vitest";
import type { PlacementScreenContract } from "@/lib/curriculum/placement-screen";
import { jestTytulemDoPokazania } from "@/lib/curriculum/placement-title";
import { toPlacementSummaryViewModel } from "../placement-summary-vm";

const DZIURA = {
	moduleTitle: "Analiza danych",
	competencyName: "Eksploracja danych",
	reason: "no_measurement" as const,
};

function kontrakt(over: Partial<PlacementScreenContract> = {}): PlacementScreenContract {
	return {
		unlockedByDiagnosis: [],
		unlockedCount: 0,
		completedModules: [],
		hole: DZIURA,
		recommendation: { slug: "l0-start", title: "Start: środowisko pracy" },
		noRecommendationReason: null,
		recommendationIsRoot: true,
		...over,
	};
}

describe("K1 — fakt ile otworzyła diagnoza nie zależy od tego, co da się wyświetlić", () => {
	it("KRYTERIUM ODBIORU: dwa moduły otwarte, oba bez tytułu → zeroUnlocked === false", () => {
		const vm = toPlacementSummaryViewModel(
			kontrakt({
				unlockedByDiagnosis: [
					{ slug: "f1-python-1", title: "" },
					{ slug: "f2-python-2", title: "   " },
				],
				unlockedCount: 2,
			}),
		);
		// Nazwać ich nie umiemy — i to jest w porządku, lista ma być pusta.
		expect(vm?.unlockedModuleTitles).toEqual([]);
		// Ale NIE WOLNO z tego wywieść, że diagnoza nic nie otworzyła.
		expect(vm?.hole?.zeroUnlocked).toBe(false);
	});

	it("prawdziwe zero otwarć → zeroUnlocked === true (kontrola dodatnia)", () => {
		const vm = toPlacementSummaryViewModel(kontrakt({ unlockedByDiagnosis: [], unlockedCount: 0 }));
		expect(vm?.hole?.zeroUnlocked).toBe(true);
	});

	it("moduł z tytułem liczy się normalnie", () => {
		const vm = toPlacementSummaryViewModel(
			kontrakt({
				unlockedByDiagnosis: [{ slug: "f1-python-1", title: "Python: podstawy" }],
				unlockedCount: 1,
			}),
		);
		expect(vm?.unlockedModuleTitles).toEqual(["Python: podstawy"]);
		expect(vm?.hole?.zeroUnlocked).toBe(false);
	});

	it("brak pola `unlockedCount` (stary serwer, typ nie przeżywa sieci) → cofamy się do SUROWEJ listy, nie do listy po filtrze", () => {
		const bezPola = kontrakt({
			unlockedByDiagnosis: [{ slug: "f1-python-1", title: "" }],
		}) as Record<string, unknown>;
		delete bezPola.unlockedCount;
		const vm = toPlacementSummaryViewModel(bezPola as unknown as PlacementScreenContract);
		expect(vm?.unlockedModuleTitles).toEqual([]);
		expect(vm?.hole?.zeroUnlocked).toBe(false);
	});

	it("wartość niepoprawna (NaN / ujemna / nie-liczba) też cofa się do surowej listy", () => {
		for (const zla of [Number.NaN, -1, "2", null]) {
			const vm = toPlacementSummaryViewModel(
				kontrakt({
					unlockedByDiagnosis: [{ slug: "f1-python-1", title: "" }],
					unlockedCount: zla as unknown as number,
				}),
			);
			expect(vm?.hole?.zeroUnlocked).toBe(false);
		}
	});
});

describe("jestTytulemDoPokazania — jedna reguła dla obu końców", () => {
	it("pusty łańcuch i sam biały znak to BRAK tytułu", () => {
		expect(jestTytulemDoPokazania("")).toBe(false);
		expect(jestTytulemDoPokazania("   ")).toBe(false);
		expect(jestTytulemDoPokazania("\t\n")).toBe(false);
	});
	it("niepusty tekst jest tytułem", () => {
		expect(jestTytulemDoPokazania("Python: podstawy")).toBe(true);
	});
	it("cokolwiek innego niż tekst nie jest tytułem (granica sieci)", () => {
		for (const v of [null, undefined, 0, 42, {}, []]) expect(jestTytulemDoPokazania(v)).toBe(false);
	});
});
