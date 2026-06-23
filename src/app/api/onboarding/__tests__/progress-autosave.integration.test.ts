// @vitest-environment node
//
// Krok 5 fali A — PATCH /api/onboarding/progress: autosave kroków 1–2 + bump
// high-water-mark. Test REALNY na bazie :5433 (mock tylko auth + rate-limit).
//
// Pokrywa:
//  - step 1: pola profilu zapisane + onboarding_step=1 + tenant re-resolved
//    (uczelnia mapowana → realny tenant zamiast prowizorycznego __unmapped)
//  - step 2: syllabusText zapisany + onboarding_step=2
//  - czysty bump {step:4} → onboarding_step=4 (GREATEST, nie cofa)
//  - onboardingCompleted NIE ruszany (zostaje false)

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const TEST_USER_ID = "u-progress-autosave-integ";
const MAPPED_UNIVERSITY = "WSB Merito Szczecin";

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

function makeReq(body: unknown) {
	return new Request("http://localhost/api/onboarding/progress", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

dBack("PATCH /api/onboarding/progress — autosave (realna baza)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu.
	let testDb: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ladowana dynamicznie po env.
	let schema: any;
	let unmappedId: string;
	let mappedId: string;

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
			 VALUES ($1, 'Test Autosave', 'autosave-integ@test.local', true, now(), now())`,
			[TEST_USER_ID],
		);
		const { rows: u } = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped'");
		unmappedId = u[0].id;
		const { rows: m } = await pool.query(
			"SELECT id FROM tenants WHERE slug = 'wsb-merito-szczecin'",
		);
		mappedId = m[0].id;
		// Prowizoryczny rekord (jak po Kroku 0): tenant __unmapped, university="".
		await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, onboarding_step)
			 VALUES ($1, $2, '', '', 1, '', false, 0)`,
			[TEST_USER_ID, unmappedId],
		);
	});

	afterAll(async () => {
		await cleanupUser();
		await pool?.end();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
	});

	it("step 1: pola profilu + onboarding_step=1 + tenant re-resolved na realny", async () => {
		const { PATCH } = await import("../progress/route");
		const res = await PATCH(
			makeReq({
				step: 1,
				university: MAPPED_UNIVERSITY,
				fieldOfStudy: "Informatyka",
				semester: 4,
			}),
		);
		expect(res.status).toBe(200);

		const [row] = await testDb
			.select({
				university: schema.students.university,
				fieldOfStudy: schema.students.fieldOfStudy,
				semester: schema.students.semester,
				tenantId: schema.students.tenantId,
				onboardingStep: schema.students.onboardingStep,
				onboardingCompleted: schema.students.onboardingCompleted,
			})
			.from(schema.students)
			.where(eq(schema.students.userId, TEST_USER_ID));
		expect(row.university).toBe(MAPPED_UNIVERSITY);
		expect(row.fieldOfStudy).toBe("Informatyka");
		expect(row.semester).toBe(4);
		// Tenant re-resolved: prowizoryczny __unmapped → realny wsb-merito-szczecin.
		expect(row.tenantId).toBe(mappedId);
		expect(row.tenantId).not.toBe(unmappedId);
		expect(row.onboardingStep).toBe(1);
		expect(row.onboardingCompleted).toBe(false);
	});

	it("step 2: syllabusText zapisany + onboarding_step=2", async () => {
		const { PATCH } = await import("../progress/route");
		const SYLLABUS = "Algebra liniowa; Rachunek prawdopodobieństwa; Bazy danych.";
		const res = await PATCH(makeReq({ step: 2, syllabusText: SYLLABUS }));
		expect(res.status).toBe(200);

		const [row] = await testDb
			.select({
				syllabusText: schema.students.syllabusText,
				onboardingStep: schema.students.onboardingStep,
			})
			.from(schema.students)
			.where(eq(schema.students.userId, TEST_USER_ID));
		expect(row.syllabusText).toBe(SYLLABUS);
		expect(row.onboardingStep).toBe(2);
	});

	it("czysty bump {step:4} → onboarding_step=4 (GREATEST, nie cofa do 2)", async () => {
		const { PATCH } = await import("../progress/route");
		const res = await PATCH(makeReq({ step: 4 }));
		expect(res.status).toBe(200);

		const [row] = await testDb
			.select({ onboardingStep: schema.students.onboardingStep })
			.from(schema.students)
			.where(eq(schema.students.userId, TEST_USER_ID));
		expect(row.onboardingStep).toBe(4);
	});

	it("bare {step:1} bez payloadu → 400 (kroki 1/2 wymagaja danych), step zostaje 4", async () => {
		const { PATCH } = await import("../progress/route");
		// {step:1} bez pol profilu: nie Step1Schema (brak university) i nie StepBump
		// (refine wyklucza 1/2) → 400. Chroni przed cichym 500 / pustym autosave.
		const res = await PATCH(makeReq({ step: 1 }));
		expect(res.status).toBe(400);

		const [row] = await testDb
			.select({ onboardingStep: schema.students.onboardingStep })
			.from(schema.students)
			.where(eq(schema.students.userId, TEST_USER_ID));
		// Nic nie ruszone — high-water-mark zostaje na 4.
		expect(row.onboardingStep).toBe(4);
	});
});
