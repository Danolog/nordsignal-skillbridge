// @vitest-environment node
//
// AG.7 — DoD NA REALNEJ BAZIE: „DRUGA sesja doradcy zna stan z PIERWSZEJ;
// kontekst zbudowany z DB, nie z modelu".
//
// Przebieg dowodu:
//  1. Sesja 1: POST /summary (generateSummary ZMOCKOWANE — zwraca zaakceptowane
//     podsumowanie) → trasa utrwala fakt w advisor_memory (realny INSERT przez
//     withTenantContext/RLS).
//  2. Sesja 2 (NOWY wiersz sesji): POST /turn — runTurn ZMOCKOWANE (zero LLM!),
//     przechwytuje argumenty → memoryContext zawiera treść podsumowania z sesji 1
//     ORAZ profil/luki czytane z tabel. Skoro model nie istnieje w teście,
//     jedynym możliwym źródłem kontekstu jest baza. ∎
//  3. Flaga off → memoryContext nie jest budowany, fakt nie jest zapisywany.
//
// Wymaga DATABASE_URL :5433 po `pnpm db:migrate:test` (tabela 0024).

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const TEST_USER_ID = "u-advisor-memory-integ";

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

// Warstwa AI zmockowana CZĘŚCIOWO: runTurn/generateSummary to atrapy (zero LLM),
// reszta modułu (stałe, detectCrisis) zostaje realna — trasy jej używają.
const runTurnMock = vi.fn();
const generateSummaryMock = vi.fn();
vi.mock("@/lib/ai/career-helper", async (importOriginal) => {
	const orig = await importOriginal<typeof import("@/lib/ai/career-helper")>();
	return {
		...orig,
		runTurn: (...a: unknown[]) => runTurnMock(...a),
		generateSummary: (...a: unknown[]) => generateSummaryMock(...a),
	};
});

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("AG.7 · pamięć doradcy między sesjami (realna baza, DoD)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu.
	let _testDb: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie po env.
	let schema: any;
	let studentId = "";
	let tenantId = "";
	let session1Id = "";
	let session2Id = "";

	async function cleanup() {
		if (!pool) return;
		const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [TEST_USER_ID]);
		for (const r of rows.rows) {
			await pool.query("DELETE FROM advisor_memory WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM student_career_paths WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM career_helper_turns WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM career_helper_sessions WHERE student_id = $1", [r.id]);
			await pool.query("DELETE FROM gaps WHERE student_id = $1", [r.id]);
		}
		await pool.query("DELETE FROM students WHERE user_id = $1", [TEST_USER_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [TEST_USER_ID]);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		schema = await import("@/lib/db/schema");
		pool = new Pool({ connectionString: DATABASE_URL });
		_testDb = drizzle(pool, { schema });
		await cleanup();

		const t = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped' LIMIT 1");
		tenantId = t.rows[0].id;

		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'Advisor Memory Integ', 'advisor-memory-integ@test.local', true, now(), now())`,
			[TEST_USER_ID],
		);
		const s = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Uczelnia Testowa', 'Informatyka', 4, 'Data Analyst') RETURNING id`,
			[TEST_USER_ID, tenantId],
		);
		studentId = s.rows[0].id;

		// Luka studenta — sekcja „Największe luki" w kontekście musi przyjść z DB.
		await pool.query(
			`INSERT INTO gaps (student_id, tenant_id, competency_name, priority, market_percentage, estimated_hours)
			 VALUES ($1, $2, 'SQL', 'important', 48, 5)`,
			[studentId, tenantId],
		);

		const mkSession = async () => {
			const r = await pool?.query(
				`INSERT INTO career_helper_sessions (student_id, tenant_id, answers)
				 VALUES ($1, $2, '{"q1":"dane"}'::jsonb) RETURNING id`,
				[studentId, tenantId],
			);
			return r?.rows[0].id as string;
		};
		session1Id = await mkSession();
		session2Id = await mkSession();
	});

	afterAll(async () => {
		await cleanup();
		await pool?.end();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
		vi.stubEnv("FLAG_ADVISOR_MEMORY", "1");
		generateSummaryMock.mockResolvedValue({
			judged: true,
			judgedFor: "R2",
			summaryText: "Z tego, co powiedziałeś, ciągnie Cię praca z danymi i porządkowanie chaosu.",
			careerPaths: [{ label: "Data Analyst", why: "pasja do danych" }],
		});
		runTurnMock.mockReturnValue({
			toUIMessageStreamResponse: () => new Response("ok"),
		});
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("DoD: sesja 1 utrwala fakt; DRUGA sesja dostaje kontekst z DB (model nieobecny)", async () => {
		// ── Sesja 1: /summary zapisuje fakt do advisor_memory ──────────────────
		const { POST: SUMMARY } = await import("../[id]/summary/route");
		const res1 = await SUMMARY(new Request("http://t.local", { method: "POST" }), {
			params: Promise.resolve({ id: session1Id }),
		});
		expect(res1.status).toBe(200);

		const memRows = await pool?.query(
			"SELECT kind, content, session_id FROM advisor_memory WHERE student_id = $1",
			[studentId],
		);
		expect(memRows?.rowCount).toBe(1);
		expect(memRows?.rows[0].kind).toBe("summary");
		expect(memRows?.rows[0].content).toContain("ciągnie Cię praca z danymi");
		expect(memRows?.rows[0].content).toContain("Data Analyst");
		expect(memRows?.rows[0].session_id).toBe(session1Id);

		// ── Sesja 2: /turn dostaje memoryContext zbudowany Z BAZY ──────────────
		const { POST: TURN } = await import("../[id]/turn/route");
		const res2 = await TURN(
			new Request("http://t.local", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			}),
			{ params: Promise.resolve({ id: session2Id }) },
		);
		expect(res2.status).toBe(200);

		expect(runTurnMock).toHaveBeenCalledOnce();
		const args = runTurnMock.mock.calls[0][0] as { memoryContext?: string };
		const ctx = args.memoryContext ?? "";
		// Fakt z PIERWSZEJ sesji (advisor_memory) — sedno DoD.
		expect(ctx).toContain("ciągnie Cię praca z danymi");
		// Profil i luki z istniejących tabel — kontekst z DB, nie z modelu
		// (runTurn to atrapa; żaden LLM w tym teście nie istnieje).
		expect(ctx).toContain("Data Analyst");
		expect(ctx).toContain("SQL (ważna)");
	});

	it("flaga OFF: /turn bez kontekstu, /summary nie zapisuje faktu (zero zmian)", async () => {
		vi.stubEnv("FLAG_ADVISOR_MEMORY", "");
		const before = await pool?.query(
			"SELECT count(*)::int AS c FROM advisor_memory WHERE student_id = $1",
			[studentId],
		);

		const { POST: TURN } = await import("../[id]/turn/route");
		const res = await TURN(
			new Request("http://t.local", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userMessage: "co dalej?" }),
			}),
			{ params: Promise.resolve({ id: session2Id }) },
		);
		expect(res.status).toBe(200);
		const args = runTurnMock.mock.calls[0][0] as { memoryContext?: string };
		expect(args.memoryContext).toBeUndefined();

		const { POST: SUMMARY } = await import("../[id]/summary/route");
		await SUMMARY(new Request("http://t.local", { method: "POST" }), {
			params: Promise.resolve({ id: session2Id }),
		});
		const after = await pool?.query(
			"SELECT count(*)::int AS c FROM advisor_memory WHERE student_id = $1",
			[studentId],
		);
		expect(after?.rows[0].c).toBe(before?.rows[0].c);
	});
});
