// @vitest-environment node
//
// 1E.2 (ustalenie wiążące #4 z przeglądu Ethana) — testy complete-route
// NA REALNEJ BAZIE, wariant C zaliczenia projektu (decyzja Darka pkt 2):
//  • flaga off → 404 (zachowanie jak dziś),
//  • pozycja project BEZ zgłoszenia submitted/verified → 409,
//  • pozycja project ZE zgłoszeniem submitted → sukces (item + moduł completed),
//  • pozycja lab → 501 (checki automatyczne wchodzą w 1E.6 — bez samodeklaracji),
//  • 1E.2: odpowiedź na pytanie labu zapisuje się, ale NIE kompletuje pozycji.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0036).

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

const USER = "u-1e2-complete";

dBack("1E.2 · complete-route: wariant C (409/sukces/lab 501/OFF 404)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: handler ładowany dynamicznie.
	let completePOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handler ładowany dynamicznie.
	let answerPOST: any;

	let tenantId = "";
	let studentId = "";
	let moduleId = "";
	let projectId = "";
	let projectItem = "";
	let labItem = "";
	let labQuestion = "";

	const complete = (itemId: string) =>
		completePOST(new Request("http://t", { method: "POST" }), {
			params: Promise.resolve({ id: itemId }),
		});

	beforeAll(async () => {
		process.env.FLAG_CURRICULUM_PATH = "1";
		({ db } = await import("@/lib/db"));
		({ POST: completePOST } = await import("../items/[id]/complete/route"));
		({ POST: answerPOST } = await import("../items/[id]/answer/route"));
		mockGetSession.mockResolvedValue({ user: { id: USER } });

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e2-c', 'Tenant 1E.2 complete')
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
			    VALUES (${USER}, ${tenantId}, 'Test U', 'Informatyka', 3, 'Data Scientist')
			    ON CONFLICT (user_id) DO UPDATE SET career_goal = EXCLUDED.career_goal
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		studentId = student.id;

		// Moduł bez prereqów (odblokowany) z pozycją project (capstone syntetyczny)
		// i pozycją lab z 1 pytaniem retrieval.
		const [mod] = await db
			.execute(
				sql`INSERT INTO curriculum_modules (slug, title) VALUES ('t-1e2-complete', 'Moduł 1E.2 complete')
			    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		moduleId = mod.id;
		const [project] = await db
			.execute(
				sql`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type)
			    VALUES ('t-1e2-capstone', 'Capstone testowy 1E.2', 'Syntetyczny projekt testu complete-route', 'L1', 4, 'open_data')
			    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		projectId = project.id;

		const [concept] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk)
			    VALUES ('t-1e2-c-koncept', 'Koncept 1E.2 complete', 'foundations')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		const [q] = await db
			.execute(
				sql`INSERT INTO question_items (concept_id, type, difficulty, stem, options_json, answer_json, explanation_md, option_feedback_json)
			    VALUES (${concept.id}, 'single_choice', 1, 'Lab 1E.2: pytanie retrieval?', '["a","b"]'::jsonb, '{"correct":0}'::jsonb, 'Bo a.',
			            '[{"feedbackMd":"Tak — a."},{"feedbackMd":"Nie — b to pułapka."}]'::jsonb)
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		labQuestion = q.id;

		for (const [slug, position, kind, config] of [
			["projekt", 10, "project", null],
			["lab", 20, "lab", JSON.stringify({ questionItemIds: [q.id] })],
		] as const) {
			const [item] = await db
				.execute(
					sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, project_id, config_json)
				    VALUES (${moduleId}, ${slug}, ${position}, ${kind}, ${`Pozycja ${slug}`},
				            ${kind === "project" ? projectId : null}, ${config}::jsonb)
				    ON CONFLICT (module_id, slug) DO UPDATE SET config_json = EXCLUDED.config_json,
				      project_id = EXCLUDED.project_id, position = EXCLUDED.position
				    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			if (kind === "project") projectItem = item.id;
			else labItem = item.id;
		}

		// Czysty stan (idempotencja suity): postęp i zgłoszenia z poprzednich biegów.
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_item_progress WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
		await db.execute(
			sql`DELETE FROM project_submissions WHERE student_id = ${studentId} AND project_id = ${projectId}`,
		);
	});

	it("flaga off → 404 (zachowanie jak dziś)", async () => {
		delete process.env.FLAG_CURRICULUM_PATH;
		expect((await complete(projectItem)).status).toBe(404);
		process.env.FLAG_CURRICULUM_PATH = "1";
	});

	it("project bez zgłoszenia submitted/verified → 409 (bez samodeklaracji)", async () => {
		const res = await complete(projectItem);
		expect(res.status).toBe(409);
	});

	it("zgłoszenie in_progress to NIE submitted → nadal 409 (wariant C)", async () => {
		await db.execute(
			sql`INSERT INTO project_submissions (student_id, tenant_id, project_id, status)
		    VALUES (${studentId}, ${tenantId}, ${projectId}, 'in_progress')`,
		);
		expect((await complete(projectItem)).status).toBe(409);
	});

	it("zgłoszenie submitted → sukces: pozycja completed (moduł jeszcze nie — lab otwarty)", async () => {
		await db.execute(
			sql`UPDATE project_submissions SET status = 'submitted', submitted_at = now()
		    WHERE student_id = ${studentId} AND project_id = ${projectId}`,
		);
		const res = await complete(projectItem);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({
			itemCompleted: true,
			moduleCompleted: false,
			submissionStatus: "submitted",
		});
	});

	it("1E.2: odpowiedź na pytanie labu zapisuje się z feedbackiem opcji, ale NIE kompletuje pozycji", async () => {
		const res = await answerPOST(
			new Request("http://t", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ questionItemId: labQuestion, answer: { selected: 0 } }),
			}),
			{ params: Promise.resolve({ id: labItem }) },
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({
			correct: true,
			itemCompleted: false,
			moduleCompleted: false,
			optionFeedbackMd: "Tak — a.",
		});
		const rows = await db.execute(
			sql`SELECT is_correct FROM curriculum_item_answers
		    WHERE student_id = ${studentId} AND item_id = ${labItem}`,
		);
		expect(rows.rows).toHaveLength(1);
	});

	it("lab → 501 (checki automatyczne = 1E.6; pozycja niekompletowalna)", async () => {
		const res = await complete(labItem);
		expect(res.status).toBe(501);
	});
});
