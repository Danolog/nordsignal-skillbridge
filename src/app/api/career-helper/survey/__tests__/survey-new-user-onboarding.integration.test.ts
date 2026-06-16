// @vitest-environment node
//
// BLOCKER onboardingu (zgłoszenie Darka, test prod 2026-06-16) — test integracyjny
// REALNEJ ścieżki "Krok 0" Pomocnika kariery dla NOWEGO użytkownika.
//
// SEDNO: w strumieniu E (#5) Pomocnik został osadzony jako Krok 0 wizarda onboardingu
// dla NOWEGO studenta (onboardingCompleted=FALSE, BRAK rekordu w `students` — student
// powstaje dopiero w finalnym POST /api/onboarding). Ale endpoint zapisu ankiety
// POST /api/career-helper/survey wywoła resolveStudent(), która zwraca 404, gdy nie ma
// rekordu studenta. Efekt: nowy użytkownik dostaje 404 → front pokazuje "Nie udało się
// zapisać", onboarding zablokowany na Kroku 0.
//
// Dlaczego e2e Z5 to przepuścił (jednym zdaniem): test "Krok 0" loguje się kontem `b4`
// z seeda, które JUŻ MA rekord `students` (tylko onboardingCompleted=FALSE) — więc
// resolveStudent() przechodzi; brak rekordu studenta = sytuacja świeżo zarejestrowanego
// użytkownika nie była pokryta.
//
// Wzorzec testu: jak onboarding-career-goal-krok0.integration.test.ts — REALNY handler
// na REALNEJ bazie testowej (:5433), atrapy tylko na granicy (auth + rate-limit). DB i
// route NIE są mockowane — to jest sedno testu integracyjnego.
//
// Wymaga DATABASE_URL na lokalny kontener testowy (postgres :5433, po
// `pnpm db:migrate:test`). Bez lokalnej bazy → describe pomijane (skip).

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const NEW_USER_ID = "u-survey-new-user-no-student";

// Atrapy WYŁĄCZNIE na granicy (poza kontraktem zapisu ankiety): auth (sesja) + rate-limit.
const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null, aiHeavy: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));
// AI poza kontraktem (onboarding finalny woła gaps/skill-map) — atrapujemy.
vi.mock("@/lib/ai/generate-gaps", () => ({ generateGaps: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/generate-skill-map", () => ({ generateSkillMap: vi.fn(async () => undefined) }));

const dBack = isLocalTestDb ? describe : describe.skip;

const SURVEY_ANSWERS = {
	q1: "Praca w branży zgodnej ze studiami",
	q2: "W zespole — energia od innych ludzi",
	q3: ["Rozwiązywanie konkretnych problemów", "Praca z technologią"],
	q4: "Spodziewam się, że pomożesz mi nazwać, co mnie naprawdę interesuje zawodowo.",
};

dBack("POST /api/career-helper/survey — NOWY user bez rekordu students (Krok 0)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu.
	let testDb: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie po env.
	let schema: any;

	async function cleanupUser() {
		if (!pool) return;
		const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [NEW_USER_ID]);
		for (const r of rows.rows) {
			await pool.query("DELETE FROM career_helper_turns WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM career_helper_sessions WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM competencies WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM passports WHERE student_id = $1", [r.id]);
		}
		await pool.query("DELETE FROM students WHERE user_id = $1", [NEW_USER_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [NEW_USER_ID]);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		schema = await import("@/lib/db/schema");
		pool = new Pool({ connectionString: DATABASE_URL });
		testDb = drizzle(pool, { schema });
		await cleanupUser();
		// Świeżo zarejestrowany użytkownik Better Auth: tylko wiersz `user`, BEZ `students`.
		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'Nowy User', 'survey-new-user@test.local', true, now(), now())`,
			[NEW_USER_ID],
		);
	});

	afterAll(async () => {
		await cleanupUser();
		await pool?.end();
	});

	beforeEach(() => {
		getSessionMock.mockResolvedValue({ user: { id: NEW_USER_ID } });
	});

	it("nowy user (bez rekordu students) zapisuje ankietę i dostaje sesję — NIE 404", async () => {
		const { POST } = await import("../route");
		const res = await POST(
			new Request("http://localhost/api/career-helper/survey", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ answers: SURVEY_ANSWERS }),
			}),
		);

		// Anty-mask: czytamy ciało, nie tylko status. Blocker = 404 (brak rekordu studenta).
		const json = (await res.json()) as { sessionId?: string; error?: string };
		expect(res.status, `body: ${JSON.stringify(json)}`).toBe(200);
		expect(json.sessionId).toBeTruthy();

		// DOWÓD persystencji: sesja Pomocnika istnieje w bazie i niesie zapisane odpowiedzi.
		const [row] = await testDb
			.select({
				id: schema.careerHelperSessions.id,
				answers: schema.careerHelperSessions.answers,
				status: schema.careerHelperSessions.status,
			})
			.from(schema.careerHelperSessions)
			.where(eq(schema.careerHelperSessions.id, json.sessionId));
		expect(row).toBeTruthy();
		expect(row.status).toBe("in_progress");
		expect(row.answers).toEqual(SURVEY_ANSWERS);
	});

	it("prowizoryczny student z Kroku 0 jest UPSERT-owany przez finalny POST /api/onboarding (bez sieroty)", async () => {
		// 1) Wejście w Krok 0 → prowizoryczny student (placeholdery, tenant __unmapped).
		const survey = await import("../route");
		const r1 = await survey.POST(
			new Request("http://localhost/api/career-helper/survey", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ answers: SURVEY_ANSWERS }),
			}),
		);
		expect(r1.status).toBe(200);

		// Prowizoryczny wiersz: jeden student, placeholdery, tenant __unmapped.
		const provisional = await pool?.query(
			`SELECT s.university, s.field_of_study, s.career_goal, s.onboarding_completed, t.slug AS tenant_slug
			   FROM students s JOIN tenants t ON t.id = s.tenant_id WHERE s.user_id = $1`,
			[NEW_USER_ID],
		);
		expect(provisional?.rowCount).toBe(1);
		expect(provisional?.rows[0].university).toBe("");
		expect(provisional?.rows[0].career_goal).toBe("");
		expect(provisional?.rows[0].onboarding_completed).toBe(false);
		expect(provisional?.rows[0].tenant_slug).toBe("__unmapped");

		// 2) Dokończenie onboardingu (Profil + Sylabus + Kompetencje) → finalny POST.
		const onboarding = await import("@/app/api/onboarding/route");
		const r2 = await onboarding.POST(
			new Request("http://localhost/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					university: "WSB Merito Szczecin", // mapuje na realny tenant (re-resolve)
					fieldOfStudy: "Informatyka",
					semester: 4,
					careerGoal: "Data Analyst",
					syllabusText: "",
					competencies: ["Python", "SQL", "Statystyka", "Git", "Wizualizacja danych"],
				}),
			}),
		);
		expect(r2.status).toBe(200);

		// DOWÓD braku sieroty: NADAL jeden wiersz studenta (UPSERT, nie INSERT obok),
		// placeholdery nadpisane realnymi danymi, tenant re-resolve'owany.
		const after = await pool?.query(
			`SELECT s.university, s.career_goal, s.onboarding_completed, t.slug AS tenant_slug
			   FROM students s JOIN tenants t ON t.id = s.tenant_id WHERE s.user_id = $1`,
			[NEW_USER_ID],
		);
		expect(after?.rowCount).toBe(1);
		expect(after?.rows[0].university).toBe("WSB Merito Szczecin");
		expect(after?.rows[0].career_goal).toBe("Data Analyst");
		expect(after?.rows[0].onboarding_completed).toBe(true);
		expect(after?.rows[0].tenant_slug).toBe("wsb-merito-szczecin");
	});
});
