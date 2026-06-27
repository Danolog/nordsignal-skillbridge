// @vitest-environment node
/**
 * Partia 5 ETAP B — złączenie płaskiego katalogu z hierarchią career-model.json
 * (competency-groups.ts). Test na REALNYM artefakcie (pilot cyber + kontrola Java):
 *   • enrichWithKind (B1) — dokłada kind, nie mutuje, nie zmienia kolejności/liczby,
 *   • buildCatalogGroups (B2) — grupy z kontekstem; niezmiennik suma==płaska lista,
 *   • getCompetencyContext (B3) — opis grupy + unionShare + kind po nazwie.
 * Zero DB, zero modelu (Built-to-Sell — deterministyczne).
 */

import { describe, expect, it } from "vitest";
import {
	buildCatalogGroups,
	enrichWithKind,
	getCompetencyContext,
} from "@/lib/onboarding/competency-groups";
import type { MarketCatalogItem } from "@/lib/onboarding/market-catalog";

function item(name: string, demand: number, category = "x"): MarketCatalogItem {
	return { competencyName: name, demandPercentage: demand, category };
}

const CYBER = "Cybersecurity Specialist";

describe("enrichWithKind — dokłada kind z career-model.json (B1)", () => {
	it("cyber: SIEM→concept, Splunk→tool (złączenie po nazwie liścia)", () => {
		const out = enrichWithKind(CYBER, [item("SIEM", 11), item("Splunk", 4)]);
		expect(out.find((i) => i.competencyName === "SIEM")?.kind).toBe("concept");
		expect(out.find((i) => i.competencyName === "Splunk")?.kind).toBe("tool");
	});

	it("dopasowanie odporne na wielkość liter (trim + lower)", () => {
		const out = enrichWithKind(CYBER, [item("  splunk ", 4)]);
		expect(out[0].kind).toBe("tool");
	});

	it("nazwa spoza modelu → bez kind (zostaje bez zmian)", () => {
		const out = enrichWithKind(CYBER, [item("CompletelyUnknownTech", 1)]);
		expect(out[0].kind).toBeUndefined();
	});

	it("ścieżka nieznana → zwraca to samo wejście (ta sama referencja)", () => {
		const input = [item("X", 1)];
		expect(enrichWithKind("Nieistniejąca", input)).toBe(input);
	});

	it("nie mutuje wejścia, zachowuje liczbę i kolejność pozycji", () => {
		const input = [item("Splunk", 4), item("SIEM", 11)];
		const out = enrichWithKind(CYBER, input);
		expect(out.map((i) => i.competencyName)).toEqual(["Splunk", "SIEM"]);
		expect(input[0]).not.toHaveProperty("kind");
	});
});

describe("buildCatalogGroups — grupy z kontekstem (B2)", () => {
	// Płaski katalog cyber (podzbiór realnych liści, malejąco wg popytu — jak loadMarketCatalog).
	const flat = [
		item("Python", 15),
		item("SIEM", 11),
		item("Linux", 9),
		item("Splunk", 4),
		item("SQL", 4),
	];

	it("grupa ma nazwę + unionShare (number) + opis (proza); pozycje z kind", () => {
		const groups = buildCatalogGroups(CYBER, flat);
		const siem = groups.find((g) => g.name === "SIEM i Monitorowanie Zdarzeń");
		expect(siem).toBeDefined();
		expect(typeof siem?.unionShare).toBe("number");
		expect(siem?.description).toContain("Blue Team");
		expect(siem?.items.find((i) => i.competencyName === "SIEM")?.kind).toBe("concept");
		expect(siem?.items.find((i) => i.competencyName === "Splunk")?.kind).toBe("tool");
	});

	it("niezmiennik: liczba i zbiór items grup == płaska lista (nic nie ginie, nic się nie dubluje)", () => {
		const groups = buildCatalogGroups(CYBER, flat);
		const back = groups.flatMap((g) => g.items.map((i) => i.competencyName));
		expect(back).toHaveLength(flat.length);
		expect(back.slice().sort()).toEqual(flat.map((i) => i.competencyName).sort());
	});

	it("grupy w kolejności modelu; pozycja kotwiczy w swojej grupie", () => {
		const groups = buildCatalogGroups(CYBER, flat);
		const prog = groups.find((g) => g.name === "Programowanie i automatyzacja");
		expect(prog?.items.map((i) => i.competencyName)).toEqual(["Python"]);
	});

	it("pozycja spoza modelu → grupa Pozostałe (unionShare/opis null, suma zachowana)", () => {
		const groups = buildCatalogGroups(CYBER, [item("SIEM", 11), item("ObcaTech", 2)]);
		const left = groups.find((g) => g.name === "Pozostałe");
		expect(left?.items.map((i) => i.competencyName)).toEqual(["ObcaTech"]);
		expect(left?.unionShare).toBeNull();
		expect(left?.description).toBeNull();
	});

	it("ścieżka nieznana → []", () => {
		expect(buildCatalogGroups("Nieistniejąca", flat)).toEqual([]);
	});

	it("ścieżka bez prozy-opisów (Java) → grupy z description null (kontrola: tylko cyber ma opis)", () => {
		const groups = buildCatalogGroups("Java Developer", [
			item("Java", 81),
			item("Spring Boot", 48),
		]);
		expect(groups.length).toBeGreaterThan(0);
		for (const g of groups) expect(g.description).toBeNull();
	});
});

describe("getCompetencyContext — kontekst panelu studenta (B3)", () => {
	it("zwraca grupę + opis + unionShare + kind po nazwie kompetencji", () => {
		const ctx = getCompetencyContext(CYBER, "Splunk");
		expect(ctx?.groupName).toBe("SIEM i Monitorowanie Zdarzeń");
		expect(ctx?.groupDescription).toContain("Splunk");
		expect(typeof ctx?.unionShare).toBe("number");
		expect(ctx?.kind).toBe("tool");
	});

	it("normalizacja nazwy (case-insensitive + trim)", () => {
		expect(getCompetencyContext(CYBER, "  SIEM ")?.kind).toBe("concept");
	});

	it("kompetencja nieznana w ścieżce → null", () => {
		expect(getCompetencyContext(CYBER, "ObcaTech")).toBeNull();
	});

	it("ścieżka nieznana → null", () => {
		expect(getCompetencyContext("Nieistniejąca", "Splunk")).toBeNull();
	});

	it("liść w dwóch obszarach (Swagger w Java) → pierwszy obszar w kolejności modelu (determinizm)", () => {
		expect(getCompetencyContext("Java Developer", "Swagger")?.groupName).toBe(
			"Konteneryzacja i integracja",
		);
	});
});
