import { describe, expect, it } from "vitest";
import { DEMO_CAREER_GOAL_REMAP } from "../data/anchor-config";
// Dane rynku pracy = artefakt JustJoinIT (Partia 3, model nearest-profile #11),
// który ładuje seed.ts. Testujemy realny artefakt, nie zduplikowane na sztywno
// liczby — inaczej test nie chroni przed regresją w faktycznym seedzie (lens
// Ethana: prowenicja danych).
import jobMarket from "../data/job-market-justjoinit.json";
import { DEMO_PROJECTS } from "../seed-projects";

const DATA = jobMarket.data;
const goals = DATA.map((e) => e.careerGoal);

describe("Seed job market — struktura (artefakt JustJoinIT)", () => {
	it("liczba ścieżek zgadza się z _meta.paths (model nearest-profile)", () => {
		expect(DATA.length).toBe(jobMarket._meta.paths);
		expect(DATA.length).toBeGreaterThan(0);
	});

	it("każda ścieżka ma ≥1 kompetencję (przeszła progi odcięcia)", () => {
		for (const entry of DATA) {
			expect(entry.competencies.length, `${entry.careerGoal} bez kompetencji`).toBeGreaterThan(0);
		}
	});

	it("nazwy ścieżek są unikalne", () => {
		expect(new Set(goals).size).toBe(goals.length);
	});

	it("każdy cel remapowania demo wskazuje na ścieżkę istniejącą w artefakcie", () => {
		// Migracja demo-studentów (anchor-config) musi celować w realne ścieżki —
		// inaczej dashboard studenta nie znajdzie danych rynku dla jego celu.
		for (const target of Object.values(DEMO_CAREER_GOAL_REMAP)) {
			expect(goals, `remap → "${target}" nie istnieje w artefakcie`).toContain(target);
		}
	});
});

describe("Seed job market — treść kompetencji (dowód z danych)", () => {
	function topNames(goal: string): string[] {
		return DATA.find((e) => e.careerGoal === goal)?.competencies.map((c) => c.name) ?? [];
	}

	it("Java Developer ma Java jako top kompetencję", () => {
		expect(topNames("Java Developer")[0]).toBe("Java");
	});

	it("Data Scientist zawiera liście Python i SQL (Machine Learning to OBSZAR, w hierarchii)", () => {
		// v4.0: płaski artefakt jobMarketData trzyma LIŚCIE-konkrety. „Machine Learning"
		// to obszar wiedzy (knowledge-area) — żyje w career-model.json, nie tu.
		const names = topNames("Data Scientist");
		expect(names).toContain("Python");
		expect(names).toContain("SQL");
	});

	it("DevOps Engineer zawiera Kubernetes i Terraform", () => {
		const names = topNames("DevOps Engineer");
		expect(names).toContain("Kubernetes");
		expect(names).toContain("Terraform");
	});
});

describe("Seed job market — demand percentages", () => {
	it("wszystkie demandPercentage w zakresie 0–100", () => {
		for (const entry of DATA) {
			for (const c of entry.competencies) {
				expect(c.demandPercentage).toBeGreaterThanOrEqual(0);
				expect(c.demandPercentage).toBeLessThanOrEqual(100);
			}
		}
	});
});

describe("Seed job market — v5: BEZ widełek (decyzja Darka)", () => {
	it("żaden wiersz kompetencji NIE ma już pola salaryRange", () => {
		for (const entry of DATA) {
			for (const c of entry.competencies) {
				expect(c, `${entry.careerGoal}/${c.name}`).not.toHaveProperty("salaryRange");
			}
		}
	});
});

describe("Seed data — projects", () => {
	it("has exactly 30 projects", () => {
		expect(DEMO_PROJECTS).toHaveLength(30);
	});

	it("each project has at least 2 competencies", () => {
		for (const proj of DEMO_PROJECTS) {
			expect(
				proj.competencies.length,
				`${proj.slug} should have >= 2 competencies`,
			).toBeGreaterThanOrEqual(2);
		}
	});

	it("has correct level distribution: 12 L1, 12 L2, 6 L3", () => {
		const l1 = DEMO_PROJECTS.filter((p) => p.level === "L1").length;
		const l2 = DEMO_PROJECTS.filter((p) => p.level === "L2").length;
		const l3 = DEMO_PROJECTS.filter((p) => p.level === "L3").length;
		expect(l1).toBe(12);
		expect(l2).toBe(12);
		expect(l3).toBe(6);
	});

	it("has correct source type distribution: 21 open_data, 9 oss", () => {
		const openData = DEMO_PROJECTS.filter((p) => p.sourceType === "open_data").length;
		const oss = DEMO_PROJECTS.filter((p) => p.sourceType === "oss").length;
		expect(openData).toBe(21);
		expect(oss).toBe(9);
	});

	it("each sourceUrl starts with https://", () => {
		for (const proj of DEMO_PROJECTS) {
			expect(proj.sourceUrl, `${proj.slug} sourceUrl should start with https://`).toMatch(
				/^https:\/\//,
			);
		}
	});

	it("each project has a unique slug", () => {
		const slugs = DEMO_PROJECTS.map((p) => p.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("each project has rubricJson with 3-5 criteria", () => {
		for (const proj of DEMO_PROJECTS) {
			expect(proj.rubricJson.length, `${proj.slug} rubric`).toBeGreaterThanOrEqual(3);
			expect(proj.rubricJson.length, `${proj.slug} rubric`).toBeLessThanOrEqual(5);
		}
	});
});
