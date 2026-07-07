/**
 * 1.0 — Ingest modelu kariery do DB (career-model.json → career_model_versions).
 *
 * Wgrywa DOKŁADNE bajty artefaktu ETL jako nową wersję i przełącza is_active
 * w JEDNEJ transakcji (albo nowy komplet, albo stary stan bez zmian).
 * Idempotentny: gdy aktywna wersja ma ten sam SHA-256 — no-op z komunikatem.
 * Gdy wiersz z tym checksumem istnieje, ale nie jest aktywny — tylko przełącza.
 *
 * Guard assertTestDb (wzorzec db-guard-migrate): host lokalny przechodzi;
 * zdalny (prod/Neon) wymaga CONFIRM_PROD_DB=1 — na prodzie odpala Darek
 * [CZERWONA LINIA], po backupie gałęzią Neona:
 *   CONFIRM_PROD_DB=1 pnpm db:ingest-career-model
 *
 * Kolejność na prod (lekcja „migracja przed deploy"): najpierw migracja 0022,
 * potem ten ingest, dopiero potem włączanie flagi FLAG_CAREER_MODEL_FROM_DB.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";
import { assertTestDb } from "./assert-test-db";

config({ path: ".env.local" });
config({ path: ".env" });

const ARTIFACT_PATH = join(process.cwd(), "src", "lib", "db", "data", "career-model.json");

async function main(): Promise<void> {
	assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");

	// Bajty 1:1 (utf8 string — dokładnie to, co porówna test bajtowej identyczności).
	const content = readFileSync(ARTIFACT_PATH, "utf8");
	const checksum = createHash("sha256").update(content, "utf8").digest("hex");

	const meta = JSON.parse(content) as { _meta?: { snapshot?: string; source?: string } };
	const snapshot = meta._meta?.snapshot ?? "unknown";
	const source = meta._meta?.source ?? "unknown";

	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const active = await client.query<{ id: string; checksum: string }>(
			"SELECT id, checksum FROM career_model_versions WHERE is_active = true",
		);
		if (active.rows[0]?.checksum === checksum) {
			await client.query("ROLLBACK");
			console.log(
				`[ingest-career-model] Aktywna wersja już aktualna (sha256 ${checksum.slice(0, 12)}…) — no-op.`,
			);
			return;
		}

		const existing = await client.query<{ id: string }>(
			"SELECT id FROM career_model_versions WHERE checksum = $1",
			[checksum],
		);

		// Wyłącz starą wersję PRZED aktywacją nowej (częściowy unikalny indeks
		// dopuszcza jeden aktywny wiersz w każdym punkcie transakcji).
		await client.query("UPDATE career_model_versions SET is_active = false WHERE is_active = true");

		if (existing.rows[0]) {
			await client.query("UPDATE career_model_versions SET is_active = true WHERE id = $1", [
				existing.rows[0].id,
			]);
			console.log(
				`[ingest-career-model] Wersja sha256 ${checksum.slice(0, 12)}… już istniała — przełączono na aktywną.`,
			);
		} else {
			await client.query(
				`INSERT INTO career_model_versions (snapshot, source, checksum, content, is_active)
				 VALUES ($1, $2, $3, $4, true)`,
				[snapshot, source, checksum, content],
			);
			console.log(
				`[ingest-career-model] Wgrano nową aktywną wersję: snapshot ${snapshot}, źródło ${source}, ` +
					`sha256 ${checksum.slice(0, 12)}…, ${content.length} bajtów.`,
			);
		}

		await client.query("COMMIT");
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((err) => {
	console.error("[ingest-career-model] BŁĄD:", err instanceof Error ? err.message : err);
	process.exit(1);
});
