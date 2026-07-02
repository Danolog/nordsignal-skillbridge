// @vitest-environment node
//
// Test integracyjny ingestu projektów Data Scientist (partia 1, fazy E–F) — na BAZIE TESTOWEJ.
//
// Wzorzec 1:1 z content-cyber-projects.integration.test.ts — strażnik isLocalTestDb pomija
// test, gdy DATABASE_URL nie wskazuje lokalnej bazy testowej (brak kontenera → SKIP, nie fail).
// Biega w projekcie INTEGRATION (pnpm test:integration / job `integration` w CI), NIE w test:run.
//
// URUCHOMIENIE (lokalnie):
//   docker compose -f docker-compose.test.yml up -d      # Postgres testowy (localhost:5433)
//   pnpm db:migrate:test                                 # schemat na bazę testową
//   DATABASE_URL=postgres://...@localhost:5433/test pnpm test:integration
//
// CO TESTUJEMY (sedno E2/E3 dla DS):
//   1. Uogólnione narzędzie waliduje nazwy DS wobec liści ścieżki „Data Scientist" (0 literówek).
//   2. UPSERT katalogu keyed-by-slug — 10 projektów DS WSTAWIONYCH do `projects` + kompetencje.
//   3. Idempotencja — drugi ingest = ten sam stan (10 projektów), nie duplikuje.
//   4. Matcher (deterministyczny rdzeń przed LLM) WYNOSI projekty DS dla syntetycznego studenta
//      DS z lukami (EDA / Databricks / A-B testing / Python) — dowód pokrycia dopasowania.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type CyberProjectInput,
	findUnknownCompetencies,
	getPathLeafNames,
	ingestCyberProjects,
} from "../content-cyber-projects";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

const DS_PATH_LABEL = "Data Scientist";

function loadDsProjects(): CyberProjectInput[] {
	const path = resolve(__dirname, "../content/ds-projects-partia-1.json");
	return JSON.parse(readFileSync(path, "utf8")) as CyberProjectInput[];
}

/**
 * Deterministyczny rdzeń matchera (kopia scoringu z src/lib/ai/match-projects.ts, l. 44–66):
 * dopasowanie luki (gapMatch) + nakładka prereqów. To ta część decyduje, które projekty
 * w ogóle trafią do LLM — testujemy ją bez wywołania modelu (bez klucza API / sieci).
 */
type ProjRow = {
	id: string;
	slug: string;
	title: string;
	competencies: Array<{ competencyName: string; role: string }>;
};
function keywordScore(project: ProjRow, gapName: string, acquiredNames: string[]): number {
	const g = gapName.toLowerCase();
	const projCompNames = project.competencies.map((c) => c.competencyName.toLowerCase());
	const gapMatch = projCompNames.some((name) => name.includes(g) || g.includes(name)) ? 40 : 0;
	const requiredComps = project.competencies
		.filter((c) => c.role === "required")
		.map((c) => c.competencyName.toLowerCase());
	const overlapCount = requiredComps.filter((name) =>
		acquiredNames.some((a) => a.includes(name) || name.includes(a)),
	).length;
	const overlapScore =
		requiredComps.length > 0 ? Math.round((overlapCount / requiredComps.length) * 30) : 0;
	return gapMatch + overlapScore;
}

let pool: Pool | undefined;
// biome-ignore lint/suspicious/noExplicitAny: db drizzle z connection stringa.
let db: any;

async function cleanup(): Promise<void> {
	// ON DELETE CASCADE z projects sprząta project_competencies / resources / links.
	await pool?.query("DELETE FROM projects WHERE slug LIKE 'ds-%'");
}

beforeAll(async () => {
	if (!isLocalTestDb) return;
	pool = new Pool({ connectionString: DATABASE_URL });

	const t = await pool.query("SELECT to_regclass('public.projects') AS reg");
	if (!t.rows[0]?.reg) {
		throw new Error("Baza testowa bez tabeli projects — uruchom: pnpm db:migrate:test");
	}

	const { drizzle } = await import("drizzle-orm/node-postgres");
	const schema = await import("../../src/lib/db/schema");
	db = drizzle(DATABASE_URL, { schema });

	await cleanup();
}, 30_000);

afterAll(async () => {
	if (pool) {
		await cleanup();
		await pool.end();
	}
});

d("E–F ingest DS — walidacja nazw wobec liści ścieżki DS", () => {
	it("wszystkie nazwy kompetencji są liśćmi ścieżki DS (0 literówek)", () => {
		const leaves = getPathLeafNames(DS_PATH_LABEL);
		const bad = loadDsProjects().flatMap((p) => findUnknownCompetencies(p, leaves, DS_PATH_LABEL));
		expect(bad).toEqual([]);
	});
});

d("E–F ingest DS — upsert + pokrycie kompetencji", () => {
	it("pierwszy ingest WSTAWIA 10 projektów DS do katalogu", async () => {
		const report = await ingestCyberProjects(db, loadDsProjects());
		expect(report.inserted).toBe(10);
		expect(report.failed).toBe(0);

		const n = await pool?.query("SELECT count(*)::int AS n FROM projects WHERE slug LIKE 'ds-%'");
		expect(n?.rows[0].n).toBe(10);
	});

	it("drugi ingest = ten sam stan (idempotencja: UPDATE, nie duplikuje)", async () => {
		const report = await ingestCyberProjects(db, loadDsProjects());
		expect(report.inserted).toBe(0);
		expect(report.updated).toBe(10);

		const n = await pool?.query("SELECT count(*)::int AS n FROM projects WHERE slug LIKE 'ds-%'");
		expect(n?.rows[0].n).toBe(10);
	});
});

d("E–F matcher — projekty DS dla syntetycznego studenta DS z lukami", () => {
	async function loadIngestedDsRows(): Promise<ProjRow[]> {
		const rows = await pool?.query(
			`SELECT p.id, p.slug, p.title,
			        coalesce(json_agg(json_build_object('competencyName', pc.competency_name, 'role', pc.role))
			                 FILTER (WHERE pc.id IS NOT NULL), '[]') AS competencies
			   FROM projects p
			   LEFT JOIN project_competencies pc ON pc.project_id = p.id
			  WHERE p.slug LIKE 'ds-%'
			  GROUP BY p.id`,
		);
		return (rows?.rows ?? []) as ProjRow[];
	}

	// Student DS: ma już Python/Pandas, luki wskazują na konkretne liście DS.
	const acquired = ["python", "pandas"];
	const cases: Array<{ gap: string; expectSlug: string }> = [
		{ gap: "EDA", expectSlug: "ds-eda-polska-w-liczbach-bdl" },
		{ gap: "Databricks", expectSlug: "ds-databricks-pyspark-taxi" },
		{ gap: "A/B testing", expectSlug: "ds-eksperyment-ab-memo" },
		{ gap: "Uczenie maszynowe", expectSlug: "ds-pierwszy-model-predykcyjny" },
	];

	for (const { gap, expectSlug } of cases) {
		it(`luka "${gap}" → projekt DS "${expectSlug}" w topie kandydatów matchera`, async () => {
			const projs = await loadIngestedDsRows();
			expect(projs.length).toBe(10);

			const ranked = projs
				.map((p) => ({ slug: p.slug, score: keywordScore(p, gap, acquired) }))
				.sort((a, b) => b.score - a.score);

			const target = ranked.find((r) => r.slug === expectSlug);
			// Projekt domykający lukę musi dostać punkt za dopasowanie luki (gapMatch = 40).
			expect(target, `brak ${expectSlug} wśród kandydatów`).toBeDefined();
			expect(
				target?.score,
				`${expectSlug} nie dostał punktu za lukę "${gap}"`,
			).toBeGreaterThanOrEqual(40);
			// I musi być w top-20 (to zbiór trafiający do LLM w matcherze).
			const top20 = ranked.slice(0, 20).map((r) => r.slug);
			expect(top20).toContain(expectSlug);
		});
	}
});
