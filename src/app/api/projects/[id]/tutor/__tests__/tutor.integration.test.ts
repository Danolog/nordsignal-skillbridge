// @vitest-environment node
//
// C11/1.13 — DoD NA REALNEJ BAZIE: endpoint tutora sokratycznego.
//
// Przebieg dowodu (runTutorTurn ZMOCKOWANE — zero LLM; baza i RLS realne):
//  1. Flaga off → trasa nie istnieje (404), zero zapisów.
//  2. POST tura 1: kontekst budowany z DB (projekt+rubryka; bez zgłoszenia =
//     brief null), para user+ai utrwalona przez withTenantContext (RLS).
//  3. POST tura 2: historia z BAZY trafia do modelu (skoro model to atrapa,
//     jedynym źródłem historii jest tabela tutor_turns). ∎
//  4. Brief+recenzja z aiReviewJson zgłoszenia wchodzą do kontekstu.
//  5. Limit tur w KODZIE: MAX_TUTOR_TURNS odpowiedzi AI → 409, model nie wołany.
//  6. Filtr kryzysowy PRZED modelem: crisis=true, zero zapisów, zero wywołań.
//  7. Izolacja: drugi student nie widzi rozmowy pierwszego (GET pusty).
//
// Wymaga DATABASE_URL :5433 po `pnpm db:migrate:test` (tabela 0031).

import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_TUTOR_TURNS, TUTOR_FALLBACK_REPLY } from "@/lib/ai/project-tutor";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const TEST_USER_ID = "u-tutor-integ";
const TEST_USER_ID_2 = "u-tutor-integ-2";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null, aiHeavy: null, tutorDaily: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

// Warstwa AI zmockowana CZĘŚCIOWO: runTutorTurn to atrapa (zero LLM),
// reszta modułu (stałe, formatTutorContext) zostaje realna.
const runTutorTurnMock = vi.fn();
vi.mock("@/lib/ai/project-tutor", async (importOriginal) => {
	const orig = await importOriginal<typeof import("@/lib/ai/project-tutor")>();
	return { ...orig, runTutorTurn: (...a: unknown[]) => runTutorTurnMock(...a) };
});

// Krok 1 potoku zmockowany — test nie woła GitHub API.
const fetchContentMock = vi.fn();
vi.mock("@/lib/ai/pipeline/step1-fetch-content", () => ({
	fetchContent: (...a: unknown[]) => fetchContentMock(...a),
}));

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("C11/1.13 · endpoint tutora sokratycznego (realna baza, DoD)", () => {
	let pool: Pool | undefined;
	let tenantId = "";
	let studentId = "";
	let student2Id = "";
	let projectId = "";
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie po mockach.
	let route: any;

	const params = (id: string) => ({ params: Promise.resolve({ id }) });
	const postReq = (message: unknown) =>
		new Request("http://test.local/api/projects/x/tutor", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ message }),
		});

	async function cleanup() {
		if (!pool) return;
		for (const uid of [TEST_USER_ID, TEST_USER_ID_2]) {
			const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [uid]);
			for (const r of rows.rows) {
				await pool.query("DELETE FROM tutor_turns WHERE student_id = $1", [r.id]);
				await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [r.id]);
			}
			await pool.query("DELETE FROM students WHERE user_id = $1", [uid]);
			await pool.query('DELETE FROM "user" WHERE id = $1', [uid]);
		}
		if (projectId) await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		process.env.FLAG_SOCRATIC_TUTOR = "1";
		pool = new Pool({ connectionString: DATABASE_URL });

		const t = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped' LIMIT 1");
		tenantId = t.rows[0].id;

		// Cleanup PRZED seedem (posprzątanie po ubitym przebiegu); projekt po
		// poprzednim przebiegu kasujemy po slugu, bo projectId jeszcze puste.
		await pool.query(
			"DELETE FROM tutor_turns WHERE project_id IN (SELECT id FROM projects WHERE slug = 'tutor-integ-projekt')",
		);
		await pool.query(
			"DELETE FROM project_submissions WHERE project_id IN (SELECT id FROM projects WHERE slug = 'tutor-integ-projekt')",
		);
		await pool.query("DELETE FROM projects WHERE slug = 'tutor-integ-projekt'");
		await cleanup();
		const p = await pool.query(
			`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, rubric_json)
			 VALUES ('tutor-integ-projekt', 'Analiza sprzedaży (integ)', 'Zbadaj dane sprzedażowe.', 'L2', 20, 'open_data',
			   '[{"criterion":"Jakość analizy","weight":40,"description":"Wnioski poparte danymi"}]'::jsonb)
			 RETURNING id`,
		);
		projectId = p.rows[0].id;

		for (const [uid, email] of [
			[TEST_USER_ID, "tutor-integ@test.local"],
			[TEST_USER_ID_2, "tutor-integ-2@test.local"],
		]) {
			await pool.query(
				`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
				 VALUES ($1, 'Tutor Integ', $2, true, now(), now())`,
				[uid, email],
			);
		}
		const s1 = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Uczelnia Testowa', 'Informatyka', 4, 'Data Analyst') RETURNING id`,
			[TEST_USER_ID, tenantId],
		);
		studentId = s1.rows[0].id;
		const s2 = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Uczelnia Testowa', 'Informatyka', 4, 'Data Analyst') RETURNING id`,
			[TEST_USER_ID_2, tenantId],
		);
		student2Id = s2.rows[0].id;

		route = await import("../route");
	});

	afterAll(async () => {
		delete process.env.FLAG_SOCRATIC_TUTOR;
		await cleanup();
		await pool?.end();
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		process.env.FLAG_SOCRATIC_TUTOR = "1";
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
		runTutorTurnMock.mockResolvedValue({ reply: "A co już próbowałeś?", guarded: false });
		fetchContentMock.mockResolvedValue({
			ok: true,
			data: { artifact: "=== analiza.py (L1–L2) ===\nimport pandas as pd" },
			flags: [],
		});
		await pool?.query("DELETE FROM tutor_turns WHERE student_id IN ($1, $2)", [
			studentId,
			student2Id,
		]);
		await pool?.query("DELETE FROM project_submissions WHERE student_id IN ($1, $2)", [
			studentId,
			student2Id,
		]);
	});

	it("flaga off → 404 dla GET i POST, zero zapisów i wywołań modelu", async () => {
		process.env.FLAG_SOCRATIC_TUTOR = "0";
		const get = await route.GET(new Request("http://t"), params(projectId));
		const post = await route.POST(postReq("Pomóż mi"), params(projectId));
		expect(get.status).toBe(404);
		expect(post.status).toBe(404);
		expect(runTutorTurnMock).not.toHaveBeenCalled();
		const rows = await pool?.query("SELECT count(*)::int AS c FROM tutor_turns");
		expect(rows?.rows[0].c).toBe(0);
	});

	it("tura 1: kontekst z DB (projekt+rubryka, brief null bez zgłoszenia), para user+ai utrwalona", async () => {
		const res = await route.POST(postReq("Od czego zacząć?"), params(projectId));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({
			reply: "A co już próbowałeś?",
			guarded: false,
			turnsUsed: 1,
			maxTurns: MAX_TUTOR_TURNS,
		});

		const args = runTutorTurnMock.mock.calls[0][0];
		expect(args.userMessage).toBe("Od czego zacząć?");
		expect(args.history).toEqual([]);
		expect(args.context.title).toBe("Analiza sprzedaży (integ)");
		expect(args.context.rubric[0].criterion).toBe("Jakość analizy");
		expect(args.context.brief).toBeNull();
		expect(args.context.reviewSummary).toBeNull();
		expect(args.context.repoExcerpt).toBeNull();
		expect(fetchContentMock).not.toHaveBeenCalled();
		expect(args.attribution).toEqual({ studentId, tenantId });

		const rows = await pool?.query(
			"SELECT role, content, turn_index FROM tutor_turns WHERE student_id = $1 ORDER BY turn_index, role",
			[studentId],
		);
		expect(rows?.rows).toEqual([
			{ role: "ai", content: "A co już próbowałeś?", turn_index: 1 },
			{ role: "user", content: "Od czego zacząć?", turn_index: 1 },
		]);
	});

	it("tura 2: historia z BAZY trafia do modelu; GET rehydruje rozmowę", async () => {
		await route.POST(postReq("Od czego zacząć?"), params(projectId));
		const res2 = await route.POST(postReq("Spróbowałem pandas"), params(projectId));
		expect(res2.status).toBe(200);
		expect((await res2.json()).turnsUsed).toBe(2);

		// Model to atrapa — historia w argumentach MUSI pochodzić z tutor_turns.
		const args = runTutorTurnMock.mock.calls[1][0];
		expect(args.history).toEqual([
			{ role: "user", content: "Od czego zacząć?" },
			{ role: "ai", content: "A co już próbowałeś?" },
		]);

		const get = await route.GET(new Request("http://t"), params(projectId));
		const body = await get.json();
		expect(body.turnsUsed).toBe(2);
		expect(body.maxTurns).toBe(MAX_TUTOR_TURNS);
		expect(body.turns).toHaveLength(4);
	});

	it("brief + stan recenzji z aiReviewJson zgłoszenia wchodzą do kontekstu; repo przez krok 1", async () => {
		await pool?.query(
			`INSERT INTO project_submissions (student_id, tenant_id, project_id, repo_url, status, score, ai_review_json)
			 VALUES ($1, $2, $3, 'https://github.com/student/analiza', 'submitted', 55,
			   '{"brief":{"objective":"Policz sezonowość","suggestedSteps":["Wczytaj"],"successDefinition":"Raport"}}'::jsonb)`,
			[studentId, tenantId, projectId],
		);
		const res = await route.POST(postReq("Co poprawić?"), params(projectId));
		expect(res.status).toBe(200);

		const args = runTutorTurnMock.mock.calls[0][0];
		expect(args.context.brief).toMatchObject({ objective: "Policz sezonowość" });
		expect(args.context.reviewSummary).toContain("status submitted");
		expect(args.context.reviewSummary).toContain("wynik 55/100");
		expect(fetchContentMock).toHaveBeenCalledTimes(1);
		expect(args.context.repoExcerpt).toContain("import pandas as pd");
	});

	it("awaria pobierania repo NIE blokuje tury (best-effort)", async () => {
		await pool?.query(
			`INSERT INTO project_submissions (student_id, tenant_id, project_id, repo_url, status)
			 VALUES ($1, $2, $3, 'https://github.com/student/analiza', 'submitted')`,
			[studentId, tenantId, projectId],
		);
		fetchContentMock.mockRejectedValue(new Error("GitHub down"));
		const res = await route.POST(postReq("Co dalej?"), params(projectId));
		expect(res.status).toBe(200);
		expect(runTutorTurnMock.mock.calls[0][0].context.repoExcerpt).toBeNull();
	});

	it("limit tur w KODZIE: MAX_TUTOR_TURNS odpowiedzi AI → 409, model NIE wołany", async () => {
		const values: string[] = [];
		for (let i = 1; i <= MAX_TUTOR_TURNS; i++) {
			values.push(`('${studentId}', '${tenantId}', '${projectId}', 'ai', 'odp ${i}', ${i})`);
		}
		await pool?.query(
			`INSERT INTO tutor_turns (student_id, tenant_id, project_id, role, content, turn_index) VALUES ${values.join(",")}`,
		);
		const res = await route.POST(postReq("Jeszcze jedno pytanie"), params(projectId));
		expect(res.status).toBe(409);
		expect(runTutorTurnMock).not.toHaveBeenCalled();
	});

	it("filtr kryzysowy PRZED modelem: crisis=true, zero zapisów, zero wywołań", async () => {
		const res = await route.POST(postReq("mam myśli samobójcze"), params(projectId));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ crisis: true });
		expect(runTutorTurnMock).not.toHaveBeenCalled();
		const rows = await pool?.query("SELECT count(*)::int AS c FROM tutor_turns");
		expect(rows?.rows[0].c).toBe(0);
	});

	it("fallback sędziego (guarded=true) też jest utrwalany — rozmowa spójna przy rehydracji", async () => {
		runTutorTurnMock.mockResolvedValue({ reply: TUTOR_FALLBACK_REPLY, guarded: true });
		const res = await route.POST(postReq("Daj mi gotowy kod"), params(projectId));
		expect((await res.json()).guarded).toBe(true);
		const rows = await pool?.query(
			"SELECT content FROM tutor_turns WHERE student_id = $1 AND role = 'ai'",
			[studentId],
		);
		expect(rows?.rows[0].content).toBe(TUTOR_FALLBACK_REPLY);
	});

	it("izolacja: drugi student nie widzi rozmowy pierwszego (GET pusty)", async () => {
		await route.POST(postReq("Od czego zacząć?"), params(projectId));
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID_2 } });
		const get = await route.GET(new Request("http://t"), params(projectId));
		const body = await get.json();
		expect(body.turns).toEqual([]);
		expect(body.turnsUsed).toBe(0);
	});

	it("walidacje: złe uuid → 400, pusta wiadomość → 400, brak sesji → 401, obcy projekt → 404", async () => {
		expect((await route.POST(postReq("x"), params("nie-uuid"))).status).toBe(400);
		expect((await route.POST(postReq("   "), params(projectId))).status).toBe(400);

		getSessionMock.mockResolvedValue(null);
		expect((await route.POST(postReq("x"), params(projectId))).status).toBe(401);

		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
		const ghost = "00000000-0000-4000-8000-000000000000";
		expect((await route.POST(postReq("x"), params(ghost))).status).toBe(404);
	});
});
