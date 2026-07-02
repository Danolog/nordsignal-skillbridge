// @vitest-environment node
//
// 0.2b: test integracyjny atomowego upsertu POST /api/projects/[id]/submit —
// UNIQUE(student_id, project_id) (drizzle/0021) + onConflictDoUpdate zamiast
// poprzedniego find-then-write (wyścig TOCTOU, patrz tools/remediate-duplicate-
// submissions.ts z 0.2a).
//
// Wzorzec: brief-error-handling.integration — realny handler na realnej bazie
// testowej, atrapujemy TYLKO to, co poza kontrolą (auth, rate-limit, potok AI —
// runReviewPipeline). Baza, withTenantContext (RLS), upsert — realne.
//
// CO TESTUJEMY (sedno 0.2b):
//   1. Pierwszy submit → dokładnie JEDEN wiersz.
//   2. Drugi submit tego samego (student, projekt) → AKTUALIZUJE ten sam
//      wiersz (nie duplikuje); aiReviewJson scalany jsonb `||` (odpowiednik
//      poprzedniego {...existing, ...new} w JS, teraz atomowo w bazie).
//   3. Równoległe submity (symulacja wyścigu) → nadal dokładnie JEDEN wiersz —
//      dowód, że UNIQUE + onConflictDoUpdate faktycznie zamyka TOCTOU, które
//      poprzedni find-then-write (findFirst → insert/update) mógł przegapić.
//   4. Merge jsonb jest NULL-safe (audyt Fable 5, ODRZUCONE — naprawione):
//      submit na wiersz z ai_review_json=NULL (kolumna jest nullable, np.
//      tools/seed-e2e.ts wstawia takie wiersze) nie gubi świeżej recenzji —
//      bez coalesce(...,'{}') NULL || x = NULL w Postgresie.

import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

const TENANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const USER_ID = "submit-upsert-user-integ";
const STUDENT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const PROJECT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

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

const runReviewPipelineMock = vi.fn();
vi.mock("@/lib/ai/pipeline", () => ({
	runReviewPipeline: (...a: unknown[]) => runReviewPipelineMock(...a),
}));

function fakePipelineResult(opts: { score: number; extraKey: string; extraValue: string }) {
	return {
		score: opts.score,
		status: "submitted" as const,
		needsHumanReview: false,
		aiReviewJson: {
			review: {
				score: opts.score,
				feedback: "Test feedback.",
				cheatRiskScore: 0.1,
				criteriaScores: [],
			},
			[opts.extraKey]: opts.extraValue,
		},
		flags: [],
	};
}

let pool: Pool | undefined;

async function callSubmit(repoUrl: string): Promise<Response> {
	const { POST } = await import("@/app/api/projects/[id]/submit/route");
	return POST(
		new Request("http://localhost/api/projects/x/submit", {
			method: "POST",
			body: JSON.stringify({ repoUrl }),
		}),
		{ params: Promise.resolve({ id: PROJECT_ID }) },
	);
}

async function cleanupSubmissions(): Promise<void> {
	await pool?.query("DELETE FROM project_submissions WHERE project_id = $1", [PROJECT_ID]);
}

beforeAll(async () => {
	if (!isLocalTestDb) return;
	pool = new Pool({ connectionString: DATABASE_URL });

	const uq = await pool.query(
		"SELECT indexname FROM pg_indexes WHERE indexname = 'uq_project_submissions_student_project'",
	);
	if (uq.rowCount === 0) {
		throw new Error(
			"Baza testowa bez unikatu uq_project_submissions_student_project (migracja 0021 nie zastosowana). " +
				"Uruchom: pnpm db:migrate:test",
		);
	}

	await cleanupSubmissions();
	await pool.query("DELETE FROM students WHERE id = $1", [STUDENT_ID]);
	await pool.query("DELETE FROM projects WHERE id = $1", [PROJECT_ID]);
	await pool.query('DELETE FROM "user" WHERE id = $1', [USER_ID]);
	await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_ID]);

	await pool.query(
		"INSERT INTO tenants (id, slug, name) VALUES ($1,'submit-upsert-tenant','Submit Upsert Tenant')",
		[TENANT_ID],
	);
	await pool.query(
		'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ($1,$2,$3,true,now(),now())',
		[USER_ID, "Submit Upsert User", "submit-upsert@example.com"],
	);
	await pool.query(
		`INSERT INTO students (id, user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed, created_at, updated_at)
		 VALUES ($1,$2,$3,'Test Uni','Informatyka',4,'Data Scientist',true,now(),now())`,
		[STUDENT_ID, USER_ID, TENANT_ID],
	);
	await pool.query(
		`INSERT INTO projects (id, slug, title, description, level, estimated_hours, source_type, rubric_json, status)
		 VALUES ($1,'submit-upsert-project','Submit Upsert Project','Opis projektu testowego.','L1',4,'open_data','[]','active')`,
		[PROJECT_ID],
	);
}, 30_000);

afterAll(async () => {
	if (pool) {
		await cleanupSubmissions();
		await pool.query("DELETE FROM students WHERE id = $1", [STUDENT_ID]);
		await pool.query("DELETE FROM projects WHERE id = $1", [PROJECT_ID]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [USER_ID]);
		await pool.query("DELETE FROM tenants WHERE id = $1", [TENANT_ID]);
		await pool.end();
	}
});

beforeEach(() => {
	vi.clearAllMocks();
	getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
});

afterEach(async () => {
	await cleanupSubmissions();
});

d("POST /api/projects/[id]/submit — upsert atomowy (0.2b)", () => {
	it("pierwszy submit wstawia dokładnie jeden wiersz", async () => {
		runReviewPipelineMock.mockResolvedValue(
			fakePipelineResult({ score: 70, extraKey: "recommendation", extraValue: "approve" }),
		);

		const res = await callSubmit("https://github.com/example/repo-a");
		expect(res.status).toBe(200);

		const rows = await pool?.query(
			"SELECT id, score, ai_review_json FROM project_submissions WHERE student_id = $1 AND project_id = $2",
			[STUDENT_ID, PROJECT_ID],
		);
		expect(rows?.rows).toHaveLength(1);
		expect(rows?.rows[0].score).toBe(70);
		expect(rows?.rows[0].ai_review_json.recommendation).toBe("approve");
	});

	it("drugi submit (ten sam student+projekt) aktualizuje wiersz — nie duplikuje, jsonb scalany", async () => {
		runReviewPipelineMock.mockResolvedValue(
			fakePipelineResult({ score: 60, extraKey: "recommendation", extraValue: "revise" }),
		);
		await callSubmit("https://github.com/example/repo-b");

		runReviewPipelineMock.mockResolvedValue(
			fakePipelineResult({ score: 85, extraKey: "cheatSignals", extraValue: "clean" }),
		);
		const res2 = await callSubmit("https://github.com/example/repo-b");
		expect(res2.status).toBe(200);

		const rows = await pool?.query(
			"SELECT id, score, ai_review_json FROM project_submissions WHERE student_id = $1 AND project_id = $2",
			[STUDENT_ID, PROJECT_ID],
		);
		expect(rows?.rows).toHaveLength(1);
		// Pola płaskie (score) nadpisane wartością z DRUGIEGO wywołania.
		expect(rows?.rows[0].score).toBe(85);
		// jsonb `||` scala klucze z OBU wywołań — jak poprzedni {...existing, ...new} w JS.
		expect(rows?.rows[0].ai_review_json.recommendation).toBe("revise");
		expect(rows?.rows[0].ai_review_json.cheatSignals).toBe("clean");
	});

	it("submit na wiersz z ai_review_json=NULL (np. z seed-e2e) nie gubi świeżej recenzji", async () => {
		// Symuluje kształt wstawiany przez tools/seed-e2e.ts (audyt Fable 5) —
		// zgłoszenie bez aiReviewJson w ogóle, NULL w kolumnie.
		await pool?.query(
			`INSERT INTO project_submissions (id, student_id, tenant_id, project_id, status, needs_human_review, created_at, updated_at)
			 VALUES (gen_random_uuid(),$1,$2,$3,'submitted',false,now(),now())`,
			[STUDENT_ID, TENANT_ID, PROJECT_ID],
		);

		runReviewPipelineMock.mockResolvedValue(
			fakePipelineResult({ score: 90, extraKey: "recommendation", extraValue: "approve" }),
		);
		const res = await callSubmit("https://github.com/example/repo-null-merge");
		expect(res.status).toBe(200);

		const rows = await pool?.query(
			"SELECT ai_review_json FROM project_submissions WHERE student_id = $1 AND project_id = $2",
			[STUDENT_ID, PROJECT_ID],
		);
		expect(rows?.rows).toHaveLength(1);
		// Gdyby merge nie był NULL-safe (NULL || x = NULL w Postgresie), ta kolumna
		// wciąż byłaby NULL mimo statusu 200 — cicha utrata recenzji.
		expect(rows?.rows[0].ai_review_json).not.toBeNull();
		expect(rows?.rows[0].ai_review_json.recommendation).toBe("approve");
	});

	it("równoległe submity (wyścig) nie tworzą duplikatu — UNIQUE zamyka TOCTOU", async () => {
		runReviewPipelineMock.mockResolvedValue(
			fakePipelineResult({ score: 50, extraKey: "recommendation", extraValue: "race" }),
		);

		const [res1, res2] = await Promise.all([
			callSubmit("https://github.com/example/repo-race"),
			callSubmit("https://github.com/example/repo-race"),
		]);
		expect(res1.status).toBe(200);
		expect(res2.status).toBe(200);

		const rows = await pool?.query(
			"SELECT id FROM project_submissions WHERE student_id = $1 AND project_id = $2",
			[STUDENT_ID, PROJECT_ID],
		);
		expect(rows?.rows).toHaveLength(1);
	});
});
