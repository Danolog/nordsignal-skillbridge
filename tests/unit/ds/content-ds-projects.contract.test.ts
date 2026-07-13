/**
 * Test jednostkowy kontraktu treści projektów Data Scientist (partie 1, 1r, 2 — fazy E–F).
 *
 * Pokrywa KLUCZOWĄ BRAMKĘ JAKOŚCI (ryzyko #1 z E1): każda `competencyName` w plikach
 * `tools/content/ds-projects-partia-*.json` MUSI być dokładnym liściem ścieżki
 * „Data Scientist" z career-model.ts — literówka = cicha utrata pokrycia matchera.
 * Plus: kontrakt struktury (slug/level/wagi=100/role), twarde wymogi QG-5 §5 dla
 * projektów chmurowych z kartą i pokrycie 23/24 liści jako `required` (Snowflake
 * świadomie poza — QG-5.5, spec §4).
 *
 * SEMANTYKA KATALOGU EFEKTYWNEGO (last-wins po slugu): ingest upsertuje po slugu,
 * a partia 1r CELOWO nadpisuje 5 slugów partii 1 (partia naprawcza 1E.R). Asercje
 * pokrycia i rozkładu liczymy więc na katalogu EFEKTYWNYM (późniejszy plik wygrywa),
 * nie na sumie plików. Kolejność plików = sort leksykograficzny nazw — działa dla
 * partia-1 < partia-1r < partia-2; przy partii ≥10 trzeba przejść na sort numeryczny.
 *
 * Biega w projekcie UNIT (pnpm test:run) — czysta logika, bez bazy. Importuje
 * funkcje z PRODUKCJI (tools/content-cyber-projects.ts, uogólnione o `--path`),
 * nie repliki. To always-on guard treści DS niezależny od bazy/LLM.
 */
import { readdirSync, readFileSync } from "node:fs";
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

const CONTENT_DIR = resolve(__dirname, "../../../tools/content");

/** Wszystkie pliki partii DS w kolejności ingestu (leksykograficznie). */
function listBatchFiles(): string[] {
	return readdirSync(CONTENT_DIR)
		.filter((f) => /^ds-projects-partia-.+\.json$/.test(f))
		.sort();
}

function loadBatch(file: string): CyberProjectInput[] {
	return JSON.parse(readFileSync(resolve(CONTENT_DIR, file), "utf8")) as CyberProjectInput[];
}

/** Katalog efektywny: upsert po slugu w kolejności plików (last-wins). */
function effectiveCatalog(batches: Map<string, CyberProjectInput[]>): CyberProjectInput[] {
	const bySlug = new Map<string, CyberProjectInput>();
	for (const projects of batches.values()) {
		for (const p of projects) bySlug.set(p.slug, p);
	}
	return [...bySlug.values()];
}

const batchFiles = listBatchFiles();
const batches = new Map(batchFiles.map((f) => [f, loadBatch(f)]));
const catalog = effectiveCatalog(batches);

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

describe("pliki partii ds-projects-partia-*.json — kontrakt per plik", () => {
	it("znalezione są dokładnie trzy partie: 1, 1r, 2 (w tej kolejności ingestu)", () => {
		expect(batchFiles).toEqual([
			"ds-projects-partia-1.json",
			"ds-projects-partia-1r.json",
			"ds-projects-partia-2.json",
		]);
	});

	for (const file of batchFiles) {
		describe(file, () => {
			const projects = batches.get(file) ?? [];

			it("sluggi w prefiksie ds- i unikalne WEWNĄTRZ pliku", () => {
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
	}

	it("partia 1r nadpisuje WYŁĄCZNIE sluggi istniejące w partii 1 (partia naprawcza)", () => {
		const p1 = new Set((batches.get("ds-projects-partia-1.json") ?? []).map((p) => p.slug));
		for (const p of batches.get("ds-projects-partia-1r.json") ?? []) {
			expect(p1.has(p.slug), `1r zawiera slug "${p.slug}" spoza partii 1`).toBe(true);
		}
	});

	it("partia 2 wprowadza WYŁĄCZNIE nowe sluggi (nic nie nadpisuje)", () => {
		const earlier = new Set(
			["ds-projects-partia-1.json", "ds-projects-partia-1r.json"].flatMap((f) =>
				(batches.get(f) ?? []).map((p) => p.slug),
			),
		);
		for (const p of batches.get("ds-projects-partia-2.json") ?? []) {
			expect(earlier.has(p.slug), `partia 2 nadpisuje istniejący slug "${p.slug}"`).toBe(false);
		}
	});
});

describe("katalog efektywny (last-wins po slugu) — rozkład i pokrycie", () => {
	it("zawiera dokładnie 13 projektów (10 z partii 1/1r + 3 chmurowe z partii 2)", () => {
		expect(catalog).toHaveLength(13);
	});

	it("rozkład poziomów 4×L1, 7×L2, 2×L3 (spec partii 1 §0 + spec partii 2)", () => {
		const byLevel = (lvl: string) => catalog.filter((p) => p.level === lvl).length;
		expect(byLevel("L1")).toBe(4);
		expect(byLevel("L2")).toBe(7);
		expect(byLevel("L3")).toBe(2);
	});

	it("pokrycie luk DS: dokładnie jeden liść niepokryty jako required i to Snowflake", () => {
		const required = new Set<string>();
		for (const p of catalog) {
			for (const c of p.competencies) {
				if (c.role === "required") required.add(c.name);
			}
		}
		const notCovered = [...dsLeaves].filter((l) => !required.has(l));
		expect(notCovered).toEqual(["Snowflake"]);
	});
});

describe("Blok B — chmury hands-on (partia 2) i przełożenie ról w ds-chmura (B3)", () => {
	const CLOUD_PROJECTS: Record<string, string> = {
		"ds-endpoint-azure": "Azure",
		"ds-endpoint-gcp": "GCP",
		"ds-endpoint-aws": "AWS",
	};

	for (const [slug, cloud] of Object.entries(CLOUD_PROJECTS)) {
		describe(slug, () => {
			const project = catalog.find((p) => p.slug === slug);

			it("istnieje w katalogu efektywnym, poziom L2 w widełkach QG-2 (8–14 h)", () => {
				expect(project).toBeDefined();
				expect(project?.level).toBe("L2");
				expect(project?.estimatedHours).toBeGreaterThanOrEqual(8);
				expect(project?.estimatedHours).toBeLessThanOrEqual(14);
			});

			it(`required = dokładnie {${cloud}, MLOps}; acquired = Python/Git/Uczenie maszynowe`, () => {
				const required = project?.competencies.filter((c) => c.role === "required") ?? [];
				expect(new Set(required.map((c) => c.name))).toEqual(new Set([cloud, "MLOps"]));
				const acquired = project?.competencies.filter((c) => c.role === "acquired") ?? [];
				expect(new Set(acquired.map((c) => c.name))).toEqual(
					new Set(["Python", "Git", "Uczenie maszynowe"]),
				);
			});

			it("QG-5 §5: klauzula karty w PIERWSZYM zdaniu description (wyłącznie weryfikacja tożsamości)", () => {
				const firstSentence = (project?.description ?? "").split(/(?<=[.!?])\s/, 1)[0];
				expect(firstSentence.toLowerCase()).toContain("kart");
				expect(firstSentence.toLowerCase()).toContain("wyłącznie");
			});

			it("QG-5 §5: source_links zawiera link do panelu budżetu/alertów platformy", () => {
				const labels = (project?.source_links ?? []).map((l) => (l.label ?? "").toLowerCase());
				expect(
					labels.some((l) => l.includes("budżet") || l.includes("budget")),
					`brak linku do panelu budżetu w source_links projektu ${slug}`,
				).toBe(true);
			});
		});
	}

	it("B3: ds-chmura-wdrozenie-modelu bez chmur w required; CI/CD i MLOps jako required", () => {
		const project = catalog.find((p) => p.slug === "ds-chmura-wdrozenie-modelu");
		expect(project).toBeDefined();
		const required = new Set(
			project?.competencies.filter((c) => c.role === "required").map((c) => c.name),
		);
		expect(required).toEqual(new Set(["CI/CD", "MLOps"]));
		for (const cloud of ["Azure", "GCP", "AWS"]) {
			expect(
				project?.competencies.some((c) => c.name === cloud),
				`ds-chmura nie powinien już przyznawać liścia ${cloud}`,
			).toBe(false);
		}
	});
});
