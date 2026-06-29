// @vitest-environment node
//
// REGRESJA głównego błędu (krok 2 fali A) — POST /api/onboarding NIE zapala
// onboardingCompleted przedwcześnie.
//
// SEDNO (plan §"Stan obecny" krok 3): dotąd POST /api/onboarding zapalał
// onboardingCompleted=true już po Kroku 3 (Kompetencje) → powrót po przerwaniu
// kierował na dashboard z pominięciem kroków 4 (Samoocena) i 5 (Wnioski).
// Po poprawce: completed ZOSTAJE false (zapala je dopiero POST .../complete na
// końcu kreatora), a onboarding_step rośnie do 3 (high-water-mark "wznów od 3").
//
// Test REALNY (nie mock bazy — lekcja split-frontend-backend / skill QA §2 #4):
// wołamy prawdziwy handler na prawdziwej bazie testowej :5433 i czytamy zapisany
// wiersz. Mock tylko na granicy: auth, rate-limit, AI (gaps/skill-map poza tx).
//
// Wymaga DATABASE_URL na :5433 (po pnpm db:migrate:test + seed tenanta
// wsb-merito-szczecin/__unmapped). Bez lokalnej bazy → describe.skip (nie failuje).

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const TEST_USER_ID = "u-onboarding-not-complete-integ";
const MAPPED_UNIVERSITY = "WSB Merito Szczecin";

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
vi.mock("@/lib/ai/generate-gaps", () => ({ generateGaps: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/generate-skill-map", () => ({ generateSkillMap: vi.fn(async () => undefined) }));

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("POST /api/onboarding NIE zapala ukończenia przedwcześnie (realna baza)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu.
	let testDb: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie po env.
	let schema: any;

	async function cleanupUser() {
		if (!pool) return;
		const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [TEST_USER_ID]);
		for (const r of rows.rows) {
			await pool.query("DELETE FROM competencies WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM gaps WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM skill_maps WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM passports WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [r.id]);
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
			 VALUES ($1, 'Test NotComplete', 'not-complete-integ@test.local', true, now(), now())`,
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

	it("po POST: onboardingCompleted=false ORAZ onboardingStep=3", async () => {
		const { POST } = await import("../route");
		const body = {
			university: MAPPED_UNIVERSITY,
			fieldOfStudy: "Informatyka",
			semester: 4,
			careerGoal: "Data Analyst",
			syllabusText: "",
			competencies: ["Python", "SQL", "Statystyka", "Git", "Wizualizacja danych"],
		};
		const res = await POST(
			new Request("http://localhost/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		);
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean };
		expect(json.success).toBe(true);

		// DOWÓD: czytamy realny wiersz — completed NIE zapalone, step podniesiony do 3.
		const [row] = await testDb
			.select({
				onboardingCompleted: schema.students.onboardingCompleted,
				onboardingStep: schema.students.onboardingStep,
			})
			.from(schema.students)
			.where(eq(schema.students.userId, TEST_USER_ID));
		expect(row).toBeTruthy();
		expect(row.onboardingCompleted).toBe(false);
		expect(row.onboardingStep).toBe(3);
	});

	it("ponowny POST nie cofa kroku poniżej 3 (GREATEST, high-water-mark)", async () => {
		const { POST } = await import("../route");
		// Najpierw podnieś step ręcznie powyżej 3 (symulacja kroku 4/5 przez advance).
		await pool?.query("UPDATE students SET onboarding_step = 5 WHERE user_id = $1", [TEST_USER_ID]);

		const body = {
			university: MAPPED_UNIVERSITY,
			fieldOfStudy: "Informatyka",
			semester: 4,
			careerGoal: "Data Analyst",
			syllabusText: "",
			competencies: ["Python", "SQL", "Statystyka", "Git", "Wizualizacja danych", "Pandas"],
		};
		const res = await POST(
			new Request("http://localhost/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		);
		expect(res.status).toBe(200);

		const [row] = await testDb
			.select({ onboardingStep: schema.students.onboardingStep })
			.from(schema.students)
			.where(eq(schema.students.userId, TEST_USER_ID));
		// GREATEST(5, 3) = 5 — re-submit kroku 3 NIE cofa wyżej osiągniętego kroku.
		expect(row.onboardingStep).toBe(5);
	});
});

// ============================================================================
// PARTIA 4 — NOWY kontrakt onboardingu (obiekty z poziomem) na REALNEJ bazie.
//
// Sedno (weryfikacja realnej ścieżki): student wybiera kompetencje z KATALOGU RYNKU
// z poziomem posiadania (2/3/4). Po POST:
//   • kompetencje zapisane ze statusem z levelToStatus + samooceną + verified_by_method='self';
//   • luki liczone DETERMINISTYCZNIE = katalog rynku \ wybór (popyt z job_market_data),
//     BEZ modelu — „realne podpowiedzi z rynku" (persistMarketGaps, NIEzamockowany tu);
//   • pokrycie paszportu == front computeMarketCoverage (parytet liczby).
//
// Hermetyczny: własny user + własny seed job_market_data (cel „QA-Integ-Path-Partia4"),
// sprzątany w afterAll. generateSkillMap zamockowany (graf poza zakresem tej asercji).
// ============================================================================
const NEW_USER_ID = "u-onboarding-new-contract-integ";
const CG = "QA-Integ-Path-Partia4"; // unikalny cel — własny katalog rynku, brak kolizji z seedem

dBack("POST /api/onboarding — nowy kontrakt Partii 4 (obiekty z poziomem, realna baza)", () => {
	let pool: Pool | undefined;

	async function cleanup() {
		if (!pool) return;
		const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [NEW_USER_ID]);
		for (const r of rows.rows) {
			await pool.query("DELETE FROM competencies WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM gaps WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM skill_maps WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM passports WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [r.id]);
		}
		await pool.query("DELETE FROM students WHERE user_id = $1", [NEW_USER_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [NEW_USER_ID]);
		await pool.query("DELETE FROM job_market_data WHERE career_goal = $1", [CG]);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		pool = new Pool({ connectionString: DATABASE_URL });
		await cleanup();
		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'Test NewContract', 'new-contract-integ@test.local', true, now(), now())`,
			[NEW_USER_ID],
		);
		// Katalog rynku celu CG — 4 kompetencje malejąco wg popytu.
		const market: [string, number, string][] = [
			["SQL", 90, "Dane"],
			["Python", 70, "Język"],
			["Pandas", 40, "Biblioteka"],
			["Docker", 20, "DevOps"],
		];
		for (const [name, demand, cat] of market) {
			await pool.query(
				"INSERT INTO job_market_data (career_goal, competency_name, demand_percentage, category) VALUES ($1, $2, $3, $4)",
				[CG, name, demand, cat],
			);
		}
	});

	afterAll(async () => {
		await cleanup();
		await pool?.end();
	});

	beforeEach(() => {
		getSessionMock.mockResolvedValue({ user: { id: NEW_USER_ID } });
	});

	it("obiekty z poziomem → kompetencje (status+samoocena) + luki DETERMINISTYCZNE z rynku + pokrycie paszportu", async () => {
		const { POST } = await import("../route");
		const db = pool;
		if (!db) throw new Error("Brak puli połączeń (baza testowa) — test nie powinien tu dotrzeć.");
		const body = {
			university: MAPPED_UNIVERSITY,
			fieldOfStudy: "Informatyka",
			semester: 4,
			careerGoal: CG,
			syllabusText: "",
			competencies: [
				{ name: "SQL", level: 3, marketPercentage: 90, inSyllabus: false }, // → acquired
				{ name: "Python", level: 2, marketPercentage: 70, inSyllabus: true }, // → in_progress
			],
		};
		const res = await POST(
			new Request("http://localhost/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		);
		expect(res.status).toBe(200);

		// Student: krok 3 NIE domyka onboardingu (completed=false), step=3.
		const { rows: sRows } = await db.query(
			"SELECT id, onboarding_completed, onboarding_step FROM students WHERE user_id = $1",
			[NEW_USER_ID],
		);
		const sid = sRows[0].id;
		expect(sRows[0].onboarding_completed).toBe(false);
		expect(sRows[0].onboarding_step).toBe(3);

		// Kompetencje: status z levelToStatus, samoocena = poziom, verified_by_method='self' (Beta).
		const { rows: cRows } = await db.query(
			"SELECT name, status, self_assessment, verified_by_method, market_percentage FROM competencies WHERE student_id = $1",
			[sid],
		);
		const byName = Object.fromEntries(cRows.map((r) => [r.name, r]));
		expect(byName.SQL).toMatchObject({
			status: "acquired",
			self_assessment: 3,
			verified_by_method: "self",
			market_percentage: 90,
		});
		expect(byName.Python).toMatchObject({
			status: "in_progress",
			self_assessment: 2,
			verified_by_method: "self",
			market_percentage: 70,
		});

		// Luki DETERMINISTYCZNE = katalog rynku \ wybór: Pandas (40→important/5h), Docker (20→nice/3h).
		const { rows: gRows } = await db.query(
			"SELECT competency_name, priority, estimated_hours, market_percentage FROM gaps WHERE student_id = $1 ORDER BY market_percentage DESC",
			[sid],
		);
		expect(gRows.map((r) => r.competency_name)).toEqual(["Pandas", "Docker"]);
		expect(gRows[0]).toMatchObject({
			priority: "important",
			estimated_hours: 5,
			market_percentage: 40,
		});
		expect(gRows[1]).toMatchObject({
			priority: "nice_to_have",
			estimated_hours: 3,
			market_percentage: 20,
		});

		// Pokrycie paszportu = round((1.0 + 0.5) / 4 * 100) = 38 — PARYTET z front computeMarketCoverage.
		const { rows: pRows } = await db.query(
			"SELECT market_coverage_percent FROM passports WHERE student_id = $1",
			[sid],
		);
		expect(pRows[0].market_coverage_percent).toBe(38);
	});
});
