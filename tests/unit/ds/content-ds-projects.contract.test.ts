/**
 * Test jednostkowy kontraktu treści projektów Data Scientist (partia 1, fazy E–F).
 *
 * Pokrywa KLUCZOWĄ BRAMKĘ JAKOŚCI (ryzyko #1 z E1): każda `competencyName` w
 * `tools/content/ds-projects-partia-1.json` MUSI być dokładnym liściem ścieżki
 * „Data Scientist" z career-model.ts — literówka = cicha utrata pokrycia matchera.
 * Plus: kontrakt struktury (slug/level/wagi=100/role) i pokrycie 23/24 liści
 * jako `required` (Snowflake świadomie poza — QG-5.5, spec §4).
 *
 * Biega w projekcie UNIT (pnpm test:run) — czysta logika, bez bazy. Importuje
 * funkcje z PRODUKCJI (tools/content-cyber-projects.ts, uogólnione o `--path`),
 * nie repliki. To always-on guard treści DS niezależny od bazy/LLM.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	type CyberProjectInput,
	findUnknownCompetencies,
	getPathLeafNames,
	validateProjectStructure,
} from "../../../tools/content-cyber-projects";

const DS_PATH_LABEL = "Data Scientist";
const dsLeaves = getPathLeafNames(DS_PATH_LABEL);

function loadDsProjects(): CyberProjectInput[] {
	const path = resolve(__dirname, "../../../tools/content/ds-projects-partia-1.json");
	return JSON.parse(readFileSync(path, "utf8")) as CyberProjectInput[];
}

const projects = loadDsProjects();

describe("getPathLeafNames('Data Scientist') — liście ścieżki DS (jedno źródło prawdy)", () => {
	it("zawiera liście grupy Fundamenty (w tym dosłownie 'Statystyka (Statistics)')", () => {
		for (const name of [
			"Statystyka (Statistics)",
			"Uczenie maszynowe",
			"EDA",
			"A/B testing",
			"Databricks",
			"PySpark",
			"Spark",
			"Kafka",
			"MLOps",
			"NLP",
			"LLM",
			"GenAI",
		]) {
			expect(dsLeaves.has(name), `brak liścia "${name}"`).toBe(true);
		}
	});

	it("ma 24 liście DS (5 grup, spec §0)", () => {
		expect(dsLeaves.size).toBe(24);
	});

	it("NIE zawiera skróconej pisowni 'Statystyka' bez dopisku", () => {
		expect(dsLeaves.has("Statystyka")).toBe(false);
		expect(dsLeaves.has("Statistics")).toBe(false); // to countAs, nie name
	});
});

describe("ds-projects-partia-1.json — kontrakt treści", () => {
	it("zawiera dokładnie 10 projektów", () => {
		expect(projects).toHaveLength(10);
	});

	it("rozkład poziomów 4×L1, 4×L2, 2×L3 (spec §0)", () => {
		const byLevel = (lvl: string) => projects.filter((p) => p.level === lvl).length;
		expect(byLevel("L1")).toBe(4);
		expect(byLevel("L2")).toBe(4);
		expect(byLevel("L3")).toBe(2);
	});

	it("każdy slug jest w prefiksie ds- i unikalny", () => {
		const slugs = projects.map((p) => p.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const s of slugs) expect(s).toMatch(/^ds-/);
	});

	it("każdy projekt przechodzi walidację struktury (wagi=100, ≥1 required, url http/https)", () => {
		for (let i = 0; i < projects.length; i++) {
			expect(validateProjectStructure(projects[i], i)).toBeNull();
		}
	});

	it("KLUCZOWA BRAMKA: wszystkie nazwy kompetencji są liśćmi ścieżki DS (0 literówek)", () => {
		for (const p of projects) {
			expect(findUnknownCompetencies(p, dsLeaves, DS_PATH_LABEL)).toEqual([]);
		}
	});
});

describe("pokrycie luk DS — 23/24 liści jako required (Snowflake świadomie poza)", () => {
	it("dokładnie jeden liść niepokryty jako required i to Snowflake", () => {
		const required = new Set<string>();
		for (const p of projects) {
			for (const c of p.competencies) {
				if (c.role === "required") required.add(c.name);
			}
		}
		const notCovered = [...dsLeaves].filter((l) => !required.has(l));
		expect(notCovered).toEqual(["Snowflake"]);
	});
});
