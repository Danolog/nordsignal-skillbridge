// @vitest-environment node
//
// Test integracyjny narzędzia ingestu projektów cyber (E2, Leo) — na BAZIE TESTOWEJ.
//
// Wzorzec: brief-error-handling.integration / b3 — strażnik isLocalTestDb pomija test,
// gdy DATABASE_URL nie wskazuje na lokalną bazę testową (brak kontenera → SKIP, nie fail).
// Biega w projekcie INTEGRATION (pnpm test:integration / job `integration` w CI), NIE w test:run.
//
// CO TESTUJEMY (sedno E2):
//   1. UPSERT katalogu keyed-by-slug — projekt cyber WSTAWIONY do `projects` (był 0 cyber).
//   2. Pokrycie luk — kompetencje w `project_competencies` po nazwie + roli (required/acquired).
//   3. Idempotencja — drugi ingest = ten sam stan (1 projekt, te same kompetencje), nie duplikuje.
//   4. Bramka jakości — walidator odrzuca nazwę kompetencji spoza liści cyber (literówka).

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type CyberProjectInput,
	findUnknownCompetencies,
	ingestCyberProjects,
} from "../content-cyber-projects";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

// Dedykowany slug testowy (izolacja od realnych projektów cyber z E3).
const TEST_SLUG = "cyber-test-e2-siem-skeleton";

function skeleton(): CyberProjectInput {
	return {
		slug: TEST_SLUG,
		title: "E2 test — SIEM skeleton",
		description: "Projekt testowy E2 (idempotencja upsertu).",
		level: "L1",
		estimatedHours: 5,
		sourceType: "open_data",
		sourceUrl: "https://example.com/splunk-lab",
		rubricJson: [
			{ criterion: "Import logów", weight: 50, description: "..." },
			{ criterion: "Reguła alertu", weight: 50, description: "..." },
		],
		competencies: [
			{ name: "SIEM", role: "required" },
			{ name: "SOC", role: "required" },
			{ name: "Splunk", role: "required" },
			{ name: "Linux", role: "acquired" },
		],
	};
}

let pool: Pool | undefined;
// drizzle budowany leniwie w testach (import dynamiczny — node-postgres).
// biome-ignore lint/suspicious/noExplicitAny: db drizzle z connection stringa.
let db: any;

async function cleanup(): Promise<void> {
	// ON DELETE CASCADE z projects sprząta project_competencies / resources / links.
	await pool?.query("DELETE FROM projects WHERE slug = $1", [TEST_SLUG]);
}

beforeAll(async () => {
	if (!isLocalTestDb) return;
	pool = new Pool({ connectionString: DATABASE_URL });

	// Precheck: tabela projects musi istnieć (migracje zastosowane). Czytelny fail setupu.
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

d("E2 ingest cyber — upsert + pokrycie kompetencji", () => {
	it("pierwszy ingest WSTAWIA projekt do katalogu (po slug) + kompetencje (nazwa+rola)", async () => {
		const report = await ingestCyberProjects(db, [skeleton()]);
		expect(report.inserted).toBe(1);
		expect(report.updated).toBe(0);
		expect(report.failed).toBe(0);

		// Projekt w `projects` po slug.
		const proj = await pool?.query("SELECT id, level, source_type FROM projects WHERE slug = $1", [
			TEST_SLUG,
		]);
		expect(proj?.rows.length).toBe(1);
		expect(proj?.rows[0].level).toBe("L1");
		expect(proj?.rows[0].source_type).toBe("open_data");

		// Kompetencje w `project_competencies` po nazwie + roli.
		const comps = await pool?.query(
			`SELECT competency_name, role FROM project_competencies
			 WHERE project_id = $1 ORDER BY competency_name`,
			[proj?.rows[0].id],
		);
		expect(comps?.rows.length).toBe(4);
		const byName = new Map(comps?.rows.map((r) => [r.competency_name, r.role]));
		expect(byName.get("SIEM")).toBe("required");
		expect(byName.get("Splunk")).toBe("required");
		expect(byName.get("Linux")).toBe("acquired");
	});

	it("drugi ingest = ten sam stan (idempotencja: UPDATE, nie duplikuje)", async () => {
		const report = await ingestCyberProjects(db, [skeleton()]);
		expect(report.inserted).toBe(0);
		expect(report.updated).toBe(1);

		// Nadal DOKŁADNIE 1 projekt o tym slug.
		const proj = await pool?.query("SELECT id FROM projects WHERE slug = $1", [TEST_SLUG]);
		expect(proj?.rows.length).toBe(1);

		// Nadal DOKŁADNIE 4 kompetencje (replace-per-projekt nie zdublował do 8).
		const comps = await pool?.query(
			"SELECT count(*)::int AS n FROM project_competencies WHERE project_id = $1",
			[proj?.rows[0].id],
		);
		expect(comps?.rows[0].n).toBe(4);
	});
});

d("E2 bramka jakości — walidator nazw kompetencji", () => {
	it("odrzuca nazwę kompetencji spoza liści cyber (literówka)", () => {
		const bad = skeleton();
		bad.competencies = [
			{ name: "SIEM", role: "required" },
			{ name: "Splnuk", role: "required" }, // literówka — spoza zbioru liści
		];
		const msgs = findUnknownCompetencies(bad);
		expect(msgs.length).toBe(1);
		expect(msgs[0]).toMatch(/Splnuk/);
	});
});
