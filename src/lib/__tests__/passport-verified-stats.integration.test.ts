// @vitest-environment node
//
// MIS.3 — loadVerifiedCompetencyStats na realnej bazie: agregacja po nazwie
// kompetencji (MAX(verified_at) + COUNT(DISTINCT submission_id)). Dwie
// submisje z tą samą nazwą = 2 konteksty, świeżość = nowsze potwierdzenie.
//
// Fixture wzorem reconcile-verified.integration.test.ts (własny łańcuch pod
// MARKER-em, sprzątanie po sobie); wiersze verified_competencies wstawiane
// wprost z jawnym verified_at — testujemy agregację, nie reconcile.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const MARKER = "mis3-stats-integ";

dBack("MIS.3 · loadVerifiedCompetencyStats — realna baza", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let loadVerifiedCompetencyStats: typeof import("@/lib/passport-verified")["loadVerifiedCompetencyStats"];
	let studentId = "";

	async function cleanup() {
		await db.execute(sql`DELETE FROM projects WHERE slug LIKE ${`${MARKER}%`}`);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${MARKER}`);
		await db.execute(sql`DELETE FROM tenants WHERE slug = ${MARKER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${MARKER}`);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		({ loadVerifiedCompetencyStats } = await import("@/lib/passport-verified"));
		await cleanup();

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${MARKER}, ${MARKER}, ${`${MARKER}@test.local`}, true, now(), now())`,
		);
		const tenant = await db.execute(
			sql`INSERT INTO tenants (slug, name) VALUES (${MARKER}, ${MARKER}) RETURNING id`,
		);
		const tenantId = (tenant.rows[0] as { id: string }).id;
		const student = await db.execute(
			sql`INSERT INTO students (user_id, university, field_of_study, semester, career_goal, tenant_id)
			    VALUES (${MARKER}, 'WSB', 'Informatyka', 4, 'Data Scientist', ${tenantId}::uuid) RETURNING id`,
		);
		studentId = (student.rows[0] as { id: string }).id;

		// Dwa projekty → dwie submisje (UNIQUE(student_id, project_id) wymusza
		// różne projekty na „dwa konteksty" tego samego studenta).
		const submissionIds: string[] = [];
		for (const suffix of ["a", "b"]) {
			const project = await db.execute(
				sql`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type)
				    VALUES (${`${MARKER}-${suffix}`}, ${`${MARKER}-${suffix}`}, 'fixture', 'L1', 4, 'open_data')
				    RETURNING id`,
			);
			const projectId = (project.rows[0] as { id: string }).id;
			const submission = await db.execute(
				sql`INSERT INTO project_submissions (student_id, tenant_id, project_id, status, submitted_at)
				    VALUES (${studentId}::uuid, ${tenantId}::uuid, ${projectId}::uuid, 'verified', now())
				    RETURNING id`,
			);
			submissionIds.push((submission.rows[0] as { id: string }).id);
		}

		await db.execute(
			sql`INSERT INTO verified_competencies (student_id, tenant_id, submission_id, competency_name, verified_at) VALUES
			    (${studentId}::uuid, ${tenantId}::uuid, ${submissionIds[0]}::uuid, ${`${MARKER}-python`}, '2026-01-01T00:00:00Z'),
			    (${studentId}::uuid, ${tenantId}::uuid, ${submissionIds[1]}::uuid, ${`${MARKER}-python`}, '2026-06-01T00:00:00Z'),
			    (${studentId}::uuid, ${tenantId}::uuid, ${submissionIds[0]}::uuid, ${`${MARKER}-sql`}, '2026-01-01T00:00:00Z')`,
		);
	});

	afterAll(async () => {
		if (db) await cleanup();
	});

	it("dwie submisje z tą samą nazwą = 2 konteksty, świeżość z NOWSZEGO potwierdzenia", async () => {
		const stats = await loadVerifiedCompetencyStats(db, studentId);
		const byName = new Map(stats.map((s) => [s.name, s]));

		const python = byName.get(`${MARKER}-python`);
		expect(python).toBeDefined();
		expect(python?.contextCount).toBe(2);
		expect(python?.lastVerifiedAt.toISOString()).toBe("2026-06-01T00:00:00.000Z");

		const sqlStat = byName.get(`${MARKER}-sql`);
		expect(sqlStat?.contextCount).toBe(1);
		expect(sqlStat?.lastVerifiedAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
	});

	it("student bez kredencjałów → pusta lista (panel się nie renderuje)", async () => {
		const stats = await loadVerifiedCompetencyStats(db, "00000000-0000-0000-0000-000000000000");
		expect(stats).toEqual([]);
	});
});
