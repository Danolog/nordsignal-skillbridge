// @vitest-environment node
//
// Test integracyjny narzędzia remediacji duplikatów (0.2a, prekursor 0.2b) — na
// BAZIE TESTOWEJ. Wzorzec: content-cyber-projects.integration — strażnik
// isLocalTestDb pomija test, gdy DATABASE_URL nie wskazuje na lokalną bazę
// testową (brak kontenera → SKIP, nie fail).
//
// CO TESTUJEMY (sedno 0.2a):
//   1. Grupa duplikatów (student_id, project_id) bez recenzji/refleksji →
//      zachowany najpóźniej zaktualizowany, reszta skasowana.
//   2. Priorytet: rekord z submission_reviews NIGDY nie jest kasowany, nawet
//      jeśli jest starszy niż inne duplikaty w grupie.
//   3. Priorytet: rekord z project_reflections NIGDY nie jest kasowany, gdy
//      żaden inny w grupie nie ma recenzji.
//   4. Dry-run (plan bez applyRemediation) niczego nie zmienia w bazie.
//   5. Idempotencja: po remediacji countDuplicateGroups() === 0, drugie
//      uruchomienie planRemediation() zwraca pusty plan.
//   6. Grupy bez duplikatów (dokładnie 1 zgłoszenie) są pomijane przez plan.
//   7. Ochrona dzieci (audyt Fable 5): refleksja kasowanego rekordu jest
//      PRZEPINANA na keepera, nie tracona w kaskadzie.
//   8. Konflikt (dwie refleksje w jednej grupie): applyRemediation odmawia
//      zapisu i niczego nie zmienia — wymaga ręcznej analizy.

import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	applyRemediation,
	countDuplicateGroups,
	findConflicts,
	planRemediation,
} from "../remediate-duplicate-submissions";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

const TENANT_ID = "66666666-6666-6666-6666-666666666666";
const USER_ID = "remediate-dup-user-integ";
const STUDENT_ID = "77777777-7777-7777-7777-777777777777";
const PROJECT_A = "88888888-8888-8888-8888-888888888888";
const PROJECT_B = "99999999-9999-9999-9999-999999999999";
const PROJECT_C = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

let pool: Pool | undefined;
// biome-ignore lint/suspicious/noExplicitAny: db drizzle z connection stringa (wzorzec content-cyber-projects.integration).
let db: any;

async function cleanup(): Promise<void> {
	if (!pool) return;
	// FK: project_reflections/submission_reviews kaskadują z project_submissions.
	await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [STUDENT_ID]);
	await pool.query("DELETE FROM projects WHERE id = ANY($1::uuid[])", [
		[PROJECT_A, PROJECT_B, PROJECT_C],
	]);
	await pool.query("DELETE FROM students WHERE id = $1", [STUDENT_ID]);
	await pool.query('DELETE FROM "user" WHERE id = $1', [USER_ID]);
	await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_ID]);
}

async function insertProject(id: string, slug: string): Promise<void> {
	await pool?.query(
		`INSERT INTO projects (id, slug, title, description, level, estimated_hours, source_type, rubric_json, status)
		 VALUES ($1,$2,$3,'Opis projektu testowego.','L1',4,'open_data','[]','active')`,
		[id, slug, `Remediate test — ${slug}`],
	);
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

async function insertReview(submissionId: string): Promise<void> {
	await pool?.query(
		`INSERT INTO submission_reviews (id, submission_id, tenant_id, decision, reviewer_type)
		 VALUES ($1,$2,$3,'approved','faculty')`,
		[randomUUID(), submissionId, TENANT_ID],
	);
}

async function insertReflection(submissionId: string, projectId: string): Promise<void> {
	await pool?.query(
		`INSERT INTO project_reflections (id, student_id, tenant_id, project_id, submission_id, answer_learned)
		 VALUES ($1,$2,$3,$4,$5,'Test refleksji.')`,
		[randomUUID(), STUDENT_ID, TENANT_ID, projectId, submissionId],
	);
}

beforeAll(async () => {
	if (!isLocalTestDb) return;
	pool = new Pool({ connectionString: DATABASE_URL });

	const t = await pool.query("SELECT to_regclass('public.project_submissions') AS reg");
	if (!t.rows[0]?.reg) {
		throw new Error("Baza testowa bez tabeli project_submissions — uruchom: pnpm db:migrate:test");
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
	await insertProject(PROJECT_A, "remediate-test-project-a");
	await insertProject(PROJECT_B, "remediate-test-project-b");
	await insertProject(PROJECT_C, "remediate-test-project-c");
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

d("0.2a remediacja duplikatów project_submissions", () => {
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

	it("duplikat bez recenzji/refleksji: zachowuje najpóźniej zaktualizowany", async () => {
		const older = randomUUID();
		const newer = randomUUID();
		await insertSubmission({
			id: older,
			projectId: PROJECT_A,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});
		await insertSubmission({
			id: newer,
			projectId: PROJECT_A,
			createdAt: "2026-01-02T00:00:00Z",
			updatedAt: "2026-01-03T00:00:00Z",
		});

		const plan = await planRemediation(db);
		expect(plan).toHaveLength(1);
		expect(plan[0].keepId).toBe(newer);
		expect(plan[0].deleteIds).toEqual([older]);

		const deleted = await applyRemediation(db, plan);
		expect(deleted).toBe(1);
		expect(await countDuplicateGroups(db)).toBe(0);

		const remaining = await pool?.query(
			"SELECT id FROM project_submissions WHERE project_id = $1",
			[PROJECT_A],
		);
		expect(remaining?.rows.map((r) => r.id)).toEqual([newer]);
	});

	it("rekord z submission_reviews NIGDY nie jest kasowany, nawet gdy starszy", async () => {
		const reviewed = randomUUID();
		const newerNoReview = randomUUID();
		await insertSubmission({
			id: reviewed,
			projectId: PROJECT_B,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});
		await insertReview(reviewed);
		await insertSubmission({
			id: newerNoReview,
			projectId: PROJECT_B,
			createdAt: "2026-01-05T00:00:00Z",
			updatedAt: "2026-01-05T00:00:00Z",
		});

		const plan = await planRemediation(db);
		expect(plan).toHaveLength(1);
		expect(plan[0].keepId).toBe(reviewed);
		expect(plan[0].deleteIds).toEqual([newerNoReview]);

		await applyRemediation(db, plan);

		const reviewRow = await pool?.query(
			"SELECT submission_id FROM submission_reviews WHERE submission_id = $1",
			[reviewed],
		);
		expect(reviewRow?.rows.length).toBe(1);
	});

	it("rekord z project_reflections nie jest kasowany, gdy żaden inny nie ma recenzji", async () => {
		const withReflection = randomUUID();
		const newerNoReflection = randomUUID();
		await insertSubmission({
			id: withReflection,
			projectId: PROJECT_C,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});
		await insertReflection(withReflection, PROJECT_C);
		await insertSubmission({
			id: newerNoReflection,
			projectId: PROJECT_C,
			createdAt: "2026-01-05T00:00:00Z",
			updatedAt: "2026-01-05T00:00:00Z",
		});

		const plan = await planRemediation(db);
		expect(plan).toHaveLength(1);
		expect(plan[0].keepId).toBe(withReflection);
		expect(plan[0].deleteIds).toEqual([newerNoReflection]);
	});

	it("przepina refleksję kasowanego rekordu na keepera zamiast tracić ją w kaskadzie", async () => {
		const withReview = randomUUID();
		const withReflection = randomUUID();
		await insertSubmission({
			id: withReview,
			projectId: PROJECT_B,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});
		await insertReview(withReview);
		await insertSubmission({
			id: withReflection,
			projectId: PROJECT_B,
			createdAt: "2026-01-05T00:00:00Z",
			updatedAt: "2026-01-05T00:00:00Z",
		});
		await insertReflection(withReflection, PROJECT_B);

		const plan = await planRemediation(db);
		expect(plan).toHaveLength(1);
		// Recenzja ma priorytet nad refleksją — keeper to rekord z recenzją.
		expect(plan[0].keepId).toBe(withReview);
		expect(plan[0].deleteIds).toEqual([withReflection]);
		expect(findConflicts(plan)).toEqual([]);

		await applyRemediation(db, plan);

		// Refleksja NIE zniknęła kaskadą — została przepięta na keepera.
		const reflectionRow = await pool?.query(
			"SELECT submission_id FROM project_reflections WHERE student_id = $1 AND project_id = $2",
			[STUDENT_ID, PROJECT_B],
		);
		expect(reflectionRow?.rows).toHaveLength(1);
		expect(reflectionRow?.rows[0].submission_id).toBe(withReview);

		// Recenzja keepera nienaruszona.
		const reviewRow = await pool?.query(
			"SELECT submission_id FROM submission_reviews WHERE submission_id = $1",
			[withReview],
		);
		expect(reviewRow?.rows).toHaveLength(1);
	});

	it("konflikt (dwie refleksje w jednej grupie): applyRemediation rzuca, nic nie zmienia", async () => {
		const a = randomUUID();
		const b = randomUUID();
		await insertSubmission({
			id: a,
			projectId: PROJECT_C,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});
		await insertReflection(a, PROJECT_C);
		await insertSubmission({
			id: b,
			projectId: PROJECT_C,
			createdAt: "2026-01-02T00:00:00Z",
			updatedAt: "2026-01-02T00:00:00Z",
		});
		await insertReflection(b, PROJECT_C);

		const plan = await planRemediation(db);
		expect(plan).toHaveLength(1);

		const conflicts = findConflicts(plan);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].childType).toBe("reflection");
		expect(conflicts[0].submissionIds.sort()).toEqual([a, b].sort());

		await expect(applyRemediation(db, plan)).rejects.toThrow(/Konflikt remediacji/);

		// Nic nie zostało skasowane ani przepięte.
		const count = await pool?.query(
			"SELECT count(*)::int AS n FROM project_submissions WHERE project_id = $1",
			[PROJECT_C],
		);
		expect(count?.rows[0].n).toBe(2);
		const reflections = await pool?.query(
			"SELECT submission_id FROM project_reflections WHERE project_id = $1",
			[PROJECT_C],
		);
		expect(reflections?.rows.map((r) => r.submission_id).sort()).toEqual([a, b].sort());
	});

	it("dry-run (sam planRemediation) niczego nie zmienia w bazie", async () => {
		const a = randomUUID();
		const b = randomUUID();
		await insertSubmission({
			id: a,
			projectId: PROJECT_A,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});
		await insertSubmission({
			id: b,
			projectId: PROJECT_A,
			createdAt: "2026-01-02T00:00:00Z",
			updatedAt: "2026-01-02T00:00:00Z",
		});

		await planRemediation(db);

		const count = await pool?.query(
			"SELECT count(*)::int AS n FROM project_submissions WHERE project_id = $1",
			[PROJECT_A],
		);
		expect(count?.rows[0].n).toBe(2);
	});

	it("idempotencja: drugie planRemediation po remediacji zwraca pusty plan", async () => {
		const a = randomUUID();
		const b = randomUUID();
		await insertSubmission({
			id: a,
			projectId: PROJECT_A,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});
		await insertSubmission({
			id: b,
			projectId: PROJECT_A,
			createdAt: "2026-01-02T00:00:00Z",
			updatedAt: "2026-01-02T00:00:00Z",
		});

		const firstPlan = await planRemediation(db);
		await applyRemediation(db, firstPlan);

		const secondPlan = await planRemediation(db);
		expect(secondPlan).toEqual([]);
	});
});
