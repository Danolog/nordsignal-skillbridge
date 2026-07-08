// @vitest-environment node
//
// A5/1.11 — DoD NA REALNEJ BAZIE (spec v0.2): pełny przepływ diagnozy
// start → answer (staircase, egzekwowana kolejność) → complete (koperta
// wyniku + precedencja zapisu do competencies), plus warstwy ochronne:
//  • odpowiedzi tras NIGDY nie zawierają klucza (answer_json/correct) ani
//    is_correct w trakcie testu (spec §2.2),
//  • odpowiedź poza kolejnością staircase → 409 bez gradingu,
//  • drugi complete → 409 (zapis do competencies tylko raz),
//  • re-diagnoza (nowa sesja) rotuje warianty — nie powtarza itemów,
//  • wznowienie: ten sam input → ta sama sesja; inny input → abandoned + nowa,
//  • brak pokrycia banku → 422 z `uncovered` (jawna degradacja),
//  • flaga off → 404 (feature nie istnieje),
//  • RLS/granty: bank (DENY) i answers (DENY) niedostępne dla app_student;
//    sessions SELECT-only i tylko własne; INSERT jako app_student odrzucony,
//  • partial unique: druga sesja in_progress per (student, kind) odrzucona,
//  • CHECK: koncept 'market' bez competency_name odrzucony.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (tabele 0030).

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

// Sesja Better Auth mockowana (integracja dowodzi warstwy DB/silnika, nie logowania).
const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const USER = "u-a5-diagnoza";
const COMP_A = "A511 Alpha";
const COMP_B = "A511 Beta";
const SLUG_PREFIX = "a5-test-";

function postReq(body: unknown): Request {
	return new Request("http://test.local/api/assessment", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function ctxFor(id: string) {
	return { params: Promise.resolve({ id }) };
}

dBack("A5/1.11 · przepływ diagnozy + RLS/granty banku (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let startPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let answerPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let completePOST: any;

	let tenantId = "";
	let studentId = "";

	async function cleanup() {
		await db.execute(
			sql`DELETE FROM assessment_answers WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM assessment_sessions WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM competencies WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER}`);
		await db.execute(
			sql`DELETE FROM question_items WHERE concept_id IN (SELECT id FROM question_concepts WHERE slug LIKE ${`${SLUG_PREFIX}%`})`,
		);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${SLUG_PREFIX}%`}`);
	}

	/** Item banku: klucze WSPÓLNE dla wariantów tej samej trudności (sterowalność). */
	async function insertConceptWithItems(
		slug: string,
		competencyName: string,
		numericValue: number,
	) {
		const [concept] = await db
			.insert(schema.questionConcepts)
			.values({ slug, name: competencyName, trunk: "market", competencyName, diagnostic: true })
			.returning({ id: schema.questionConcepts.id });
		for (const variant of ["w1", "w2"]) {
			await db.insert(schema.questionItems).values([
				{
					conceptId: concept.id,
					difficulty: 1,
					type: "single_choice",
					stem: `[${slug}/${variant}] Pytanie podstawowe (d1) — wskaż poprawną odpowiedź.`,
					optionsJson: ["Dobra", "Zła", "Gorsza"],
					answerJson: { correct: 0 },
				},
				{
					conceptId: concept.id,
					difficulty: 2,
					type: "numeric",
					stem: `[${slug}/${variant}] Pytanie praktyczne (d2) — podaj wynik obliczenia.`,
					answerJson: { value: numericValue, tolerance: 0 },
				},
				{
					conceptId: concept.id,
					difficulty: 3,
					type: "multi_choice",
					stem: `[${slug}/${variant}] Pytanie zaawansowane (d3) — zaznacz wszystkie poprawne.`,
					optionsJson: ["P1", "F1", "P2", "F2"],
					answerJson: { correct: [0, 2] },
				},
			]);
		}
		return concept.id;
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_DIAGNOSTIC_ASSESSMENT", "1");
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ POST: startPOST } = await import("../start/route"));
		({ POST: answerPOST } = await import("../[id]/answer/route"));
		({ POST: completePOST } = await import("../[id]/complete/route"));
		await cleanup();

		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, 'A5 Test', ${`${USER}@test.local`}, true, now(), now())`,
		);
		const [student] = await db
			.insert(schema.students)
			.values({
				userId: USER,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "Ścieżka A5 Test",
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentId = student.id;

		// Wiersze kompetencji jak po kroku wyboru w onboardingu (samoocena 'self').
		for (const name of [COMP_A, COMP_B]) {
			await db.insert(schema.competencies).values({
				studentId,
				tenantId,
				name,
				status: "in_progress",
				selfAssessment: 2,
				verifiedByMethod: "self",
			});
		}

		await insertConceptWithItems(`${SLUG_PREFIX}alpha`, COMP_A, 7);
		await insertConceptWithItems(`${SLUG_PREFIX}beta`, COMP_B, 3);

		mockGetSession.mockResolvedValue({ user: { id: USER } });
	});

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (db) await cleanup();
	});

	it("pełny przepływ: start → 4 odpowiedzi wg staircase → complete z precedencją zapisu", async () => {
		const startRes = await startPOST(postReq({ competencyNames: [COMP_B, COMP_A] }));
		expect(startRes.status).toBe(201);
		const started = await startRes.json();
		expect(started.total).toBe(4);
		expect(started.uncovered).toEqual([]);
		// Odpowiedź trasy nie zawiera klucza ani treści planu.
		const startedRaw = JSON.stringify(started);
		expect(startedRaw).not.toContain("answerJson");
		expect(startedRaw).not.toContain('"correct"');

		// Pytanie 1: pierwsza kompetencja alfabetycznie (Alpha), trudność 2 (numeric).
		expect(started.question.competencyName).toBe(COMP_A);
		expect(started.question.type).toBe("numeric");
		expect(started.question.options).toBeNull();

		const sessionId = started.sessionId as string;

		// Odpowiedź poza kolejnością (item d3 zamiast oczekiwanego d2) → 409 bez zapisu.
		const [d3Alpha] = await db
			.execute(
				sql`SELECT qi.id FROM question_items qi JOIN question_concepts qc ON qc.id = qi.concept_id
			    WHERE qc.slug = ${`${SLUG_PREFIX}alpha`} AND qi.difficulty = 3 LIMIT 1`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		const outOfOrder = await answerPOST(
			postReq({ questionItemId: d3Alpha.id, answer: { selected: [0, 2] } }),
			ctxFor(sessionId),
		);
		expect(outOfOrder.status).toBe(409);

		// Alpha: d2 poprawnie (7) → d3 poprawnie ([0,2]) → poziom 4.
		let res = await answerPOST(
			postReq({ questionItemId: started.question.itemId, answer: { value: "7" } }),
			ctxFor(sessionId),
		);
		expect(res.status).toBe(200);
		let body = await res.json();
		// Zero feedbacku w trakcie: brak is_correct w odpowiedzi trasy.
		expect(JSON.stringify(body)).not.toContain("isCorrect");
		expect(body.question.competencyName).toBe(COMP_A);
		expect(body.question.type).toBe("multi_choice");

		res = await answerPOST(
			postReq({ questionItemId: body.question.itemId, answer: { selected: [0, 2] } }),
			ctxFor(sessionId),
		);
		body = await res.json();
		// Beta: d2 błędnie (999) → d1 błędnie (indeks 2) → poziom 1.
		expect(body.question.competencyName).toBe(COMP_B);
		res = await answerPOST(
			postReq({ questionItemId: body.question.itemId, answer: { value: "999" } }),
			ctxFor(sessionId),
		);
		body = await res.json();
		expect(body.question.type).toBe("single_choice");
		res = await answerPOST(
			postReq({ questionItemId: body.question.itemId, answer: { selected: 2 } }),
			ctxFor(sessionId),
		);
		body = await res.json();
		expect(body.done).toBe(true);
		expect(body.question).toBeNull();

		// Complete: koperta wyniku + zapis do competencies.
		const completeRes = await completePOST(postReq({}), ctxFor(sessionId));
		expect(completeRes.status).toBe(200);
		const completed = await completeRes.json();
		expect(completed.result.competencies).toEqual({ [COMP_A]: 4, [COMP_B]: 1 });
		expect(completed.result.concepts[`${SLUG_PREFIX}alpha`]).toEqual({
			asked: 2,
			correct: 2,
			level: 4,
		});
		expect(completed.updatedCompetencies).toBe(2);

		const rows = await db
			.execute(
				sql`SELECT name, status, self_assessment AS level, verified_by_method AS method
			    FROM competencies WHERE student_id = ${studentId} ORDER BY name`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(rows).toEqual([
			{ name: COMP_A, status: "acquired", level: 4, method: "diagnostic" },
			{ name: COMP_B, status: "missing", level: 1, method: "diagnostic" },
		]);

		// Drugi complete → 409 (idempotencja zapisu).
		const secondComplete = await completePOST(postReq({}), ctxFor(sessionId));
		expect(secondComplete.status).toBe(409);
	});

	it("re-diagnoza rotuje warianty (itemy pierwszej sesji wykluczone z planu)", async () => {
		const askedBefore = await db
			.execute(
				sql`SELECT question_item_id AS id FROM assessment_answers
			    WHERE student_id = ${studentId}`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows.map((x) => x.id));
		expect(askedBefore.length).toBe(4);

		const res = await startPOST(postReq({ competencyNames: [COMP_A, COMP_B] }));
		expect(res.status).toBe(201);
		const started = await res.json();
		// Pierwsze pytanie nowej sesji nie może być itemem z poprzedniej
		// (2 warianty per trudność, 1 zużyty → plan bierze drugi).
		expect(askedBefore).not.toContain(started.question.itemId);

		// Sprzątanie stanu tego testu: porzucamy aktywną sesję.
		await db.execute(
			sql`UPDATE assessment_sessions SET status = 'abandoned'
			    WHERE id = ${started.sessionId}`,
		);
	});

	it("wznowienie: ten sam input → ta sama sesja; inny input → abandoned + nowa", async () => {
		const first = await (await startPOST(postReq({ competencyNames: [COMP_A] }))).json();
		const resumed = await (await startPOST(postReq({ competencyNames: [COMP_A] }))).json();
		expect(resumed.sessionId).toBe(first.sessionId);
		expect(resumed.resumed).toBe(true);

		const changed = await (await startPOST(postReq({ competencyNames: [COMP_A, COMP_B] }))).json();
		expect(changed.sessionId).not.toBe(first.sessionId);
		expect(changed.resumed).toBe(false);
		const [old] = await db
			.execute(sql`SELECT status FROM assessment_sessions WHERE id = ${first.sessionId}`)
			.then((r: { rows: { status: string }[] }) => r.rows);
		expect(old.status).toBe("abandoned");

		await db.execute(
			sql`UPDATE assessment_sessions SET status = 'abandoned' WHERE id = ${changed.sessionId}`,
		);
	});

	it("brak pokrycia banku → 422 z listą uncovered (jawna degradacja)", async () => {
		const res = await startPOST(postReq({ competencyNames: ["Kowalstwo artystyczne"] }));
		expect(res.status).toBe(422);
		const body = await res.json();
		expect(body.uncovered).toEqual(["Kowalstwo artystyczne"]);
	});

	it("flaga off → 404 (feature nie istnieje)", async () => {
		vi.stubEnv("FLAG_DIAGNOSTIC_ASSESSMENT", "0");
		try {
			const res = await startPOST(postReq({ competencyNames: [COMP_A] }));
			expect(res.status).toBe(404);
		} finally {
			vi.stubEnv("FLAG_DIAGNOSTIC_ASSESSMENT", "1");
		}
	});

	it("RLS/granty: bank i odpowiedzi DENY dla app_student; sesje SELECT-only własne", async () => {
		// Bank pytań: permission denied (wariant DENY jak project_hidden_tests).
		for (const table of ["question_concepts", "question_items", "assessment_answers"]) {
			await expect(
				db.transaction(async (tx: unknown) => {
					// biome-ignore lint/suspicious/noExplicitAny: tx dynamiczne w teście.
					const t = tx as any;
					await t.execute(sql`SELECT set_config('app.current_user_id', ${USER}, true)`);
					await t.execute(sql`SET LOCAL ROLE app_student`);
					await t.execute(sql.raw(`SELECT * FROM ${table} LIMIT 1`));
				}),
			).rejects.toThrow();
		}

		// Sesje: student widzi WYŁĄCZNIE własne wiersze (RLS student_sees_own)...
		const own = await db.transaction(async (tx: unknown) => {
			// biome-ignore lint/suspicious/noExplicitAny: tx dynamiczne w teście.
			const t = tx as any;
			await t.execute(sql`SELECT set_config('app.current_user_id', ${USER}, true)`);
			await t.execute(sql`SET LOCAL ROLE app_student`);
			return t.execute(sql`SELECT DISTINCT student_id FROM assessment_sessions`);
		});
		expect(own.rows.length).toBe(1);
		expect(own.rows[0].student_id).toBe(studentId);

		// ...a bez kontekstu użytkownika — deny-default (0 wierszy).
		const anonymous = await db.transaction(async (tx: unknown) => {
			// biome-ignore lint/suspicious/noExplicitAny: tx dynamiczne w teście.
			const t = tx as any;
			await t.execute(sql`SET LOCAL ROLE app_student`);
			return t.execute(sql`SELECT count(*)::int AS c FROM assessment_sessions`);
		});
		expect(anonymous.rows[0].c).toBe(0);

		// Zapis jako app_student: brak grantu INSERT (SELECT-only, wzorzec 0025).
		await expect(
			db.transaction(async (tx: unknown) => {
				// biome-ignore lint/suspicious/noExplicitAny: tx dynamiczne w teście.
				const t = tx as any;
				await t.execute(sql`SELECT set_config('app.current_user_id', ${USER}, true)`);
				await t.execute(sql`SET LOCAL ROLE app_student`);
				await t.execute(
					sql`INSERT INTO assessment_sessions (student_id, tenant_id, kind, input_hash, plan_json)
				    VALUES (${studentId}, ${tenantId}, 'diagnostic', 'x', '{}'::jsonb)`,
				);
			}),
		).rejects.toThrow();
	});

	it("partial unique: druga sesja in_progress per (student, kind) odrzucona przez bazę", async () => {
		await db.execute(
			sql`INSERT INTO assessment_sessions (student_id, tenant_id, kind, input_hash, plan_json, status)
			    VALUES (${studentId}, ${tenantId}, 'diagnostic', 'pu-1', '{}'::jsonb, 'in_progress')`,
		);
		await expect(
			db.execute(
				sql`INSERT INTO assessment_sessions (student_id, tenant_id, kind, input_hash, plan_json, status)
				    VALUES (${studentId}, ${tenantId}, 'diagnostic', 'pu-2', '{}'::jsonb, 'in_progress')`,
			),
		).rejects.toThrow();
		// Sesje zakończone nie blokują nowej aktywnej (WHERE status='in_progress').
		await db.execute(
			sql`UPDATE assessment_sessions SET status = 'abandoned'
			    WHERE student_id = ${studentId} AND status = 'in_progress'`,
		);
	});

	it("CHECK: koncept 'market' bez competency_name odrzucony przez bazę", async () => {
		await expect(
			db.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk, competency_name)
				    VALUES (${`${SLUG_PREFIX}zly`}, 'Zły', 'market', NULL)`,
			),
		).rejects.toThrow();
	});
});
