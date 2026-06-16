// @vitest-environment node
//
// Krok 5 fali A — BEZPIECZEŃSTWO: RLS cross-tenant + re-tenant kaskadowy.
// Test REALNY na bazie :5433 (mock tylko auth + rate-limit).
//
// Dwa filary:
//  (A) CROSS-TENANT: PATCH usera A NIE rusza wiersza usera B (RLS student_sees_own
//      filtruje po user_id → user A widzi/zmienia tylko swój wiersz students).
//  (B) RE-TENANT KASKADA: gdy user A zmienia uczelnię (tenant __unmapped → realny),
//      WSZYSTKIE wiersze potomne dostają nowy tenant_id W TEJ SAMEJ TX. Asercja
//      per tabela potomna — pominięcie = sierota cross-tenant (dziura bezpieczeństwa).
//
// Tabele potomne pokryte (lista z planu): competencies, gaps, skill_maps, passports,
// project_submissions, project_reflections, career_helper_sessions,
// career_helper_turns, student_career_paths.

import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const USER_A = "u-progress-rls-A-integ";
const USER_B = "u-progress-rls-B-integ";
const MAPPED_UNIVERSITY = "WSB Merito Szczecin";

// Wszystkie tabele potomne z denormalizowanym tenant_id i kolumną student_id.
const CHILD_TABLES = [
	"competencies",
	"gaps",
	"skill_maps",
	"passports",
	"project_submissions",
	"project_reflections",
	"career_helper_sessions",
	"career_helper_turns",
	"student_career_paths",
];

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("PATCH /api/onboarding/progress — RLS cross-tenant + re-tenant kaskada", () => {
	let pool: Pool | undefined;
	let unmappedId: string;
	let mappedId: string;
	let studentA: string;
	let studentB: string;

	async function cleanupUsers() {
		if (!pool) return;
		for (const uid of [USER_A, USER_B]) {
			const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [uid]);
			for (const r of rows.rows) {
				// Kolejność: dzieci sesji/zgłoszeń przed rodzicami (FK).
				await pool.query("DELETE FROM career_helper_turns WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM student_career_paths WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM career_helper_sessions WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM project_reflections WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM competencies WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM gaps WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM skill_maps WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM passports WHERE student_id = $1", [r.id]);
			}
			await pool.query("DELETE FROM students WHERE user_id = $1", [uid]);
			await pool.query('DELETE FROM "user" WHERE id = $1', [uid]);
		}
	}

	async function makeUser(uid: string, email: string) {
		await pool?.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'Test RLS', $2, true, now(), now())`,
			[uid, email],
		);
	}

	// Zakłada jeden wiersz w KAŻDEJ tabeli potomnej dla studenta w danym tenancie.
	async function seedChildRows(studentId: string, tenantId: string, projectId: string) {
		if (!pool) return;
		await pool.query(
			`INSERT INTO competencies (student_id, tenant_id, name, status) VALUES ($1,$2,'Python','acquired')`,
			[studentId, tenantId],
		);
		await pool.query(
			`INSERT INTO gaps (student_id, tenant_id, competency_name, priority) VALUES ($1,$2,'SQL','important')`,
			[studentId, tenantId],
		);
		await pool.query(
			`INSERT INTO skill_maps (student_id, tenant_id, nodes, edges) VALUES ($1,$2,'[]'::jsonb,'[]'::jsonb)`,
			[studentId, tenantId],
		);
		await pool.query(`INSERT INTO passports (student_id, tenant_id) VALUES ($1,$2)`, [
			studentId,
			tenantId,
		]);
		const { rows: subRows } = await pool.query(
			`INSERT INTO project_submissions (student_id, tenant_id, project_id, status) VALUES ($1,$2,$3,'in_progress') RETURNING id`,
			[studentId, tenantId, projectId],
		);
		const submissionId = subRows[0].id;
		await pool.query(
			`INSERT INTO project_reflections (student_id, tenant_id, project_id, submission_id) VALUES ($1,$2,$3,$4)`,
			[studentId, tenantId, projectId, submissionId],
		);
		const { rows: sesRows } = await pool.query(
			`INSERT INTO career_helper_sessions (student_id, tenant_id, status, turn, answers, restart_count)
			 VALUES ($1,$2,'in_progress',0,'{}'::jsonb,0) RETURNING id`,
			[studentId, tenantId],
		);
		const sessionId = sesRows[0].id;
		await pool.query(
			`INSERT INTO career_helper_turns (session_id, student_id, tenant_id, role, content, turn_index)
			 VALUES ($1,$2,$3,'ai','hi',0)`,
			[sessionId, studentId, tenantId],
		);
		await pool.query(
			`INSERT INTO student_career_paths (student_id, tenant_id, session_id, label, is_primary, source)
			 VALUES ($1,$2,$3,'Data Analyst',true,'helper')`,
			[studentId, tenantId, sessionId],
		);
		return { submissionId, sessionId };
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		pool = new Pool({ connectionString: DATABASE_URL });
		await cleanupUsers();
		await makeUser(USER_A, "rls-a-integ@test.local");
		await makeUser(USER_B, "rls-b-integ@test.local");

		const { rows: u } = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped'");
		unmappedId = u[0].id;
		const { rows: m } = await pool.query(
			"SELECT id FROM tenants WHERE slug = 'wsb-merito-szczecin'",
		);
		mappedId = m[0].id;

		// Potrzebny realny projekt (project_submissions/reflections mają FK).
		const { rows: pRows } = await pool.query("SELECT id FROM projects LIMIT 1");
		let projectId: string;
		if (pRows.length > 0) {
			projectId = pRows[0].id;
		} else {
			const { rows: created } = await pool.query(
				`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type)
				 VALUES ('rls-test-proj','RLS Test','d','L1',5,'open_data') RETURNING id`,
			);
			projectId = created[0].id;
		}

		// USER_A: prowizoryczny (tenant __unmapped), pełen komplet wierszy potomnych.
		const { rows: aRows } = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, onboarding_step)
			 VALUES ($1,$2,'','',1,'',false,0) RETURNING id`,
			[USER_A, unmappedId],
		);
		studentA = aRows[0].id;
		// Seed kompletu wierszy potomnych w __unmapped (asercje czytają je przez pool.query).
		await seedChildRows(studentA, unmappedId, projectId);

		// USER_B: realny rekord w mappedId — sentinel cross-tenant (nie ma się ruszyć).
		const { rows: bRows } = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, onboarding_step)
			 VALUES ($1,$2,'WSB Merito Szczecin','IT',2,'Dev',false,1) RETURNING id`,
			[USER_B, mappedId],
		);
		studentB = bRows[0].id;
	});

	afterAll(async () => {
		await cleanupUsers();
		await pool?.end();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("(B) re-tenant kaskada: WSZYSTKIE tabele potomne dostają nowy tenant_id", async () => {
		if (!pool) return;
		getSessionMock.mockResolvedValue({ user: { id: USER_A } });
		const { PATCH } = await import("../progress/route");

		// Sanity: przed PATCH wiersze potomne A są w __unmapped.
		for (const t of CHILD_TABLES) {
			const { rows } = await pool.query(`SELECT tenant_id FROM ${t} WHERE student_id = $1`, [
				studentA,
			]);
			expect(rows.length).toBeGreaterThan(0);
			expect(rows[0].tenant_id).toBe(unmappedId);
		}

		const res = await PATCH(
			new Request("http://localhost/api/onboarding/progress", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					step: 1,
					university: MAPPED_UNIVERSITY,
					fieldOfStudy: "Informatyka",
					semester: 4,
				}),
			}),
		);
		expect(res.status).toBe(200);

		// Student A: tenant przeniesiony na mapped.
		const { rows: sRows } = await pool.query("SELECT tenant_id FROM students WHERE id = $1", [
			studentA,
		]);
		expect(sRows[0].tenant_id).toBe(mappedId);

		// KAŻDA tabela potomna: nowy tenant_id, ZERO sierot w __unmapped.
		for (const t of CHILD_TABLES) {
			const { rows } = await pool.query(`SELECT tenant_id FROM ${t} WHERE student_id = $1`, [
				studentA,
			]);
			expect(rows.length).toBeGreaterThan(0);
			for (const r of rows) {
				expect(r.tenant_id, `tabela ${t} powinna mieć nowy tenant_id`).toBe(mappedId);
			}
		}
	});

	it("(A) cross-tenant: PATCH usera A NIE rusza wiersza usera B", async () => {
		if (!pool) return;
		// Wiersz B przed/po — niezmieniony (RLS student_sees_own po user_id).
		const before = await pool.query(
			"SELECT tenant_id, university, field_of_study, semester FROM students WHERE id = $1",
			[studentB],
		);

		getSessionMock.mockResolvedValue({ user: { id: USER_A } });
		const { PATCH } = await import("../progress/route");
		await PATCH(
			new Request("http://localhost/api/onboarding/progress", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ step: 2, syllabusText: "cokolwiek od A" }),
			}),
		);

		const after = await pool.query(
			"SELECT tenant_id, university, field_of_study, semester FROM students WHERE id = $1",
			[studentB],
		);
		expect(after.rows[0]).toEqual(before.rows[0]);
		// B nadal w swoim tenancie, profil nietknięty.
		expect(after.rows[0].tenant_id).toBe(mappedId);
		expect(after.rows[0].university).toBe("WSB Merito Szczecin");
	});
});
