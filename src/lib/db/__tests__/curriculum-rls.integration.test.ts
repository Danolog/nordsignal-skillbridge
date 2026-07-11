// @vitest-environment node
//
// 1E.1a (ADR-014 D2) — DoD NA REALNEJ BAZIE: RLS tabel curriculum (migracja 0035).
//  • K-INT: student widzi WYŁĄCZNIE swoje wiersze progress/answers/module_progress
//    (RLS filtruje mimo braku WHERE),
//  • K-INT: app_student NIE zapisze (grant TYLKO SELECT — zapisy owner-side),
//  • K-PUB: definicje treści (curriculum_modules) czytelne dla studenta,
//    ale niezapisywalne.
// Trasy /api/curriculum/* wchodzą w PR-2 (1E.1d/e) — ten test pilnuje warstwy
// danych, na której staną.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0035).

import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER_A = "u-1e1-wlasciciel";
const USER_B = "u-1e1-obcy";

// Drizzle opakowuje błąd Postgresa („Failed query: …"), a `permission denied`
// ląduje w łańcuchu error.cause — sprawdzamy cały łańcuch, nie sam message
// (mocniejsze niż gołe .rejects.toThrow(): FK/CHECK violation NIE przejdzie).
function isPermissionDenied(err: unknown): boolean {
	for (let e = err; e; e = (e as { cause?: unknown }).cause) {
		if (/permission denied/i.test(String((e as Error).message ?? e))) return true;
	}
	return false;
}

dBack("1E.1a · curriculum: RLS K-INT + odczyt K-PUB (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: tenant-context ładowany dynamicznie.
	let withTenantContext: any;

	let tenantId = "";
	let moduleId = "";
	let itemId = "";
	let questionItemId = "";
	const studentIds: Record<string, string> = {};

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		({ withTenantContext } = await import("@/lib/db/tenant-context"));

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e1', 'Tenant 1E.1')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;

		for (const userId of [USER_A, USER_B]) {
			await db.execute(
				sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${userId}, ${userId}, ${`${userId}@test.local`}, true, now(), now())
			    ON CONFLICT (id) DO NOTHING`,
			);
			const [student] = await db
				.execute(
					sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${userId}, ${tenantId}, 'Test U', 'Informatyka', 3, 'data-science')
				    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
				    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			studentIds[userId] = student.id;
		}

		// Definicje treści (owner — jak ingest 1E.1c): moduł + pozycja exercise
		// + koncept i pytanie banku A5 (FK answers → question_items).
		const [mod] = await db
			.execute(
				sql`INSERT INTO curriculum_modules (slug, title)
			    VALUES ('t-1e1-modul', 'Moduł testowy 1E.1')
			    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		moduleId = mod.id;
		const [item] = await db
			.execute(
				sql`INSERT INTO curriculum_module_items (module_id, position, kind, title)
			    VALUES (${moduleId}, 1, 'exercise', 'Pozycja testowa')
			    ON CONFLICT DO NOTHING RETURNING id`,
			)
			.then(async (r: { rows: { id: string }[] }) => {
				if (r.rows.length > 0) return r.rows;
				return db
					.execute(
						sql`SELECT id FROM curriculum_module_items
					    WHERE module_id = ${moduleId} AND position = 1`,
					)
					.then((q: { rows: { id: string }[] }) => q.rows);
			});
		itemId = item.id;
		const [concept] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk)
			    VALUES ('t-1e1-koncept', 'Koncept testowy 1E.1', 'foundations')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		const [qItem] = await db
			.execute(
				sql`INSERT INTO question_items (concept_id, type, difficulty, stem, answer_json)
			    VALUES (${concept.id}, 'single_choice', 1, 'Pytanie testowe 1E.1?', '{"correct":0}'::jsonb)
			    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		questionItemId = qItem.id;

		// Dane OBU studentów (owner-side — jak trasy PR-2).
		for (const userId of [USER_A, USER_B]) {
			const sid = studentIds[userId];
			await db.execute(
				sql`INSERT INTO curriculum_item_progress (student_id, tenant_id, item_id, status)
			    VALUES (${sid}, ${tenantId}, ${itemId}, 'in_progress')
			    ON CONFLICT (student_id, item_id) DO NOTHING`,
			);
			await db.execute(
				sql`INSERT INTO curriculum_item_answers
			      (student_id, tenant_id, item_id, question_item_id, is_correct, hint_depth)
			    VALUES (${sid}, ${tenantId}, ${itemId}, ${questionItemId}, true, 0)`,
			);
			await db.execute(
				sql`INSERT INTO curriculum_module_progress (student_id, tenant_id, module_id, status)
			    VALUES (${sid}, ${tenantId}, ${moduleId}, 'available')
			    ON CONFLICT (student_id, module_id) DO NOTHING`,
			);
		}
	});

	it("RLS: student widzi wyłącznie swoje wiersze we wszystkich trzech tabelach K-INT", async () => {
		const seenByB = await withTenantContext(
			{ userId: USER_B, tenantId, role: "student" },
			// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
			async (tx: any) => {
				const progress = await tx.execute(sql`SELECT student_id FROM curriculum_item_progress`);
				const answers = await tx.execute(sql`SELECT student_id FROM curriculum_item_answers`);
				const modules = await tx.execute(sql`SELECT student_id FROM curriculum_module_progress`);
				return [...progress.rows, ...answers.rows, ...modules.rows];
			},
		);
		expect(seenByB.length).toBeGreaterThan(0);
		expect(new Set(seenByB.map((r: { student_id: string }) => r.student_id))).toEqual(
			new Set([studentIds[USER_B]]),
		);
	});

	it("RLS: app_student nie zapisze do tabel K-INT (grant TYLKO SELECT)", async () => {
		await expect(
			withTenantContext(
				{ userId: USER_B, tenantId, role: "student" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) =>
					tx.execute(
						sql`INSERT INTO curriculum_item_answers
					      (student_id, tenant_id, item_id, question_item_id, is_correct, hint_depth)
					    VALUES (${studentIds[USER_B]}, ${tenantId}, ${itemId}, ${questionItemId}, true, 0)`,
					),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});

	it("K-PUB: definicje treści czytelne dla studenta, ale niezapisywalne", async () => {
		const rows = await withTenantContext(
			{ userId: USER_B, tenantId, role: "student" },
			// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
			async (tx: any) =>
				tx
					.execute(sql`SELECT slug FROM curriculum_modules WHERE slug = 't-1e1-modul'`)
					.then((r: { rows: { slug: string }[] }) => r.rows),
		);
		expect(rows.map((r: { slug: string }) => r.slug)).toContain("t-1e1-modul");

		await expect(
			withTenantContext(
				{ userId: USER_B, tenantId, role: "student" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) =>
					tx.execute(sql`INSERT INTO curriculum_modules (slug, title) VALUES ('t-1e1-wlam', 'x')`),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});
});
