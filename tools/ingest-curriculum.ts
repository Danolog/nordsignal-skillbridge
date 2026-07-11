/**
 * 1E.1c — Ingest struktury drabiny curriculum (curriculum-ds-drabina.json → DB).
 *
 * IDEMPOTENTNY (drugi bieg = identyczny stan):
 *  - moduły: upsert po slug (title/description/updated_at),
 *  - pozycje: upsert po (module_id, position) — NIGDY nie kasuje pozycji
 *    (mogą mieć postęp studentów; usunięcie pozycji = świadoma migracja,
 *    nie ingest),
 *  - path_modules + prereqs: DELETE per ścieżka/moduły + reinsert (czyste
 *    definicje bez FK od danych studenta; prereqi = ŁAŃCUCH z kolejności).
 * Wszystko w JEDNEJ transakcji.
 *
 * Guard assertTestDb (wzorzec ingest-career-model): host lokalny przechodzi;
 * zdalny (prod/Neon) wymaga CONFIRM_PROD_DB=1 — na prodzie odpala Darek
 * [CZERWONA LINIA ADR-010], po backupie gałęzią Neona:
 *   CONFIRM_PROD_DB=1 pnpm db:ingest-curriculum
 *
 * Kolejność na prod (lekcja „migracja przed deploy"): najpierw migracja 0035,
 * potem ten ingest, dopiero potem FLAG_CURRICULUM_PATH=1.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";
import { assertTestDb } from "./assert-test-db";

config({ path: ".env.local" });
config({ path: ".env" });

const CONTENT_PATH = join(process.cwd(), "tools", "content", "curriculum-ds-drabina.json");

type LadderItem = {
	position: number;
	kind: string;
	title: string;
	projectSlug?: string;
	contentMd?: string;
	configJson?: Record<string, unknown>;
};
type LadderModule = { slug: string; title: string; description?: string; items: LadderItem[] };
type Ladder = { path: string; modules: LadderModule[] };

async function main(): Promise<void> {
	assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");

	const ladder = JSON.parse(readFileSync(CONTENT_PATH, "utf8")) as Ladder;
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const moduleIdBySlug = new Map<string, string>();
		let itemsUpserted = 0;

		for (const module_ of ladder.modules) {
			const { rows } = await client.query<{ id: string }>(
				`INSERT INTO curriculum_modules (slug, title, description)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (slug) DO UPDATE
				   SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now()
				 RETURNING id`,
				[module_.slug, module_.title, module_.description ?? null],
			);
			moduleIdBySlug.set(module_.slug, rows[0].id);

			for (const item of module_.items) {
				let projectId: string | null = null;
				if (item.kind === "project") {
					if (!item.projectSlug) {
						throw new Error(`Pozycja project bez projectSlug: ${module_.slug}#${item.position}`);
					}
					const project = await client.query<{ id: string }>(
						"SELECT id FROM projects WHERE slug = $1",
						[item.projectSlug],
					);
					if (project.rows.length === 0) {
						throw new Error(
							`Capstone '${item.projectSlug}' nie istnieje w projects — ingest przerwany (kontrakt)`,
						);
					}
					projectId = project.rows[0].id;
				}
				await client.query(
					`INSERT INTO curriculum_module_items
					   (module_id, position, kind, title, content_md, project_id, config_json)
					 VALUES ($1, $2, $3, $4, $5, $6, $7)
					 ON CONFLICT (module_id, position) DO UPDATE
					   SET kind = EXCLUDED.kind, title = EXCLUDED.title,
					       content_md = EXCLUDED.content_md, project_id = EXCLUDED.project_id,
					       config_json = EXCLUDED.config_json, updated_at = now()`,
					[
						moduleIdBySlug.get(module_.slug),
						item.position,
						item.kind,
						item.title,
						item.contentMd ?? null,
						projectId,
						item.configJson ? JSON.stringify(item.configJson) : null,
					],
				);
				itemsUpserted++;
			}
		}

		// Ścieżka: delete+reinsert (czyste definicje; unikaty (path,position) bez
		// konfliktów przy zmianie kolejności).
		await client.query("DELETE FROM curriculum_path_modules WHERE path_key = $1", [ladder.path]);
		for (const [index, module_] of ladder.modules.entries()) {
			await client.query(
				"INSERT INTO curriculum_path_modules (path_key, module_id, position) VALUES ($1, $2, $3)",
				[ladder.path, moduleIdBySlug.get(module_.slug), index + 1],
			);
		}

		// Prereqi: łańcuch liniowy z kolejności (pilot — ADR-014 D3).
		const moduleIds = ladder.modules.map((m) => moduleIdBySlug.get(m.slug));
		await client.query("DELETE FROM curriculum_module_prereqs WHERE module_id = ANY($1)", [
			moduleIds,
		]);
		for (let i = 1; i < moduleIds.length; i++) {
			await client.query(
				"INSERT INTO curriculum_module_prereqs (module_id, requires_module_id) VALUES ($1, $2)",
				[moduleIds[i], moduleIds[i - 1]],
			);
		}

		await client.query("COMMIT");
		console.log(
			`✅ Ingest curriculum OK: ścieżka '${ladder.path}', moduły=${ladder.modules.length}, ` +
				`pozycje=${itemsUpserted}, prereqi=${moduleIds.length - 1} (łańcuch liniowy)`,
		);
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((error) => {
	console.error("❌ Ingest curriculum FAILED:", error);
	process.exit(1);
});
