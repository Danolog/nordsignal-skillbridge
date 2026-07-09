// @vitest-environment node
//
// B7/1.16a (ADR-013) — DoD NA REALNEJ BAZIE: cykl życia obrony ustnej.
//
// Mocki: auth, rate-limit, runReviewPipeline (kontrolowany werdykt maszyny +
// vivaPrep), judgeVivaAnswer (skryptowane werdykty — zero LLM), reviewer auth.
// Baza, RLS-klasy tabel, trasy i transakcje — REALNE.
//
// Dowody:
//  1. Flaga off → trasy vivy nie istnieją (404).
//  2. Submit z werdyktem 'verified' → status ZDEMOTOWANY do 'submitted',
//     sesja pending z zamrożonymi pytaniami, projekcja aiReviewJson.viva.
//  3. start → in_progress + pytanie 0; answer×3 (2,2,1=5) → passed →
//     zgłoszenie 'verified' + resultJson + audyt viva.passed i verified.
//  4. Ścieżka failed (2,1,0=3 — próg 4/6) → 'submitted' + needsHumanReview.
//  5. Awaria sędziego → inconclusive + needsHumanReview (odpowiedź bez werdyktu).
//  6. Expiry: 0 odp. → expired + restart na TYCH SAMYCH pytaniach;
//     ≥1 odp. → inconclusive.
//  7. Decyzja człowieka approve → sesja superseded; start po decyzji → 409.
//  8. Re-submit → stara sesja superseded, stan viva zresetowany (nie przeżywa
//     płytkiego merge'a jsonb).
//  9. Generacja fail-closed (vivaPrep.questions=null) → sesja inconclusive
//     + needsHumanReview od razu.
// 10. Własność: cudzy student → 404. Tutor: otwarta obrona → 409.
//
// Wymaga DATABASE_URL :5433 po `pnpm db:migrate:test` (tabele 0032).

import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const TEST_USER_ID = "u-viva-integ";
const TEST_USER_ID_2 = "u-viva-integ-2";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null, aiHeavy: null, tutorDaily: null, vivaDaily: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

// Potok zmockowany — submit dostaje kontrolowany werdykt + vivaPrep.
const runReviewPipelineMock = vi.fn();
vi.mock("@/lib/ai/pipeline", async (importOriginal) => {
	const orig = await importOriginal<typeof import("@/lib/ai/pipeline")>();
	return { ...orig, runReviewPipeline: (...a: unknown[]) => runReviewPipelineMock(...a) };
});

// Sędzia zmockowany — skryptowane werdykty (zero LLM).
const judgeMock = vi.fn();
vi.mock("@/lib/viva/judge-answer", async (importOriginal) => {
	const orig = await importOriginal<typeof import("@/lib/viva/judge-answer")>();
	return { ...orig, judgeVivaAnswer: (...a: unknown[]) => judgeMock(...a) };
});

// Recenzent (decision route) zmockowany — operator.
const reviewerAuthMock = vi.fn();
vi.mock("@/lib/reviewer-auth", async (importOriginal) => {
	const orig = await importOriginal<typeof import("@/lib/reviewer-auth")>();
	return { ...orig, checkReviewerAuth: (...a: unknown[]) => reviewerAuthMock(...a) };
});

// Tutor: model zmockowany (test blokady w trakcie obrony).
const runTutorTurnMock = vi.fn();
vi.mock("@/lib/ai/project-tutor", async (importOriginal) => {
	const orig = await importOriginal<typeof import("@/lib/ai/project-tutor")>();
	return { ...orig, runTutorTurn: (...a: unknown[]) => runTutorTurnMock(...a) };
});

const QUESTIONS = [
	{ position: 0, question: "Dlaczego merge zamiast join?", filePath: "a.py", excerpt: "df.merge" },
	{
		position: 1,
		question: "Co przy brakach w kolumnie data?",
		filePath: "a.py",
		excerpt: "read_csv",
	},
	{ position: 2, question: "Skąd agregacja miesięczna?", filePath: "r.md", excerpt: "resample" },
];

function pipelineResult(overrides: Record<string, unknown> = {}) {
	return {
		score: 85,
		status: "verified",
		needsHumanReview: false,
		aiReviewJson: {
			review: { score: 85, feedback: "ok", cheatRiskScore: 0.1, criteriaScores: [] },
			recommendation: { verdict: "approve", rationale: "ok", evidenceRefs: [] },
		},
		flags: [],
		vivaPrep: { questions: QUESTIONS },
		...overrides,
	};
}

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("B7/1.16a · cykl życia obrony ustnej (realna baza, DoD)", () => {
	let pool: Pool | undefined;
	let tenantId = "";
	let studentId = "";
	let student2Id = "";
	let projectId = "";
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie po mockach.
	let submitRoute: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let vivaGetRoute: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let startRoute: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let answerRoute: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let decisionRoute: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let reviewVivaRoute: any;
	// biome-ignore lint/suspicious/noExplicitAny: jw.
	let tutorRoute: any;

	const params = (id: string) => ({ params: Promise.resolve({ id }) });
	const answerParams = (id: string, sessionId: string) => ({
		params: Promise.resolve({ id, sessionId }),
	});
	const jsonReq = (body: unknown) =>
		new Request("http://test.local/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});

	/** Submit przez REALNĄ trasę (potok zmockowany) → zwraca submissionId. */
	async function doSubmit(): Promise<string> {
		const res = await submitRoute.POST(
			jsonReq({ repoUrl: "https://github.com/student/analiza" }),
			params(projectId),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		return body.submission.id as string;
	}

	/** Start + n odpowiedzi. Zwraca sessionId i ostatnią odpowiedź trasy. */
	async function startAndAnswer(submissionId: string, count: number) {
		const startRes = await startRoute.POST(jsonReq({}), params(submissionId));
		expect(startRes.status).toBe(200);
		const sessionRow = await pool?.query(
			"SELECT id FROM viva_sessions WHERE submission_id = $1 AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1",
			[submissionId],
		);
		const sessionId = sessionRow?.rows[0].id as string;
		let last: Response | null = null;
		for (let i = 0; i < count; i++) {
			last = await answerRoute.POST(
				jsonReq({ answer: `Odpowiedź merytoryczna numer ${i + 1} o decyzjach w kodzie.` }),
				answerParams(submissionId, sessionId),
			);
		}
		return { sessionId, last };
	}

	async function cleanup() {
		if (!pool) return;
		for (const uid of [TEST_USER_ID, TEST_USER_ID_2]) {
			const rows = await pool.query("SELECT id FROM students WHERE user_id = $1", [uid]);
			for (const r of rows.rows) {
				await pool.query(
					"DELETE FROM viva_answers WHERE session_id IN (SELECT id FROM viva_sessions WHERE student_id = $1)",
					[r.id],
				);
				await pool.query("DELETE FROM viva_sessions WHERE student_id = $1", [r.id]);
				await pool.query(
					"DELETE FROM submission_reviews WHERE submission_id IN (SELECT id FROM project_submissions WHERE student_id = $1)",
					[r.id],
				);
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
		process.env.FLAG_VIVA_DEFENSE = "1";
		process.env.FLAG_HUMAN_REVIEW_QUEUE = "1";
		pool = new Pool({ connectionString: DATABASE_URL });

		const t = await pool.query("SELECT id FROM tenants WHERE slug = '__unmapped' LIMIT 1");
		tenantId = t.rows[0].id;

		await pool.query("DELETE FROM projects WHERE slug = 'viva-integ-projekt'");
		await cleanup();
		const p = await pool.query(
			`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, rubric_json)
			 VALUES ('viva-integ-projekt', 'Projekt viva (integ)', 'Opis.', 'L2', 20, 'open_data', '[]'::jsonb)
			 RETURNING id`,
		);
		projectId = p.rows[0].id;

		for (const [uid, email] of [
			[TEST_USER_ID, "viva-integ@test.local"],
			[TEST_USER_ID_2, "viva-integ-2@test.local"],
		]) {
			await pool.query(
				`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
				 VALUES ($1, 'Viva Integ', $2, true, now(), now())`,
				[uid, email],
			);
		}
		const s1 = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Uczelnia', 'Informatyka', 4, 'Data Analyst') RETURNING id`,
			[TEST_USER_ID, tenantId],
		);
		studentId = s1.rows[0].id;
		const s2 = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Uczelnia', 'Informatyka', 4, 'Data Analyst') RETURNING id`,
			[TEST_USER_ID_2, tenantId],
		);
		student2Id = s2.rows[0].id;

		submitRoute = await import("../../../../projects/[id]/submit/route");
		vivaGetRoute = await import("../route");
		startRoute = await import("../start/route");
		answerRoute = await import("../[sessionId]/answer/route");
		decisionRoute = await import("../../../../review-queue/[id]/decision/route");
		reviewVivaRoute = await import("../../../../review-queue/[id]/viva/route");
		tutorRoute = await import("../../../../projects/[id]/tutor/route");
	});

	afterAll(async () => {
		delete process.env.FLAG_VIVA_DEFENSE;
		delete process.env.FLAG_HUMAN_REVIEW_QUEUE;
		delete process.env.FLAG_SOCRATIC_TUTOR;
		await cleanup();
		await pool?.end();
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		process.env.FLAG_VIVA_DEFENSE = "1";
		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });
		runReviewPipelineMock.mockResolvedValue(pipelineResult());
		judgeMock.mockResolvedValue({ points: 2, justification: "trafna" });
		reviewerAuthMock.mockResolvedValue({ kind: "quality_operator", sessionId: "op-sess-1" });
		await pool?.query(
			"DELETE FROM viva_answers WHERE session_id IN (SELECT id FROM viva_sessions WHERE student_id IN ($1,$2))",
			[studentId, student2Id],
		);
		await pool?.query("DELETE FROM viva_sessions WHERE student_id IN ($1,$2)", [
			studentId,
			student2Id,
		]);
		await pool?.query(
			"DELETE FROM submission_reviews WHERE submission_id IN (SELECT id FROM project_submissions WHERE student_id IN ($1,$2))",
			[studentId, student2Id],
		);
		await pool?.query("DELETE FROM tutor_turns WHERE student_id IN ($1,$2)", [
			studentId,
			student2Id,
		]);
		await pool?.query("DELETE FROM project_submissions WHERE student_id IN ($1,$2)", [
			studentId,
			student2Id,
		]);
	});

	it("flaga off → trasy vivy nie istnieją (404), submit bez demotacji", async () => {
		process.env.FLAG_VIVA_DEFENSE = "0";
		runReviewPipelineMock.mockResolvedValue(pipelineResult({ vivaPrep: undefined }));
		const submissionId = await doSubmit();

		const row = await pool?.query("SELECT status FROM project_submissions WHERE id = $1", [
			submissionId,
		]);
		expect(row?.rows[0].status).toBe("verified"); // zachowanie sprzed B7

		expect((await vivaGetRoute.GET(new Request("http://t"), params(submissionId))).status).toBe(
			404,
		);
		expect((await startRoute.POST(jsonReq({}), params(submissionId))).status).toBe(404);
		// Potok NIE dostał argumentu viva (krok 6-prep nie istnieje przy zgaszonej).
		expect(runReviewPipelineMock.mock.calls[0][0].viva).toBeUndefined();
	});

	it("submit 'verified' + flaga ON → demotacja do 'submitted', sesja pending z zamrożonym planem, projekcja", async () => {
		const submissionId = await doSubmit();

		const sub = await pool?.query(
			"SELECT status, needs_human_review, ai_review_json -> 'viva' AS viva FROM project_submissions WHERE id = $1",
			[submissionId],
		);
		expect(sub?.rows[0].status).toBe("submitted");
		expect(sub?.rows[0].needs_human_review).toBe(false);
		expect(sub?.rows[0].viva).toMatchObject({ state: "pending", questionCount: 3 });

		const sess = await pool?.query(
			"SELECT status, questions_json FROM viva_sessions WHERE submission_id = $1",
			[submissionId],
		);
		expect(sess?.rows[0].status).toBe("pending");
		expect(sess?.rows[0].questions_json).toHaveLength(3);
	});

	it("pełna ścieżka passed (2,2,1=5): status 'verified', resultJson, audyt viva.passed + verified", async () => {
		const submissionId = await doSubmit();
		judgeMock
			.mockResolvedValueOnce({ points: 2, justification: "a" })
			.mockResolvedValueOnce({ points: 2, justification: "b" })
			.mockResolvedValueOnce({ points: 1, justification: "c" });

		const { last } = await startAndAnswer(submissionId, 3);
		const body = await last?.json();
		expect(body).toMatchObject({
			state: "passed",
			result: { totalPoints: 5, maxPoints: 6, passThreshold: 4 },
		});

		const sub = await pool?.query(
			"SELECT status, ai_review_json -> 'viva' AS viva FROM project_submissions WHERE id = $1",
			[submissionId],
		);
		expect(sub?.rows[0].status).toBe("verified");
		expect(sub?.rows[0].viva).toMatchObject({ state: "passed", score: 5 });

		const audit = await pool?.query(
			"SELECT action FROM audit_log WHERE target_id = $1 ORDER BY created_at",
			[submissionId],
		);
		const actions = audit?.rows.map((r) => r.action);
		expect(actions).toContain("submission.viva.passed");
		expect(actions).toContain("submission.verified");
	});

	it("ścieżka failed (2,1,0=3 < próg 4): status zostaje 'submitted' + needsHumanReview", async () => {
		const submissionId = await doSubmit();
		judgeMock
			.mockResolvedValueOnce({ points: 2, justification: "a" })
			.mockResolvedValueOnce({ points: 1, justification: "b" })
			.mockResolvedValueOnce({ points: 0, justification: "wymijająca" });

		const { last } = await startAndAnswer(submissionId, 3);
		expect((await last!.json()).state).toBe("failed");

		const sub = await pool?.query(
			"SELECT status, needs_human_review FROM project_submissions WHERE id = $1",
			[submissionId],
		);
		expect(sub?.rows[0]).toEqual({ status: "submitted", needs_human_review: true });
	});

	it("awaria sędziego → inconclusive + needsHumanReview; odpowiedź zapisana BEZ werdyktu", async () => {
		const submissionId = await doSubmit();
		judgeMock.mockRejectedValue(new Error("judge down"));

		const { sessionId, last } = await startAndAnswer(submissionId, 1);
		expect((await last!.json()).state).toBe("inconclusive");

		const sess = await pool?.query("SELECT status FROM viva_sessions WHERE id = $1", [sessionId]);
		expect(sess?.rows[0].status).toBe("inconclusive");
		const ans = await pool?.query(
			"SELECT content, verdict_json FROM viva_answers WHERE session_id = $1",
			[sessionId],
		);
		expect(ans?.rows).toHaveLength(1);
		expect(ans?.rows[0].verdict_json).toBeNull();
		const sub = await pool?.query(
			"SELECT needs_human_review FROM project_submissions WHERE id = $1",
			[submissionId],
		);
		expect(sub?.rows[0].needs_human_review).toBe(true);
	});

	it("expiry z 0 odpowiedzi → expired; restart daje nową sesję na TYCH SAMYCH pytaniach", async () => {
		const submissionId = await doSubmit();
		const { sessionId } = await startAndAnswer(submissionId, 0);
		await pool?.query(
			"UPDATE viva_sessions SET started_at = now() - interval '61 minutes' WHERE id = $1",
			[sessionId],
		);

		// Odpowiedź po TTL → 409 restartable, sesja expired (leniwie).
		const res = await answerRoute.POST(
			jsonReq({ answer: "spóźniona odpowiedź" }),
			answerParams(submissionId, sessionId),
		);
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ state: "expired", restartable: true });

		// Restart: nowa sesja in_progress z tym samym zamrożonym planem.
		const restart = await startRoute.POST(jsonReq({}), params(submissionId));
		expect(restart.status).toBe(200);
		const rows = await pool?.query(
			"SELECT id, status, questions_json FROM viva_sessions WHERE submission_id = $1 ORDER BY created_at",
			[submissionId],
		);
		expect(rows?.rows.map((r) => r.status)).toEqual(["expired", "in_progress"]);
		expect(rows?.rows[1].questions_json).toEqual(rows?.rows[0].questions_json);
	});

	it("expiry z ≥1 odpowiedzią → inconclusive (człowiek), bez restartu", async () => {
		const submissionId = await doSubmit();
		const { sessionId } = await startAndAnswer(submissionId, 1);
		await pool?.query(
			"UPDATE viva_sessions SET started_at = now() - interval '61 minutes' WHERE id = $1",
			[sessionId],
		);

		const res = await answerRoute.POST(
			jsonReq({ answer: "druga po czasie" }),
			answerParams(submissionId, sessionId),
		);
		expect(res.status).toBe(409);
		expect((await res.json()).state).toBe("inconclusive");
		const restart = await startRoute.POST(jsonReq({}), params(submissionId));
		expect(restart.status).toBe(409);
	});

	it("decyzja człowieka approve → 'verified', sesja superseded, start po decyzji → 409", async () => {
		const submissionId = await doSubmit();
		const decision = await decisionRoute.POST(
			jsonReq({ decision: "approved" }),
			params(submissionId),
		);
		expect(decision.status).toBe(200);

		const sess = await pool?.query("SELECT status FROM viva_sessions WHERE submission_id = $1", [
			submissionId,
		]);
		expect(sess?.rows[0].status).toBe("superseded");
		const sub = await pool?.query(
			"SELECT status, ai_review_json -> 'viva' ->> 'state' AS viva_state FROM project_submissions WHERE id = $1",
			[submissionId],
		);
		expect(sub?.rows[0]).toEqual({ status: "verified", viva_state: "superseded" });

		const start = await startRoute.POST(jsonReq({}), params(submissionId));
		expect(start.status).toBe(409);
	});

	it("re-submit: żywa sesja superseded, świeży stan viva (stary NIE przeżywa merge'a jsonb)", async () => {
		const submissionId = await doSubmit();
		await startAndAnswer(submissionId, 0); // in_progress
		const second = await doSubmit(); // ta sama para (student, projekt) → ten sam wiersz
		expect(second).toBe(submissionId);

		const sessions = await pool?.query(
			"SELECT status FROM viva_sessions WHERE submission_id = $1 ORDER BY created_at",
			[submissionId],
		);
		expect(sessions?.rows.map((r) => r.status)).toEqual(["superseded", "pending"]);
		const sub = await pool?.query(
			"SELECT ai_review_json -> 'viva' ->> 'state' AS s FROM project_submissions WHERE id = $1",
			[submissionId],
		);
		expect(sub?.rows[0].s).toBe("pending");
	});

	it("generacja fail-closed (questions=null) → sesja inconclusive + needsHumanReview od razu", async () => {
		runReviewPipelineMock.mockResolvedValue(pipelineResult({ vivaPrep: { questions: null } }));
		const submissionId = await doSubmit();

		const sub = await pool?.query(
			"SELECT status, needs_human_review, ai_review_json -> 'viva' ->> 'state' AS s FROM project_submissions WHERE id = $1",
			[submissionId],
		);
		expect(sub?.rows[0]).toEqual({
			status: "submitted",
			needs_human_review: true,
			s: "inconclusive",
		});
		const sess = await pool?.query("SELECT status FROM viva_sessions WHERE submission_id = $1", [
			submissionId,
		]);
		expect(sess?.rows[0].status).toBe("inconclusive");
	});

	it("recenzent czyta obronę przez GET /review-queue/[id]/viva + audyt odczytu", async () => {
		const submissionId = await doSubmit();
		judgeMock.mockResolvedValue({ points: 1, justification: "częściowa" });
		await startAndAnswer(submissionId, 3); // 3/6 → failed → kolejka

		const res = await reviewVivaRoute.GET(new Request("http://t"), params(submissionId));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.session.status).toBe("failed");
		expect(body.exchange).toHaveLength(3);
		expect(body.exchange[0].answer).toContain("Odpowiedź merytoryczna");
		expect(body.exchange[0].verdict).toMatchObject({ points: 1 });

		const audit = await pool?.query(
			"SELECT count(*)::int AS c FROM audit_log WHERE target_id = $1 AND action = 'submission.viva.answers_read'",
			[submissionId],
		);
		expect(audit?.rows[0].c).toBe(1);
	});

	it("własność: cudzy student → 404 na GET/start/answer", async () => {
		const submissionId = await doSubmit();
		const { sessionId } = await startAndAnswer(submissionId, 0);

		getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID_2 } });
		expect((await vivaGetRoute.GET(new Request("http://t"), params(submissionId))).status).toBe(
			404,
		);
		expect((await startRoute.POST(jsonReq({}), params(submissionId))).status).toBe(404);
		expect(
			(
				await answerRoute.POST(
					jsonReq({ answer: "próba przejęcia" }),
					answerParams(submissionId, sessionId),
				)
			).status,
		).toBe(404);
	});

	it("tutor zablokowany w trakcie OTWARTEJ obrony (409); po zamknięciu wraca", async () => {
		process.env.FLAG_SOCRATIC_TUTOR = "1";
		runTutorTurnMock.mockResolvedValue({ reply: "Pytanie naprowadzające?", guarded: false });
		const submissionId = await doSubmit();
		await startAndAnswer(submissionId, 0); // in_progress

		const blocked = await tutorRoute.POST(jsonReq({ message: "Pomóż" }), params(projectId));
		expect(blocked.status).toBe(409);
		expect((await blocked.json()).error).toContain("obrona");

		// Zamknięcie sesji (3 odpowiedzi) → tutor znowu działa.
		judgeMock.mockResolvedValue({ points: 2, justification: "ok" });
		const sess = await pool?.query(
			"SELECT id FROM viva_sessions WHERE submission_id = $1 AND status = 'in_progress'",
			[submissionId],
		);
		for (let i = 0; i < 3; i++) {
			await answerRoute.POST(
				jsonReq({ answer: `Odpowiedź ${i + 1} po blokadzie tutora.` }),
				answerParams(submissionId, sess?.rows[0].id),
			);
		}
		const unblocked = await tutorRoute.POST(jsonReq({ message: "Pomóż" }), params(projectId));
		expect(unblocked.status).toBe(200);
	});

	it("filtr kryzysowy: odpowiedź NIEZAPISANA, sesja bez zmian", async () => {
		const submissionId = await doSubmit();
		const { sessionId } = await startAndAnswer(submissionId, 0);

		const res = await answerRoute.POST(
			jsonReq({ answer: "nie chcę już żyć" }),
			answerParams(submissionId, sessionId),
		);
		expect(await res.json()).toEqual({ crisis: true });
		const ans = await pool?.query(
			"SELECT count(*)::int AS c FROM viva_answers WHERE session_id = $1",
			[sessionId],
		);
		expect(ans?.rows[0].c).toBe(0);
		const sess = await pool?.query("SELECT status FROM viva_sessions WHERE id = $1", [sessionId]);
		expect(sess?.rows[0].status).toBe("in_progress");
	});
});
