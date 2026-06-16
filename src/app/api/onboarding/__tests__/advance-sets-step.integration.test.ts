// @vitest-environment node
//
// Krok 3 fali A — POST /api/onboarding/advance ustawia onboardingStep=5 po
// pozytywnej walidacji progu samooceny, NIE ruszajac onboardingCompleted.
//
// SEDNO: advance domyka przejscie krok 4 → 5 (Samoocena → Wnioski). Po nim
// high-water-mark = 5 (wznow od kroku 5), ale onboarding wciaz NIE jest
// ukonczony (completed=false) — to robi dopiero .../complete.
//
// Test REALNY na bazie :5433 (mock tylko auth). Setup: student z 5 kompetencjami,
// wszystkie ocenione (selfAssessment != null) → prog min(5,N) spelniony → 200.

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const TEST_USER_ID = "u-advance-sets-step-integ";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("POST /api/onboarding/advance ustawia onboardingStep=5 (realna baza)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu.
	let testDb: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ladowana dynamicznie po env.
	let schema: any;
	let tenantId: string;
	let studentId: string;

	async function cleanupUser() {
		if (!pool) return;
		const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [TEST_USER_ID]);
		for (const r of rows.rows) {
			await pool.query("DELETE FROM competencies WHERE student_id = $1", [r.id]);
		}
		await pool.query("DELETE FROM students WHERE user_id = $1", [TEST_USER_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [TEST_USER_ID]);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		schema = await import("@/lib/db/schema");
		pool = new Pool({ connectionString: DATABASE_URL });
		testDb = drizzle(pool, { schema });
		await cleanupUser();
		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'Test Advance', 'advance-integ@test.local', true, now(), now())`,
			[TEST_USER_ID],
		);
		const { rows: tRows } = await pool.query(
			"SELECT id FROM tenants WHERE slug = 'wsb-merito-szczecin'",
		);
		tenantId = tRows[0].id;
		// Student na kroku 4 (step=4, completed=false), 5 kompetencji WSZYSTKIE ocenione.
		const { rows: sRows } = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, onboarding_step)
			 VALUES ($1, $2, 'WSB Merito Szczecin', 'IT', 4, 'Data Analyst', false, 4) RETURNING id`,
			[TEST_USER_ID, tenantId],
		);
		studentId = sRows[0].id;
		for (const name of ["Python", "SQL", "Statystyka", "Git", "Wizualizacja"]) {
			await pool.query(
				`INSERT INTO competencies (student_id, tenant_id, name, status, self_assessment)
				 VALUES ($1, $2, $3, 'acquired', 3)`,
				[studentId, tenantId, name],
			);
		}
	});

	afterAll(async () => {
		await cleanupUser();
		await pool?.end();
	});

	beforeEach(() => {
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
	});

	it("200 + onboardingStep=5, onboardingCompleted nadal false", async () => {
		const { POST } = await import("../advance/route");
		const res = await POST(
			new Request("http://localhost/api/onboarding/advance", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fromStep: 4, toStep: 5 }),
			}),
		);
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean };
		expect(json.success).toBe(true);

		const [row] = await testDb
			.select({
				onboardingStep: schema.students.onboardingStep,
				onboardingCompleted: schema.students.onboardingCompleted,
			})
			.from(schema.students)
			.where(eq(schema.students.userId, TEST_USER_ID));
		expect(row.onboardingStep).toBe(5);
		expect(row.onboardingCompleted).toBe(false);
	});
});
