// @vitest-environment node
//
// Blok C (C2) — reconcileVerifiedCompetencies na realnej bazie (migracja 0037):
// verified → snapshot required (nigdy acquired); reject/resubmit → delete;
// idempotencja przez UNIQUE(submission_id, competency_name) z zachowaniem
// pierwotnego verified_at (snapshot nie jest nadpisywany przy ponownym
// uzgodnieniu ani po edycji katalogu — ADR-008 „etykieta nie kłamie").
//
// Test buduje własny łańcuch fixture (user → tenant → student → projekt →
// kompetencje → submisja) pod MARKER-em i sprząta po sobie — nie zależy od seedu.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const MARKER = "c2-reconcile-integ";

dBack("Blok C (C2) · reconcileVerifiedCompetencies — realna baza", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let reconcileVerifiedCompetencies: typeof import("@/lib/projects/reconcile-verified")["reconcileVerifiedCompetencies"];
	let studentId = "";
	let submissionId = "";
	let projectId = "";

	async function cleanup() {
		await db.execute(sql`DELETE FROM projects WHERE slug = ${MARKER}`);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${MARKER}`);
		await db.execute(sql`DELETE FROM tenants WHERE slug = ${MARKER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${MARKER}`);
	}

	async function setStatus(status: string) {
		await db.execute(
			sql`UPDATE project_submissions SET status = ${status}::submission_status WHERE id = ${submissionId}::uuid`,
		);
	}

	async function credentialNames(): Promise<string[]> {
		const res = await db.execute(
			sql`SELECT competency_name FROM verified_competencies WHERE submission_id = ${submissionId}::uuid ORDER BY competency_name`,
		);
		return res.rows.map((r: { competency_name: string }) => r.competency_name);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		({ reconcileVerifiedCompetencies } = await import("@/lib/projects/reconcile-verified"));
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
		const project = await db.execute(
			sql`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type)
			    VALUES (${MARKER}, ${MARKER}, 'fixture', 'L1', 4, 'open_data') RETURNING id`,
		);
		projectId = (project.rows[0] as { id: string }).id;
		await db.execute(
			sql`INSERT INTO project_competencies (project_id, competency_name, role) VALUES
			    (${projectId}::uuid, ${`${MARKER}-python`}, 'required'),
			    (${projectId}::uuid, ${`${MARKER}-sql`}, 'required'),
			    (${projectId}::uuid, ${`${MARKER}-git`}, 'acquired')`,
		);
		const submission = await db.execute(
			sql`INSERT INTO project_submissions (student_id, tenant_id, project_id, status, submitted_at)
			    VALUES (${studentId}::uuid, ${tenantId}::uuid, ${projectId}::uuid, 'submitted', now()) RETURNING id`,
		);
		submissionId = (submission.rows[0] as { id: string }).id;
	});

	afterAll(async () => {
		if (db) await cleanup();
	});

	it("status inny niż verified → zero kredencjałów (submitted nie wystawia nic)", async () => {
		await db.transaction((tx: Parameters<typeof reconcileVerifiedCompetencies>[0]) =>
			reconcileVerifiedCompetencies(tx, submissionId),
		);
		expect(await credentialNames()).toEqual([]);
	});

	it("verified → snapshot WYŁĄCZNIE required (acquired to prerekwizyt, nie kredencjał)", async () => {
		await setStatus("verified");
		await db.transaction((tx: Parameters<typeof reconcileVerifiedCompetencies>[0]) =>
			reconcileVerifiedCompetencies(tx, submissionId),
		);
		expect(await credentialNames()).toEqual([`${MARKER}-python`, `${MARKER}-sql`]);
	});

	it("ponowne uzgodnienie jest idempotentne i NIE nadpisuje verified_at (snapshot)", async () => {
		const before = await db.execute(
			sql`SELECT verified_at FROM verified_competencies WHERE submission_id = ${submissionId}::uuid ORDER BY competency_name`,
		);
		await db.transaction((tx: Parameters<typeof reconcileVerifiedCompetencies>[0]) =>
			reconcileVerifiedCompetencies(tx, submissionId),
		);
		const after = await db.execute(
			sql`SELECT verified_at FROM verified_competencies WHERE submission_id = ${submissionId}::uuid ORDER BY competency_name`,
		);
		expect(after.rows).toEqual(before.rows);
		expect(after.rows.length).toBe(2);
	});

	it("edycja katalogu PO weryfikacji nie zmienia wystawionego kredencjału", async () => {
		await db.execute(
			sql`INSERT INTO project_competencies (project_id, competency_name, role)
			    VALUES (${projectId}::uuid, ${`${MARKER}-nowa`}, 'required')`,
		);
		// Bez tranzycji statusu nikt nie woła reconcile — kredencjał stoi.
		expect(await credentialNames()).toEqual([`${MARKER}-python`, `${MARKER}-sql`]);
		await db.execute(
			sql`DELETE FROM project_competencies WHERE competency_name = ${`${MARKER}-nowa`}`,
		);
	});

	it("reject → kredencjały znikają (reconcile-delete to ścieżka odbierania)", async () => {
		await setStatus("rejected");
		await db.transaction((tx: Parameters<typeof reconcileVerifiedCompetencies>[0]) =>
			reconcileVerifiedCompetencies(tx, submissionId),
		);
		expect(await credentialNames()).toEqual([]);
	});

	it("resubmit po verified (status spada na submitted) → kredencjał cofnięty", async () => {
		await setStatus("verified");
		await db.transaction((tx: Parameters<typeof reconcileVerifiedCompetencies>[0]) =>
			reconcileVerifiedCompetencies(tx, submissionId),
		);
		expect((await credentialNames()).length).toBe(2);
		await setStatus("submitted");
		await db.transaction((tx: Parameters<typeof reconcileVerifiedCompetencies>[0]) =>
			reconcileVerifiedCompetencies(tx, submissionId),
		);
		expect(await credentialNames()).toEqual([]);
	});

	it("nieistniejąca submisja → no-op (CASCADE sprząta, funkcja nie rzuca)", async () => {
		await db.transaction((tx: Parameters<typeof reconcileVerifiedCompetencies>[0]) =>
			reconcileVerifiedCompetencies(tx, "00000000-0000-0000-0000-000000000000"),
		);
	});

	it("kasowanie submisji → CASCADE zabiera kredencjały (kredencjał nie przeżywa submisji)", async () => {
		await setStatus("verified");
		await db.transaction((tx: Parameters<typeof reconcileVerifiedCompetencies>[0]) =>
			reconcileVerifiedCompetencies(tx, submissionId),
		);
		expect((await credentialNames()).length).toBe(2);
		await db.execute(sql`DELETE FROM project_submissions WHERE id = ${submissionId}::uuid`);
		const orphans = await db.execute(
			sql`SELECT count(*)::int AS c FROM verified_competencies WHERE submission_id = ${submissionId}::uuid`,
		);
		expect((orphans.rows[0] as { c: number }).c).toBe(0);
	});
});
