// @vitest-environment node
//
// 1.0 — TEST AKCEPTACYJNY: model kariery z DB bajtowo identyczny z JSON w repo.
//
// Realna baza testowa (Docker :5433, po db:migrate:test). Przebieg:
//  (1) ingest (tools/ingest-career-model.ts przez tsx) → aktywny wiersz,
//  (2) content z DB === bajty pliku (strict equal) + sha256 się zgadza,
//  (3) drugi ingest = no-op (idempotencja, wciąż 1 wiersz, 1 aktywny),
//  (4) rola app_student może czytać (GRANT SELECT z migracji 0022).
//
// Wzorzec strażnika jak w pozostałych *.integration.test.ts: bez lokalnej bazy
// testy się pomijają (druga linia obrony po projekcie vitest `integration`).

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const dBack = isLocalTestDb ? describe : describe.skip;

const ARTIFACT_PATH = join(process.cwd(), "src", "lib", "db", "data", "career-model.json");

function runIngest(): string {
	return execSync("pnpm exec tsx tools/ingest-career-model.ts", {
		env: process.env,
		encoding: "utf8",
	});
}

dBack("1.0 · career_model_versions (realna baza)", () => {
	let pool: Pool;

	beforeAll(async () => {
		pool = new Pool({ connectionString: DATABASE_URL });
		// Czysty stan tabeli — test jest jedynym właścicielem tych wierszy.
		await pool.query("DELETE FROM career_model_versions");
		runIngest();
	}, 60_000);

	afterAll(async () => {
		await pool?.end();
	});

	it("AKCEPTACJA: content aktywnego wiersza bajtowo identyczny z career-model.json", async () => {
		const fileContent = readFileSync(ARTIFACT_PATH, "utf8");
		const { rows } = await pool.query<{ content: string; checksum: string }>(
			"SELECT content, checksum FROM career_model_versions WHERE is_active = true",
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].content === fileContent).toBe(true);
		expect(rows[0].content.length).toBe(fileContent.length);
		const expectedSha = createHash("sha256").update(fileContent, "utf8").digest("hex");
		expect(rows[0].checksum).toBe(expectedSha);
	});

	it("metadane wersji pochodzą z _meta artefaktu", async () => {
		const meta = (
			JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as {
				_meta: { snapshot: string; source: string };
			}
		)._meta;
		const { rows } = await pool.query<{ snapshot: string; source: string }>(
			"SELECT snapshot, source FROM career_model_versions WHERE is_active = true",
		);
		expect(rows[0].snapshot).toBe(meta.snapshot);
		expect(rows[0].source).toBe(meta.source);
	});

	it("drugi ingest jest idempotentny (no-op, wciąż jeden wiersz, jeden aktywny)", async () => {
		const output = runIngest();
		expect(output).toContain("no-op");
		const { rows } = await pool.query<{ total: string; active: string }>(
			"SELECT count(*)::text AS total, count(*) FILTER (WHERE is_active)::text AS active FROM career_model_versions",
		);
		expect(rows[0].total).toBe("1");
		expect(rows[0].active).toBe("1");
	});

	it("rola app_student może czytać (GRANT SELECT z 0022)", async () => {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			await client.query("SET LOCAL ROLE app_student");
			const { rows } = await client.query<{ n: string }>(
				"SELECT count(*)::text AS n FROM career_model_versions WHERE is_active = true",
			);
			expect(rows[0].n).toBe("1");
			await client.query("ROLLBACK");
		} finally {
			client.release();
		}
	});
});
