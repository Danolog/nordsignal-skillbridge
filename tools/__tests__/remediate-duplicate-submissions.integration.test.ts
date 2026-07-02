// @vitest-environment node
//
// Test integracyjny narzędzia remediacji duplikatów (0.2a, prekursor 0.2b) — na
// BAZIE TESTOWEJ. Wzorzec: content-cyber-projects.integration — strażnik
// isLocalTestDb pomija test, gdy DATABASE_URL nie wskazuje na lokalną bazę
// testową (brak kontenera → SKIP, nie fail).
//
// UWAGA (0.2b, drizzle/0021): od momentu nałożenia UNIQUE(student_id, project_id)
// nie da się już wstawić do project_submissions dwóch rekordów tej samej pary
// przez zwykły INSERT — scenariusze priorytetu wyboru kanonicznego (recenzja >
// refleksja > updated_at > tiebreak) i konfliktu (dwie refleksje w grupie) NIE
// są tu już odtwarzalne na w pełni zmigrowanej bazie. Ta logika ma teraz czyste
// testy jednostkowe: tests/unit/tools/remediate-duplicate-submissions.test.ts
// (rankCandidates/findConflicts na fabrykowanych danych, bez bazy).
//
// CO ZOSTAJE TU (nadal wymaga realnej bazy/schematu):
//   1. Bez duplikatów: plan pusty, countDuplicateGroups=0 — sanity zapytania
//      grupującego względem prawdziwych kolumn/typów.
//   2. UNIKAT z 0.2b faktycznie odrzuca próbę wstawienia duplikatu — dowód,
//      że scenariusz, który 0.2a remediowało, nie może już wystąpić.

import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { countDuplicateGroups, planRemediation } from "../remediate-duplicate-submissions";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

const TENANT_ID = "66666666-6666-6666-6666-666666666666";
const USER_ID = "remediate-dup-user-integ";
const STUDENT_ID = "77777777-7777-7777-7777-777777777777";
const PROJECT_A = "88888888-8888-8888-8888-888888888888";

let pool: Pool | undefined;
// biome-ignore lint/suspicious/noExplicitAny: db drizzle z connection stringa (wzorzec content-cyber-projects.integration).
let db: any;

async function cleanup(): Promise<void> {
	if (!pool) return;
	await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [STUDENT_ID]);
	await pool.query("DELETE FROM projects WHERE id = $1", [PROJECT_A]);
	await pool.query("DELETE FROM students WHERE id = $1", [STUDENT_ID]);
	await pool.query('DELETE FROM "user" WHERE id = $1', [USER_ID]);
	await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_ID]);
}

async function insertSubmission(opts: {
	id: string;
	projectId: string;
	updatedAt: string;
	createdAt: string;
}): Promise<void> {
	await pool?.query(
		`INSERT INTO project_submissions
		   (id, student_id, tenant_id, project_id, status, needs_human_review, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,'in_progress',false,$5,$6)`,
		[opts.id, STUDENT_ID, TENANT_ID, opts.projectId, opts.createdAt, opts.updatedAt],
	);
}

beforeAll(async () => {
	if (!isLocalTestDb) return;
	pool = new Pool({ connectionString: DATABASE_URL });

	const uq = await pool.query(
		"SELECT indexname FROM pg_indexes WHERE indexname = 'uq_project_submissions_student_project'",
	);
	if (uq.rowCount === 0) {
		throw new Error(
			"Baza testowa bez unikatu uq_project_submissions_student_project (migracja 0021 nie zastosowana). " +
				"Uruchom: pnpm db:migrate:test",
		);
	}

	const { drizzle } = await import("drizzle-orm/node-postgres");
	const schema = await import("../../src/lib/db/schema");
	db = drizzle(DATABASE_URL, { schema });

	await cleanup();

	await pool.query(
		"INSERT INTO tenants (id, slug, name) VALUES ($1,'remediate-tenant','Remediate Tenant')",
		[TENANT_ID],
	);
	await pool.query(
		'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ($1,$2,$3,true,now(),now())',
		[USER_ID, "Remediate Test User", "remediate-dup@example.com"],
	);
	await pool.query(
		`INSERT INTO students (id, user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, created_at, updated_at)
		 VALUES ($1,$2,$3,'Test Uni','Informatyka',4,'Data Scientist',true,now(),now())`,
		[STUDENT_ID, USER_ID, TENANT_ID],
	);
	await pool.query(
		`INSERT INTO projects (id, slug, title, description, level, estimated_hours, source_type, rubric_json, status)
		 VALUES ($1,'remediate-test-project-a','Remediate test — a','Opis projektu testowego.','L1',4,'open_data','[]','active')`,
		[PROJECT_A],
	);
}, 30_000);

afterAll(async () => {
	if (pool) {
		await cleanup();
		await pool.end();
	}
});

beforeEach(async () => {
	if (pool) await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [STUDENT_ID]);
});

d("0.2a remediacja duplikatów project_submissions — po nałożeniu unikatu 0.2b", () => {
	it("bez duplikatów: plan pusty, countDuplicateGroups=0", async () => {
		await insertSubmission({
			id: randomUUID(),
			projectId: PROJECT_A,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});

		const plan = await planRemediation(db);
		expect(plan).toEqual([]);
		expect(await countDuplicateGroups(db)).toBe(0);
	});

	it("UNIQUE(student_id, project_id) z 0.2b odrzuca próbę wstawienia duplikatu", async () => {
		await insertSubmission({
			id: randomUUID(),
			projectId: PROJECT_A,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});

		await expect(
			insertSubmission({
				id: randomUUID(),
				projectId: PROJECT_A,
				createdAt: "2026-01-02T00:00:00Z",
				updatedAt: "2026-01-02T00:00:00Z",
			}),
		).rejects.toThrow(/unique/i);
	});
});
