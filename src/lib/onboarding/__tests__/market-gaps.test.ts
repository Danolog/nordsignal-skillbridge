// @vitest-environment node
/**
 * Partia 4 — deterministyczne luki + ładowanie katalogu (market-gaps.ts).
 *
 *   • deriveGaps (CZYSTA) — luka ≡ pozycja katalogu, której student NIE zaznaczył
 *     (Brak), z priorytetem/godzinami wyprowadzonymi z popytu. Bez DB, bez modelu.
 *   • loadMarketCatalog — katalog rynku per ścieżka, posortowany MALEJĄCO wg popytu
 *     (oś priorytetu). DB zamockowane na granicy (findMany), testujemy sam sort/mapowanie.
 *
 * persistMarketGaps (zapis luk + pokrycie paszportu) = ścieżka z realną bazą →
 * pokryta integracyjnie (onboarding-not-complete.integration), nie tu.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// DB na granicy — deriveGaps jej nie używa (czysta), loadMarketCatalog tak.
const findMany = vi.fn();
vi.mock("@/lib/db", () => ({
	db: { query: { jobMarketData: { findMany: (...a: unknown[]) => findMany(...a) } } },
}));

import type { MarketCatalogItem } from "@/lib/onboarding/market-catalog";
import { deriveGaps, loadMarketCatalog } from "@/lib/onboarding/market-gaps";

function item(name: string, demand: number, category = "Język i framework"): MarketCatalogItem {
	return { competencyName: name, demandPercentage: demand, category };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("deriveGaps — luki = katalog rynku \\ wybór studenta (czysta)", () => {
	const catalog = [item("SQL", 90), item("Python", 50), item("Docker", 20)];

	it("brak zaznaczeń → cały katalog jest luką (poprawny start 0%, zero „0/0”)", () => {
		const gaps = deriveGaps(catalog, []);
		expect(gaps.map((g) => g.competencyName)).toEqual(["SQL", "Python", "Docker"]);
	});

	it("wszystko zaznaczone → zero luk", () => {
		expect(deriveGaps(catalog, ["SQL", "Python", "Docker"])).toEqual([]);
	});

	it("zaznaczenie częściowe → tylko niezaznaczone zostają luką", () => {
		const gaps = deriveGaps(catalog, ["SQL"]);
		expect(gaps.map((g) => g.competencyName)).toEqual(["Python", "Docker"]);
	});

	it("normalizacja nazwy (trim + lower) — odporne na różnice wielkości liter", () => {
		const gaps = deriveGaps(catalog, ["  sql ", "PYTHON"]);
		expect(gaps.map((g) => g.competencyName)).toEqual(["Docker"]);
	});

	it("priorytet + godziny + % popytu (Reguła 1 względna, max=90)", () => {
		const gaps = deriveGaps(catalog, []);
		const sql = gaps.find((g) => g.competencyName === "SQL");
		const py = gaps.find((g) => g.competencyName === "Python");
		const docker = gaps.find((g) => g.competencyName === "Docker");
		// max=90 (SQL). SQL r=1 → critical/8h; Python 50/90=0,56 → important/5h; Docker 20/90=0,22 → nice/3h.
		expect(sql).toMatchObject({ priority: "critical", estimatedHours: 8, marketPercentage: 90 });
		expect(py).toMatchObject({ priority: "important", estimatedHours: 5, marketPercentage: 50 });
		expect(docker).toMatchObject({
			priority: "nice_to_have",
			estimatedHours: 3,
			marketPercentage: 20,
		});
	});

	it("Reguła 1 rozdrobniona rola: najwyższy popyt = krytyczny mimo niskiego % bezwzględnego", () => {
		// Cyber po kuracji: SIEM 12% to max ścieżki → krytyczna (stare progi 60/40 dałyby „miło-mieć").
		const cyber = [item("SIEM", 12), item("SoC", 6), item("PAM", 3)];
		const g = deriveGaps(cyber, []);
		expect(g.find((x) => x.competencyName === "SIEM")?.priority).toBe("critical");
		expect(g.find((x) => x.competencyName === "SoC")?.priority).toBe("important"); // 6/12=0,5
		expect(g.find((x) => x.competencyName === "PAM")?.priority).toBe("nice_to_have"); // 3/12=0,25, bez lift
	});

	it("zachowuje oryginalną pisownię nazwy z katalogu (nie znormalizowaną)", () => {
		const gaps = deriveGaps([item("PostgreSQL", 40)], []);
		expect(gaps[0].competencyName).toBe("PostgreSQL");
	});
});

describe("loadMarketCatalog — katalog per ścieżka, sort malejąco wg popytu", () => {
	it("mapuje wiersze i sortuje MALEJĄCO wg demandPercentage", async () => {
		// findMany zwraca w kolejności losowej — funkcja MUSI posortować.
		findMany.mockResolvedValue([
			{ competencyName: "Docker", demandPercentage: 20, category: "DevOps" },
			{ competencyName: "SQL", demandPercentage: 90, category: "Dane" },
			{ competencyName: "Python", demandPercentage: 50, category: "Język" },
		]);
		const out = await loadMarketCatalog("Data Analyst");
		expect(out.map((i) => i.competencyName)).toEqual(["SQL", "Python", "Docker"]);
		expect(out.map((i) => i.demandPercentage)).toEqual([90, 50, 20]);
		expect(findMany).toHaveBeenCalledOnce();
	});

	it("katalog pusty (brak danych rynku dla ścieżki) → []", async () => {
		findMany.mockResolvedValue([]);
		expect(await loadMarketCatalog("Nieistniejąca")).toEqual([]);
	});
});
