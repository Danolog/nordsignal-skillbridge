// @vitest-environment node
//
// 1E.6a — GET /api/curriculum/items/[id] NA REALNEJ BAZIE:
//  • flaga off → 404, brak sesji → 401 (jak reszta tras curriculum),
//  • pozycja w ZABLOKOWANYM module → 403; pozycja `locked` w sekwencji → 403
//    (bramką jest serwer, nie UI),
//  • 200 z treścią (contentMd + podpowiedzi + pytania w kształcie dla klienta),
//  • 🔴 KRYTYCZNE: odpowiedź NIE zawiera klucza odpowiedzi ani feedbacku —
//    żadnego answerJson/answer_json, optionFeedbackJson/option_feedback_json,
//    explanationMd/explanation_md, ani ich WARTOŚCI w surowym JSON-ie.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`.

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

const USER = "u-1e6a-student";
const SECRET_EXPLANATION = "TAJNE-WYJASNIENIE-1E6A";
const SECRET_FEEDBACK = "TAJNY-FEEDBACK-OPCJI-1E6A";

/** Wszystkie klucze w drzewie JSON (rekurencyjnie) — dowód braku wycieku. */
function allKeys(value: unknown, acc: string[] = []): string[] {
	if (Array.isArray(value)) {
		for (const v of value) allKeys(v, acc);
	} else if (value !== null && typeof value === "object") {
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			acc.push(k);
			allKeys(v, acc);
		}
	}
	return acc;
}

dBack("1E.6a · GET /api/curriculum/items/[id] — treść bez klucza odpowiedzi", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let itemGET: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let answerPOST: any;

	let itemOpen = ""; // pozycja 1 modułu A — dostępna
	let itemNext = ""; // pozycja 2 modułu A — locked (sekwencja)
	let itemInLockedModule = ""; // pozycja modułu B — moduł zablokowany prereqiem
	let questionOne = "";

	const call = (id: string) =>
		itemGET(new Request("http://test.local"), { params: Promise.resolve({ id }) });

	beforeAll(async () => {
		process.env.FLAG_CURRICULUM_PATH = "1";
		({ db } = await import("@/lib/db"));
		({ GET: itemGET } = await import("../items/[id]/route"));
		({ POST: answerPOST } = await import("../items/[id]/answer/route"));
		mockGetSession.mockResolvedValue({ user: { id: USER } });

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e6a', 'Tenant 1E.6a')
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
			    ON CONFLICT (user_id) DO UPDATE SET career_goal = EXCLUDED.career_goal
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		const studentId = student.id;

		const [concept] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk)
			    VALUES ('t-1e6a-koncept', 'Koncept 1E.6a', 'foundations')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);

		for (const [slug, title] of [
			["t-1e6a-a", "Moduł A (1E.6a)"],
			["t-1e6a-b", "Moduł B (1E.6a)"],
		]) {
			await db.execute(
				sql`INSERT INTO curriculum_modules (slug, title) VALUES (${slug}, ${title})
			    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title`,
			);
		}
		const modules = await db
			.execute(sql`SELECT id, slug FROM curriculum_modules WHERE slug IN ('t-1e6a-a','t-1e6a-b')`)
			.then((r: { rows: { id: string; slug: string }[] }) => r.rows);
		const moduleA = modules.find((m: { slug: string }) => m.slug === "t-1e6a-a")?.id ?? "";
		const moduleB = modules.find((m: { slug: string }) => m.slug === "t-1e6a-b")?.id ?? "";
		await db.execute(
			sql`INSERT INTO curriculum_module_prereqs (module_id, requires_module_id)
		    VALUES (${moduleB}, ${moduleA}) ON CONFLICT DO NOTHING`,
		);

		// Pytanie z KLUCZEM, wyjaśnieniem i feedbackiem per opcja — wartości
		// unikalne, żeby dało się je wyłapać w surowym JSON-ie odpowiedzi.
		const [q] = await db
			.execute(
				sql`INSERT INTO question_items
			      (concept_id, type, difficulty, stem, options_json, answer_json, explanation_md, option_feedback_json)
			    VALUES (${concept.id}, 'single_choice', 1, 'Pytanie 1E.6a?',
			      '["Opcja A","Opcja B"]'::jsonb, '{"correct":0}'::jsonb, ${SECRET_EXPLANATION},
			      ${JSON.stringify([{ feedbackMd: SECRET_FEEDBACK }, { feedbackMd: SECRET_FEEDBACK }])}::jsonb)
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		questionOne = q.id;

		await db.execute(
			sql`DELETE FROM curriculum_module_items WHERE module_id IN (${moduleA}, ${moduleB})`,
		);
		const config = JSON.stringify({
			questionItemIds: [q.id],
			hints: ["Podpowiedź 1", "Podpowiedź 2"],
			estimated: "10–15 min",
		});
		const [open] = await db
			.execute(
				sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, content_md, config_json)
			    VALUES (${moduleA}, 'poz-1', 1, 'exercise', 'Pozycja 1', '### Teoria 1E.6a', ${config}::jsonb)
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		itemOpen = open.id;
		const [next] = await db
			.execute(
				sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, content_md, config_json)
			    VALUES (${moduleA}, 'poz-2', 2, 'exercise', 'Pozycja 2', '### Teoria druga', ${config}::jsonb)
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		itemNext = next.id;
		const [inLocked] = await db
			.execute(
				sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, content_md, config_json)
			    VALUES (${moduleB}, 'poz-1', 1, 'exercise', 'Pozycja B1', '### Teoria B', ${config}::jsonb)
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		itemInLockedModule = inLocked.id;

		await db.execute(sql`INSERT INTO curriculum_item_resources (item_id, title, url, type, language)
		    VALUES (${itemOpen}, 'Docs Pythona', 'https://docs.python.org', 'docs', 'EN')`);

		// Czysty stan postępu (idempotencja powtórnych biegów).
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_item_progress WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
	});

	it("flaga off → 404 (feature nie istnieje)", async () => {
		delete process.env.FLAG_CURRICULUM_PATH;
		expect((await call(itemOpen)).status).toBe(404);
		process.env.FLAG_CURRICULUM_PATH = "1";
	});

	it("brak sesji → 401", async () => {
		mockGetSession.mockResolvedValueOnce(null);
		expect((await call(itemOpen)).status).toBe(401);
	});

	it("nieistniejąca pozycja → 404", async () => {
		const res = await call("00000000-0000-0000-0000-000000000000");
		expect(res.status).toBe(404);
	});

	it("pozycja w zablokowanym module → 403 (prereq egzekwuje serwer)", async () => {
		const res = await call(itemInLockedModule);
		expect(res.status).toBe(403);
		expect((await res.json()).error).toBe("Module locked");
	});

	it("pozycja `locked` w sekwencji modułu → 403", async () => {
		const res = await call(itemNext);
		expect(res.status).toBe(403);
		expect((await res.json()).error).toBe("Item locked");
	});

	it("200: treść pozycji (teoria, podpowiedzi, pytania, zasoby)", async () => {
		const res = await call(itemOpen);
		expect(res.status).toBe(200);
		const body = await res.json();

		expect(body.item).toMatchObject({
			id: itemOpen,
			kind: "exercise",
			title: "Pozycja 1",
			status: "available",
			contentMd: "### Teoria 1E.6a",
			estimatedTime: "10–15 min",
		});
		expect(body.item.hints).toEqual(["Podpowiedź 1", "Podpowiedź 2"]);
		expect(body.module.slug).toBe("t-1e6a-a");
		expect(body.questions).toEqual([
			{
				id: questionOne,
				type: "single_choice",
				stem: "Pytanie 1E.6a?",
				options: ["Opcja A", "Opcja B"],
			},
		]);
		expect(body.resources).toHaveLength(1);
		expect(body.resources[0]).toMatchObject({ url: "https://docs.python.org", language: "EN" });
	});

	it("🔴 KRYTYCZNE: odpowiedź NIE zawiera klucza odpowiedzi ani feedbacku", async () => {
		const res = await call(itemOpen);
		const raw = await res.text();
		const body = JSON.parse(raw);

		const keys = new Set(allKeys(body));
		for (const forbidden of [
			"answerJson",
			"answer_json",
			"answer",
			"correct",
			"optionFeedbackJson",
			"option_feedback_json",
			"optionFeedbackMd",
			"explanationMd",
			"explanation_md",
		]) {
			expect(keys.has(forbidden), `klucz ${forbidden} nie może wyjść do klienta`).toBe(false);
		}
		// Wartości też nie mogą przeciec inną drogą (np. w config_json pozycji).
		expect(raw).not.toContain(SECRET_EXPLANATION);
		expect(raw).not.toContain(SECRET_FEEDBACK);
		expect(raw).not.toContain("questionItemIds");
	});

	it("pytania zaliczone wracają jako answeredCorrectQuestionIds (pętla ich nie powtarza)", async () => {
		const before = await (await call(itemOpen)).json();
		expect(before.answeredCorrectQuestionIds).toEqual([]);

		const answered = await answerPOST(
			new Request("http://test.local", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ questionItemId: questionOne, answer: { selected: 0 } }),
			}),
			{ params: Promise.resolve({ id: itemOpen }) },
		);
		expect((await answered.json()).correct).toBe(true);

		const after = await (await call(itemOpen)).json();
		expect(after.answeredCorrectQuestionIds).toEqual([questionOne]);
		expect(after.item.status).toBe("completed");
	});
});
