// @vitest-environment node
//
// ADR-018 — POST /api/curriculum/items/[id]/hint + serwerowa głębokość w `answer`,
// NA REALNEJ BAZIE (:5433). Pokrywa kryteria odbioru ADR-018 §5:
//  • bramki §4 (404/401/400/403/400/409),
//  • §5.6 dwa równoległe /hint → d=2 i DOKŁADNIE 2 wpisy `at`,
//  • §5.5 /hint ×2 → /answer z fałszywym hintDepth:0 → wiersz ma hint_depth=2,
//    hint_depth_source='server' (reprodukcja i naprawa długu),
//  • §5.4 INSERT do answers bez hint_depth_source → BŁĄD (dowód DROP DEFAULT / D3),
//  • §5.7 odsłonięcie ×3 bez wcześniejszej odpowiedzi → progress in_progress,
//    attempts=0, pozycja nadal dostępna,
//  • W-1 ciało z polem czasowym → 400, zero zmian w bazie,
//  • D3 readMeasuredHintDepths pomija wiersze 'client'.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`.

import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const USER = "u-adr018-student";

dBack("ADR-018 · serwerowa drabinka podpowiedzi (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let hintPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let answerPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: lib ładowany dynamicznie.
	let readMeasuredHintDepths: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let curriculumItemProgress: any;

	let studentId = "";
	let itemOpen = ""; // moduł A poz.1 — dostępna, ma 2 podpowiedzi + pytanie
	let itemNext = ""; // moduł A poz.2 — locked (sekwencja)
	let itemInLockedModule = ""; // moduł B — zablokowany prereqiem
	let itemNoHints = ""; // moduł C poz.1 — dostępna, pytanie BEZ podpowiedzi
	let questionOne = "";
	let questionNoHints = "";

	const hint = (id: string, body: unknown) =>
		hintPOST(
			new Request("http://test.local", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
			{ params: Promise.resolve({ id }) },
		);

	async function grantedEntry(itemId: string, qid: string) {
		const rows = await db
			.select({ j: curriculumItemProgress.hintsRevealedJson })
			.from(curriculumItemProgress)
			.where(
				and(
					eq(curriculumItemProgress.studentId, studentId),
					eq(curriculumItemProgress.itemId, itemId),
				),
			);
		return rows[0]?.j?.[qid] as { d: number; at: string[] } | undefined;
	}

	beforeAll(async () => {
		process.env.FLAG_CURRICULUM_PATH = "1";
		({ db } = await import("@/lib/db"));
		({ POST: hintPOST } = await import("../items/[id]/hint/route"));
		({ POST: answerPOST } = await import("../items/[id]/answer/route"));
		({ readMeasuredHintDepths } = await import("@/lib/curriculum/hints"));
		({ curriculumItemProgress } = await import("@/lib/db/schema"));
		mockGetSession.mockResolvedValue({ user: { id: USER } });

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-adr018', 'Tenant ADR-018')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
		    VALUES (${USER}, ${USER}, ${`${USER}@test.local`}, true, now(), now())
		    ON CONFLICT (id) DO NOTHING`,
		);
		const [student] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			    VALUES (${USER}, ${tenant.id}, 'Test U', 'Informatyka', 3, 'Data Scientist')
			    ON CONFLICT (user_id) DO UPDATE SET career_goal = EXCLUDED.career_goal RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		studentId = student.id;

		const [concept] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk)
			    VALUES ('t-adr018-koncept', 'Koncept ADR-018', 'foundations')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);

		const [q] = await db
			.execute(
				sql`INSERT INTO question_items (concept_id, type, difficulty, stem, options_json, answer_json)
			    VALUES (${concept.id}, 'single_choice', 1, 'Pytanie ADR-018?',
			      '["Opcja A","Opcja B"]'::jsonb, '{"correct":0}'::jsonb) RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		questionOne = q.id;
		const [qNo] = await db
			.execute(
				sql`INSERT INTO question_items (concept_id, type, difficulty, stem, options_json, answer_json)
			    VALUES (${concept.id}, 'single_choice', 1, 'Pytanie bez podpowiedzi?',
			      '["A","B"]'::jsonb, '{"correct":0}'::jsonb) RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		questionNoHints = qNo.id;

		for (const [slug, title] of [
			["t-adr018-a", "Moduł A"],
			["t-adr018-b", "Moduł B"],
			["t-adr018-c", "Moduł C"],
		]) {
			await db.execute(
				sql`INSERT INTO curriculum_modules (slug, title) VALUES (${slug}, ${title})
			    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title`,
			);
		}
		const mods = await db
			.execute(
				sql`SELECT id, slug FROM curriculum_modules WHERE slug IN ('t-adr018-a','t-adr018-b','t-adr018-c')`,
			)
			.then((r: { rows: { id: string; slug: string }[] }) => r.rows);
		const moduleA = mods.find((m: { slug: string }) => m.slug === "t-adr018-a")?.id ?? "";
		const moduleB = mods.find((m: { slug: string }) => m.slug === "t-adr018-b")?.id ?? "";
		const moduleC = mods.find((m: { slug: string }) => m.slug === "t-adr018-c")?.id ?? "";
		await db.execute(
			sql`INSERT INTO curriculum_module_prereqs (module_id, requires_module_id)
		    VALUES (${moduleB}, ${moduleA}) ON CONFLICT DO NOTHING`,
		);

		await db.execute(
			sql`DELETE FROM curriculum_module_items WHERE module_id IN (${moduleA}, ${moduleB}, ${moduleC})`,
		);
		const cfgHints = JSON.stringify({
			questionItemIds: [questionOne],
			hints: ["Podpowiedź 1", "Podpowiedź 2"],
		});
		const cfgNoHints = JSON.stringify({ questionItemIds: [questionNoHints], hints: [] });
		itemOpen = (
			await db
				.execute(
					sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, config_json)
				    VALUES (${moduleA}, 'poz-1', 1, 'exercise', 'Pozycja 1', ${cfgHints}::jsonb) RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows)
		)[0].id;
		itemNext = (
			await db
				.execute(
					sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, config_json)
				    VALUES (${moduleA}, 'poz-2', 2, 'exercise', 'Pozycja 2', ${cfgHints}::jsonb) RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows)
		)[0].id;
		itemInLockedModule = (
			await db
				.execute(
					sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, config_json)
				    VALUES (${moduleB}, 'poz-1', 1, 'exercise', 'Pozycja B1', ${cfgHints}::jsonb) RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows)
		)[0].id;
		itemNoHints = (
			await db
				.execute(
					sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, config_json)
				    VALUES (${moduleC}, 'poz-1', 1, 'exercise', 'Pozycja C1', ${cfgNoHints}::jsonb) RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows)
		)[0].id;

		// Czysty stan (idempotencja powtórnych biegów).
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_item_progress WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
	});

	it("flaga off → 404", async () => {
		delete process.env.FLAG_CURRICULUM_PATH;
		expect((await hint(itemOpen, { questionItemId: questionOne })).status).toBe(404);
		process.env.FLAG_CURRICULUM_PATH = "1";
	});

	it("brak sesji → 401", async () => {
		mockGetSession.mockResolvedValueOnce(null);
		expect((await hint(itemOpen, { questionItemId: questionOne })).status).toBe(401);
	});

	it("zły uuid pozycji → 400", async () => {
		expect((await hint("nie-uuid", { questionItemId: questionOne })).status).toBe(400);
	});

	it("W-1: ciało z polem czasowym (`at`) → 400 (.strict), zero zapisu", async () => {
		const before = await grantedEntry(itemOpen, questionOne);
		const res = await hint(itemOpen, {
			questionItemId: questionOne,
			at: "1999-01-01T00:00:00Z",
		});
		expect(res.status).toBe(400);
		expect(await grantedEntry(itemOpen, questionOne)).toEqual(before);
	});

	it("pozycja w zablokowanym module → 403", async () => {
		expect((await hint(itemInLockedModule, { questionItemId: questionOne })).status).toBe(403);
	});

	it("pozycja `locked` w sekwencji → 403", async () => {
		expect((await hint(itemNext, { questionItemId: questionOne })).status).toBe(403);
	});

	it("pytanie spoza pozycji → 400", async () => {
		// Prawidłowy uuid v4, ale spoza config_json.questionItemIds — trafia w gałąź
		// „Question not in item", nie w walidację kształtu.
		expect(
			(await hint(itemOpen, { questionItemId: "22222222-2222-4222-8222-222222222222" })).status,
		).toBe(400);
	});

	it("pozycja bez podpowiedzi → 409, brak zapisu", async () => {
		const res = await hint(itemNoHints, { questionItemId: questionNoHints });
		expect(res.status).toBe(409);
		expect(await grantedEntry(itemNoHints, questionNoHints)).toBeUndefined();
	});

	it("§5.7: odsłonięcie ×3 bez odpowiedzi → progress in_progress, attempts=0, pozycja dostępna", async () => {
		await db.execute(
			sql`UPDATE curriculum_item_progress SET hints_revealed_json = '{}'::jsonb
			    WHERE student_id = ${studentId} AND item_id = ${itemOpen}`,
		);
		await db.execute(
			sql`DELETE FROM curriculum_item_progress WHERE student_id = ${studentId} AND item_id = ${itemOpen}`,
		);
		for (let i = 0; i < 3; i++) {
			const res = await hint(itemOpen, { questionItemId: questionOne });
			expect(res.status).toBe(200);
		}
		const entry = await grantedEntry(itemOpen, questionOne);
		expect(entry?.d).toBe(2); // sufit min(2 podpowiedzi, 3)
		expect(entry?.at).toHaveLength(2); // przy zapisie równość: 2 wzrosty = 2 znaczniki

		const prog = await db
			.execute(
				sql`SELECT status, attempts FROM curriculum_item_progress
				    WHERE student_id = ${studentId} AND item_id = ${itemOpen}`,
			)
			.then((r: { rows: { status: string; attempts: number }[] }) => r.rows[0]);
		expect(prog.status).toBe("in_progress");
		expect(prog.attempts).toBe(0);
	});

	it("§5.6: dwa RÓWNOLEGŁE /hint → d=2 i dokładnie 2 wpisy `at`", async () => {
		await db.execute(
			sql`DELETE FROM curriculum_item_progress WHERE student_id = ${studentId} AND item_id = ${itemOpen}`,
		);
		const [r1, r2] = await Promise.all([
			hint(itemOpen, { questionItemId: questionOne }),
			hint(itemOpen, { questionItemId: questionOne }),
		]);
		expect(r1.status).toBe(200);
		expect(r2.status).toBe(200);
		const entry = await grantedEntry(itemOpen, questionOne);
		expect(entry?.d).toBe(2);
		expect(entry?.at).toHaveLength(2);
	});

	it("§5.5: /hint ×2 → /answer z fałszywym hintDepth:0 → wiersz ma hint_depth=2, source='server'", async () => {
		await db.execute(
			sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId} AND item_id = ${itemOpen}`,
		);
		await db.execute(
			sql`DELETE FROM curriculum_item_progress WHERE student_id = ${studentId} AND item_id = ${itemOpen}`,
		);
		await hint(itemOpen, { questionItemId: questionOne });
		await hint(itemOpen, { questionItemId: questionOne });

		const answered = await answerPOST(
			new Request("http://test.local", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					questionItemId: questionOne,
					answer: { selected: 0 },
					hintDepth: 0, // JAWNIE sfałszowane — serwer musi je zignorować
				}),
			}),
			{ params: Promise.resolve({ id: itemOpen }) },
		);
		expect(answered.status).toBe(200);
		const row = await db
			.execute(
				sql`SELECT hint_depth, hint_depth_source FROM curriculum_item_answers
				    WHERE student_id = ${studentId} AND item_id = ${itemOpen} AND question_item_id = ${questionOne}
				    ORDER BY answered_at DESC LIMIT 1`,
			)
			.then((r: { rows: { hint_depth: number; hint_depth_source: string }[] }) => r.rows[0]);
		expect(row.hint_depth).toBe(2);
		expect(row.hint_depth_source).toBe("server");
	});

	it("§5.4: INSERT do answers bez hint_depth_source → BŁĄD (DROP DEFAULT)", async () => {
		await expect(
			db.execute(
				sql`INSERT INTO curriculum_item_answers (student_id, tenant_id, item_id, question_item_id, is_correct, hint_depth)
				    SELECT ${studentId}, tenant_id, ${itemOpen}, ${questionOne}, true, 1
				    FROM students WHERE id = ${studentId}`,
			),
		).rejects.toThrow();
	});

	it("D3: readMeasuredHintDepths pomija wiersze 'client'", async () => {
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(
			sql`INSERT INTO curriculum_item_answers (student_id, tenant_id, item_id, question_item_id, is_correct, hint_depth, hint_depth_source)
			    SELECT ${studentId}, tenant_id, ${itemOpen}, ${questionOne}, true, 0, 'client'
			    FROM students WHERE id = ${studentId}`,
		);
		await db.execute(
			sql`INSERT INTO curriculum_item_answers (student_id, tenant_id, item_id, question_item_id, is_correct, hint_depth, hint_depth_source)
			    SELECT ${studentId}, tenant_id, ${itemOpen}, ${questionOne}, true, 2, 'server'
			    FROM students WHERE id = ${studentId}`,
		);
		const measured = await readMeasuredHintDepths(studentId);
		expect(measured).toHaveLength(1);
		expect(measured[0].hintDepth).toBe(2);
	});
});
