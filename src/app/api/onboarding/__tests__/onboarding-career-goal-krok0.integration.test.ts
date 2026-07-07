// @vitest-environment node
//
// Strumień E (#5) — test integracyjny REALNEJ ścieżki celu kariery z Kroku 0.
//
// SEDNO #5 + lekcja split-frontend-backend (MEMORY): zmiana sekwencji onboardingu
// to zmiana zachowania UI, ale dotyka stylu front↔back JEDNYM efektem — careerGoal
// ustalony w Kroku 0 (Pomocnik, w PAMIĘCI) MUSI dojść do POST /api/onboarding i
// wylądować w students.career_goal. Mock samego endpointu nie dowiódłby tego styku,
// dlatego wołamy REALNY handler na REALNEJ bazie i czytamy zapisany wiersz.
//
// Komplementarna warstwa front (realny render wizarda, fetch przechwycony — czy cel
// z Kroku 0 trafia do body submitu) żyje w teście jednostkowym wizarda
// (onboarding-wizard-krok0.test.tsx, środowisko jsdom). Tu pokrywamy styk z bazą.
//
// Wymaga DATABASE_URL na lokalny kontener testowy (postgres :5433, po
// `pnpm db:migrate:test` + seed tenanta `wsb-merito-szczecin`/`__unmapped`). Bez
// lokalnej bazy → describe pomijane (skip), nie failuje (nie blokuje `pnpm test`).
// Uruchom: $env:DATABASE_URL="postgres://...@localhost:5433/skillbridge_test"; pnpm test:integration

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const KROK0_GOAL = "Data Analyst";
const TEST_USER_ID = "u-krok0-careergoal-integ";
// Uczelnia mapowana na realny tenant w seedzie (resolveTenantId → wsb-merito-szczecin).
const MAPPED_UNIVERSITY = "WSB Merito Szczecin";

// Atrapy na granicy (poza kontraktem persystencji celu): auth (sesja) + AI (gaps/skill-map).
// Bazy NIE mockujemy — to jest sedno testu integracyjnego.
const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiHeavy: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));
// AI poza kontraktem celu — atrapujemy, żeby test nie wołał LLM ani nie pisał gaps/skill-map.
vi.mock("@/lib/ai/generate-skill-map", () => ({ generateSkillMap: vi.fn(async () => undefined) }));

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("Krok 0 → submit persystuje students.career_goal (realna baza)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu.
	let testDb: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie po env.
	let schema: any;

	async function cleanupUser() {
		if (!pool) return;
		// Kasujemy potomne i studenta po user_id (idempotentne dla nowego usera).
		const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [TEST_USER_ID]);
		for (const r of rows.rows) {
			await pool.query("DELETE FROM competencies WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM passports WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [r.id]);
		}
		await pool.query("DELETE FROM students WHERE user_id = $1", [TEST_USER_ID]);
		// student.user_id ma FK do tabeli user (Better Auth) — kasujemy też usera.
		await pool.query('DELETE FROM "user" WHERE id = $1', [TEST_USER_ID]);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		schema = await import("@/lib/db/schema");
		pool = new Pool({ connectionString: DATABASE_URL });
		testDb = drizzle(pool, { schema });
		await cleanupUser();
		// FK students.user_id → user.id (Better Auth): zakładamy usera-rodzica.
		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'Test Krok0', 'krok0-integ@test.local', true, now(), now())`,
			[TEST_USER_ID],
		);
	});

	afterAll(async () => {
		await cleanupUser();
		await pool?.end();
	});

	beforeEach(() => {
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
	});

	it("careerGoal z Kroku 0 (w body submitu) ląduje w students.career_goal", async () => {
		const { POST } = await import("../route");
		const body = {
			university: MAPPED_UNIVERSITY,
			fieldOfStudy: "Informatyka",
			semester: 4,
			careerGoal: KROK0_GOAL, // ← cel ustalony w Kroku 0, niesiony przez submit
			syllabusText: "",
			competencies: ["Python", "SQL", "Statystyka", "Git", "Wizualizacja danych"].map(
				// AG.2: kontrakt legacy string[] skasowany — testy kroków wysyłają obiekty.
				(name) => ({ name, level: 3, marketPercentage: 50, inSyllabus: false }),
			),
		};
		const res = await POST(
			new Request("http://localhost/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		);

		// 200 (AI atrapowane — bez aiGenerationFailed). Anty-mask: nie sam status.
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean; studentId: string };
		expect(json.success).toBe(true);

		// DOWÓD persystencji celu: czytamy realny wiersz z bazy.
		const [row] = await testDb
			.select({ careerGoal: schema.students.careerGoal })
			.from(schema.students)
			.where(eq(schema.students.userId, TEST_USER_ID));
		expect(row).toBeTruthy();
		expect(row.careerGoal).toBe(KROK0_GOAL);
	});
});
