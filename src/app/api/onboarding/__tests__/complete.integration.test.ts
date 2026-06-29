// @vitest-environment node
//
// Krok 4 fali A — POST /api/onboarding/complete: JEDYNE miejsce zapalajace
// onboardingCompleted=true.
//
// PARTIA 4 (flip D5): prog "min 5 kompetencji" ZNIESIONY. Jedyna brama domkniecia =
// profil REALNY (students.university != ""). Student z 0 kompetencji (0% pokrycia =
// uczciwy start juniora, caly rynek jako luki) PRZECHODZI. Inaczej 409 (nie domyka
// onboardingu na prowizorycznym rekordzie z Kroku 0).
//
// Test REALNY na bazie :5433 (mock tylko auth). Trzy przypadki:
//  (1) realny profil + 5 kompetencji → 200 {success, redirect:"/dashboard"}, completed=true
//  (2) realny profil + 0 kompetencji → 200, completed=true (PARTIA 4 — prog zniesiony)
//  (3) placeholder (university="") → 409, completed zostaje false

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const USER_OK = "u-complete-ok-integ";
const USER_ZERO = "u-complete-zero-comp-integ";
const USER_PLACEHOLDER = "u-complete-placeholder-integ";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("POST /api/onboarding/complete (realna baza)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu.
	let testDb: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ladowana dynamicznie po env.
	let schema: any;
	let tenantId: string;

	async function cleanupUsers() {
		if (!pool) return;
		for (const uid of [USER_OK, USER_ZERO, USER_PLACEHOLDER]) {
			const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [uid]);
			for (const r of rows.rows) {
				await pool.query("DELETE FROM competencies WHERE student_id = $1", [r.id]);
			}
			await pool.query("DELETE FROM students WHERE user_id = $1", [uid]);
			await pool.query('DELETE FROM "user" WHERE id = $1', [uid]);
		}
	}

	async function makeUser(uid: string, email: string) {
		await pool?.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'Test Complete', $2, true, now(), now())`,
			[uid, email],
		);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		schema = await import("@/lib/db/schema");
		pool = new Pool({ connectionString: DATABASE_URL });
		testDb = drizzle(pool, { schema });
		await cleanupUsers();
		await makeUser(USER_OK, "complete-ok-integ@test.local");
		await makeUser(USER_ZERO, "complete-zero-comp-integ@test.local");
		await makeUser(USER_PLACEHOLDER, "complete-placeholder-integ@test.local");
		const { rows: tRows } = await pool.query(
			"SELECT id FROM tenants WHERE slug = 'wsb-merito-szczecin'",
		);
		tenantId = tRows[0].id;
		const { rows: uRows } = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped'");
		const unmappedId = uRows[0].id;

		// USER_OK: realny profil, step 5, 5 kompetencji.
		const { rows: okRows } = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, onboarding_step)
			 VALUES ($1, $2, 'WSB Merito Szczecin', 'IT', 4, 'Data Analyst', false, 5) RETURNING id`,
			[USER_OK, tenantId],
		);
		for (const name of ["Python", "SQL", "Statystyka", "Git", "Wizualizacja"]) {
			await pool.query(
				`INSERT INTO competencies (student_id, tenant_id, name, status) VALUES ($1, $2, $3, 'acquired')`,
				[okRows[0].id, tenantId, name],
			);
		}

		// USER_ZERO: realny profil (university wypelniona), step 3, ZERO kompetencji.
		// PARTIA 4 (D5): 0 kompetencji + realny profil MUSI domknac onboarding (prog zniesiony).
		await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, onboarding_step)
			 VALUES ($1, $2, 'WSB Merito Szczecin', 'IT', 3, 'Data Analyst', false, 3)`,
			[USER_ZERO, tenantId],
		);

		// USER_PLACEHOLDER: prowizoryczny rekord (university=""), tenant __unmapped, brak kompetencji.
		await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, onboarding_step)
			 VALUES ($1, $2, '', '', 1, '', false, 0)`,
			[USER_PLACEHOLDER, unmappedId],
		);
	});

	afterAll(async () => {
		await cleanupUsers();
		await pool?.end();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("realny profil + 5 kompetencji → 200, completed=true, redirect /dashboard", async () => {
		getSessionMock.mockResolvedValue({ user: { id: USER_OK } });
		const { POST } = await import("../complete/route");
		const res = await POST();
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean; redirect: string };
		expect(json.success).toBe(true);
		expect(json.redirect).toBe("/dashboard");

		const [row] = await testDb
			.select({ onboardingCompleted: schema.students.onboardingCompleted })
			.from(schema.students)
			.where(eq(schema.students.userId, USER_OK));
		expect(row.onboardingCompleted).toBe(true);
	});

	it("PARTIA 4: realny profil + 0 kompetencji → 200, completed=true (prog min-5 zniesiony)", async () => {
		getSessionMock.mockResolvedValue({ user: { id: USER_ZERO } });
		const { POST } = await import("../complete/route");
		const res = await POST();
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean; redirect: string };
		expect(json.success).toBe(true);
		expect(json.redirect).toBe("/dashboard");

		const [row] = await testDb
			.select({ onboardingCompleted: schema.students.onboardingCompleted })
			.from(schema.students)
			.where(eq(schema.students.userId, USER_ZERO));
		// 0 kompetencji NIE blokuje domkniecia — jedyna brama to realny profil.
		expect(row.onboardingCompleted).toBe(true);
	});

	it("placeholder (university='') → 409, completed zostaje false", async () => {
		getSessionMock.mockResolvedValue({ user: { id: USER_PLACEHOLDER } });
		const { POST } = await import("../complete/route");
		const res = await POST();
		expect(res.status).toBe(409);

		const [row] = await testDb
			.select({ onboardingCompleted: schema.students.onboardingCompleted })
			.from(schema.students)
			.where(eq(schema.students.userId, USER_PLACEHOLDER));
		expect(row.onboardingCompleted).toBe(false);
	});
});
