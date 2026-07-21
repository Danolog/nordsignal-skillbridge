// @vitest-environment node
//
// 1E.1d/e/f — DoD NA REALNEJ BAZIE (dowód roadmapy 1E.1):
//  • flaga off → trasy 404 (zachowanie jak dziś),
//  • student bez zaliczonego modułu N NIE otworzy N+1 (403 na odczyt i zapis),
//  • błędna odpowiedź nie kończy pozycji (R13), poprawna kompletuje pozycję
//    i moduł → N+1 się otwiera,
//  • odpowiedzi lądują APPEND-ONLY (2 próby = 2 wiersze),
//  • streak: odpowiedź curriculum liczy się do śladu aktywności przy ON;
//    przy OFF zapytanie nie dotyka tabeli (zachowanie identyczne z dzisiejszym).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0035).

import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const USER = "u-1e1d-student";
// REALNA ścieżka + REALNY careerGoal (lekcja z przeglądu Ethana: test z tą samą
// syntetyczną wartością po obu stronach zamaskował rozjazd careerGoal→path_key).
const PATH_KEY = "data-science";
const CAREER_GOAL = "Data Scientist";

function answerRequest(body: unknown): Request {
	return new Request("http://test.local/api/curriculum/items/x/answer", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

dBack("1E.1d/e/f · curriculum: prereq 403, zapis postępu, streak (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let ladderGET: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let moduleGET: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let answerPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: lib ładowany dynamicznie.
	let getActivityTrace: any;

	let tenantId = "";
	let studentId = "";
	let moduleA = "";
	let moduleB = "";
	let itemA = "";
	let itemB = "";
	let questionA = "";
	let questionB = "";

	beforeAll(async () => {
		process.env.FLAG_CURRICULUM_PATH = "1";
		({ db } = await import("@/lib/db"));
		({ GET: ladderGET } = await import("../route"));
		({ GET: moduleGET } = await import("../modules/[id]/route"));
		({ POST: answerPOST } = await import("../items/[id]/answer/route"));
		({ getActivityTrace } = await import("@/lib/rhythm/activity"));
		mockGetSession.mockResolvedValue({ user: { id: USER } });

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e1d', 'Tenant 1E.1d')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;
		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
		    VALUES (${USER}, ${USER}, ${`${USER}@test.local`}, true, now(), now())
		    ON CONFLICT (id) DO NOTHING`,
		);
		const [student] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			    VALUES (${USER}, ${tenantId}, 'Test U', 'Informatyka', 3, ${CAREER_GOAL})
			    ON CONFLICT (user_id) DO UPDATE SET career_goal = EXCLUDED.career_goal
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		studentId = student.id;

		// Drabina testowa: A → B (łańcuch), po 1 pozycji exercise z 1 pytaniem.
		const [concept] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk)
			    VALUES ('t-1e1d-koncept', 'Koncept 1E.1d', 'foundations')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		for (const [slug, title] of [
			["t-1e1d-a", "Moduł A"],
			["t-1e1d-b", "Moduł B"],
			["t-1e1d-c", "Moduł C (pusty — coming_soon)"],
		]) {
			await db.execute(
				sql`INSERT INTO curriculum_modules (slug, title) VALUES (${slug}, ${title})
			    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title`,
			);
		}
		const modules = await db
			.execute(
				sql`SELECT id, slug FROM curriculum_modules WHERE slug IN ('t-1e1d-a','t-1e1d-b','t-1e1d-c') ORDER BY slug`,
			)
			.then((r: { rows: { id: string; slug: string }[] }) => r.rows);
		moduleA = modules.find((m: { slug: string }) => m.slug === "t-1e1d-a")?.id ?? "";
		moduleB = modules.find((m: { slug: string }) => m.slug === "t-1e1d-b")?.id ?? "";
		const moduleC = modules.find((m: { slug: string }) => m.slug === "t-1e1d-c")?.id ?? "";

		// Test przejmuje ścieżkę 'data-science' w bazie TESTOWEJ (delete+reinsert
		// jak ingest); C bez prereqów i bez pozycji = odblokowany-ale-pusty.
		await db.execute(sql`DELETE FROM curriculum_path_modules WHERE path_key = ${PATH_KEY}`);
		await db.execute(
			sql`INSERT INTO curriculum_path_modules (path_key, module_id, position)
		    VALUES (${PATH_KEY}, ${moduleA}, 1), (${PATH_KEY}, ${moduleB}, 2), (${PATH_KEY}, ${moduleC}, 3)`,
		);
		await db.execute(
			sql`INSERT INTO curriculum_module_prereqs (module_id, requires_module_id)
		    VALUES (${moduleB}, ${moduleA}) ON CONFLICT DO NOTHING`,
		);

		// Deterministyczne pozycje modułów syntetycznych: wcześniejsze biegi/ingesty
		// mogły zostawić pozycje pod tymi samymi position (unikat per moduł).
		await db.execute(
			sql`DELETE FROM curriculum_module_items
		    WHERE module_id IN (${moduleA}, ${moduleB}) AND slug <> 'cwiczenie'`,
		);
		for (const [moduleId, stem] of [
			[moduleA, "Pytanie A?"],
			[moduleB, "Pytanie B?"],
		]) {
			const [q] = await db
				.execute(
					sql`INSERT INTO question_items (concept_id, type, difficulty, stem, answer_json, explanation_md)
				    VALUES (${concept.id}, 'single_choice', 1, ${stem}, '{"correct":0}'::jsonb, 'Bo tak.')
				    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			const [item] = await db
				.execute(
					sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, config_json)
				    VALUES (${moduleId}, 'cwiczenie', 1, 'exercise', 'Ćwiczenie', ${JSON.stringify({ questionItemIds: [q.id] })}::jsonb)
				    ON CONFLICT (module_id, slug) DO UPDATE SET config_json = EXCLUDED.config_json
				    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			if (moduleId === moduleA) {
				itemA = item.id;
				questionA = q.id;
			} else {
				itemB = item.id;
				questionB = q.id;
			}
		}
		// Czysty stan postępu (idempotencja przy powtórnym biegu suity).
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_item_progress WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
	});

	it("flaga off → wszystkie trasy 404 (zachowanie jak dziś)", async () => {
		delete process.env.FLAG_CURRICULUM_PATH;
		expect((await ladderGET()).status).toBe(404);
		expect(
			(await moduleGET(new Request("http://t"), { params: Promise.resolve({ id: moduleB }) }))
				.status,
		).toBe(404);
		expect(
			(
				await answerPOST(answerRequest({ questionItemId: questionA, answer: { selected: 0 } }), {
					params: Promise.resolve({ id: itemA }),
				})
			).status,
		).toBe(404);
		process.env.FLAG_CURRICULUM_PATH = "1";
	});

	it("drabina: moduł A available, moduł B locked (widoczna-ale-zablokowana)", async () => {
		const res = await ladderGET();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.pathKey).toBe(PATH_KEY);
		const bySlug = new Map(
			body.modules.map((m: { slug: string; status: string }) => [m.slug, m.status]),
		);
		expect(bySlug.get("t-1e1d-a")).toBe("available");
		expect(bySlug.get("t-1e1d-b")).toBe("locked");
		// Bezpiecznik z przeglądu: odblokowany moduł BEZ pozycji nie udaje available.
		expect(bySlug.get("t-1e1d-c")).toBe("coming_soon");
	});

	it("DOWÓD ROADMAPY: student bez zaliczonego A nie otworzy B — 403 na odczyt I zapis", async () => {
		const read = await moduleGET(new Request("http://t"), {
			params: Promise.resolve({ id: moduleB }),
		});
		expect(read.status).toBe(403);
		const write = await answerPOST(
			answerRequest({ questionItemId: questionB, answer: { selected: 0 } }),
			{ params: Promise.resolve({ id: itemB }) },
		);
		expect(write.status).toBe(403);
	});

	it("błędna odpowiedź: feedback natychmiast, pozycja NIE ukończona (R13)", async () => {
		const res = await answerPOST(
			answerRequest({ questionItemId: questionA, answer: { selected: 2 } }),
			{ params: Promise.resolve({ id: itemA }) },
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.correct).toBe(false);
		expect(body.itemCompleted).toBe(false);
		expect(body.explanationMd).toBe("Bo tak.");
	});

	it("poprawna odpowiedź: pozycja i moduł A completed → B się otwiera", async () => {
		const res = await answerPOST(
			answerRequest({ questionItemId: questionA, answer: { selected: 0 } }),
			{ params: Promise.resolve({ id: itemA }) },
		);
		const body = await res.json();
		expect(body).toMatchObject({ correct: true, itemCompleted: true, moduleCompleted: true });

		const ladder = await (await ladderGET()).json();
		const bySlug = new Map(
			ladder.modules.map((m: { slug: string; status: string }) => [m.slug, m.status]),
		);
		expect(bySlug.get("t-1e1d-a")).toBe("completed");
		expect(bySlug.get("t-1e1d-b")).toBe("available");

		const read = await moduleGET(new Request("http://t"), {
			params: Promise.resolve({ id: moduleB }),
		});
		expect(read.status).toBe(200);
	});

	it("append-only: 2 próby = 2 wiersze w curriculum_item_answers", async () => {
		const rows = await db.execute(
			sql`SELECT is_correct FROM curriculum_item_answers
		    WHERE student_id = ${studentId} AND item_id = ${itemA} ORDER BY answered_at`,
		);
		expect(rows.rows.map((r: { is_correct: boolean }) => r.is_correct)).toEqual([false, true]);
	});

	it("streak 1E.1f: ślad curriculum liczy się przy ON, przy OFF znika (zachowanie jak dziś)", async () => {
		const withFlag = await getActivityTrace(studentId);
		delete process.env.FLAG_CURRICULUM_PATH;
		const withoutFlag = await getActivityTrace(studentId);
		process.env.FLAG_CURRICULUM_PATH = "1";
		// Student ma WYŁĄCZNIE aktywność curriculum → ON: 2 ślady, OFF: 0.
		expect(withFlag.dates.length).toBe(2);
		expect(withoutFlag.dates.length).toBe(0);
	});

	// MIS.1 — sonda pewności (flaga confidenceProbe). Blok idzie PO teście
	// streaka: dokłada wiersze odpowiedzi, a streak liczy dokładnie 2 ślady.
	it("MIS.1 flaga ON: brak confidence → 400 bez zapisu; z confidence → wiersz z wartością", async () => {
		process.env.FLAG_CONFIDENCE_PROBE = "1";
		try {
			const missing = await answerPOST(
				answerRequest({ questionItemId: questionB, answer: { selected: 2 } }),
				{ params: Promise.resolve({ id: itemB }) },
			);
			expect(missing.status).toBe(400);
			const rowsAfter400 = await db.execute(
				sql`SELECT id FROM curriculum_item_answers
			    WHERE student_id = ${studentId} AND item_id = ${itemB}`,
			);
			expect(rowsAfter400.rows.length).toBe(0);

			const withConfidence = await answerPOST(
				answerRequest({ questionItemId: questionB, answer: { selected: 2 }, confidence: 3 }),
				{ params: Promise.resolve({ id: itemB }) },
			);
			expect(withConfidence.status).toBe(200);
			const rows = await db.execute(
				sql`SELECT confidence FROM curriculum_item_answers
			    WHERE student_id = ${studentId} AND item_id = ${itemB} ORDER BY answered_at`,
			);
			expect(rows.rows.map((r: { confidence: number | null }) => r.confidence)).toEqual([3]);
		} finally {
			delete process.env.FLAG_CONFIDENCE_PROBE;
		}
	});

	it("MIS.1 flaga OFF: confidence z body ignorowane — zapis NULL (zachowanie jak dziś)", async () => {
		const res = await answerPOST(
			answerRequest({ questionItemId: questionB, answer: { selected: 2 }, confidence: 2 }),
			{ params: Promise.resolve({ id: itemB }) },
		);
		expect(res.status).toBe(200);
		const rows = await db.execute(
			sql`SELECT confidence FROM curriculum_item_answers
		    WHERE student_id = ${studentId} AND item_id = ${itemB} ORDER BY answered_at`,
		);
		expect(rows.rows.map((r: { confidence: number | null }) => r.confidence)).toEqual([3, null]);
	});
});
