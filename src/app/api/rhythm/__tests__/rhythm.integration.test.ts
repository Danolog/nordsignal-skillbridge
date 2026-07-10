// @vitest-environment node
//
// 1.18 — DoD NA REALNEJ BAZIE: rytm nauki.
//  • flaga off → trasy 404,
//  • upsert deklaracji (drugi POST nadpisuje, nie dubluje),
//  • check-in: weekStart server-side, drugi w tym samym tygodniu = update,
//  • streak z REALNYCH śladów (check-in + tura tutora w różnych tygodniach),
//  • zastój + dismiss: alert wg epizodów (getRhythmState),
//  • RLS: student widzi wyłącznie swój rytm/check-iny.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0034).

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const USER_A = "u-118-rytm";
const USER_B = "u-118-obcy";

function jsonRequest(body: unknown): Request {
	return new Request("http://test.local/api/rhythm", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

dBack("1.18 · rytm: deklaracja, check-iny, streak z realnych śladów, RLS (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let rhythmPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let checkinPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let dismissPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: lib ładowany dynamicznie.
	let getRhythmState: any;
	// biome-ignore lint/suspicious/noExplicitAny: tenant-context ładowany dynamicznie.
	let withTenantContext: any;

	let tenantId = "";
	const studentIds: Record<string, string> = {};

	function asUser(userId: string) {
		mockGetSession.mockResolvedValue({ user: { id: userId } });
	}

	beforeAll(async () => {
		process.env.FLAG_STUDY_RHYTHM = "1";
		({ db } = await import("@/lib/db"));
		({ withTenantContext } = await import("@/lib/db/tenant-context"));
		({ POST: rhythmPOST } = await import("../route"));
		({ POST: checkinPOST } = await import("../checkin/route"));
		({ POST: dismissPOST } = await import("../stagnation-dismiss/route"));
		({ getRhythmState } = await import("@/lib/rhythm/state"));

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-118', 'Tenant 1.18')
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
			await db.execute(sql`DELETE FROM students WHERE user_id = ${userId}`);
			const [s] = await db
				.execute(
					sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal, onboarding_completed)
				    VALUES (${userId}, ${tenantId}, 'U', 'Inf', 4, 'Data Scientist', true) RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			studentIds[userId] = s.id;
		}
	});

	afterAll(async () => {
		for (const userId of [USER_A, USER_B]) {
			await db.execute(sql`DELETE FROM students WHERE user_id = ${userId}`);
		}
		delete process.env.FLAG_STUDY_RHYTHM;
	});

	it("flaga off → wszystkie trasy 404", async () => {
		delete process.env.FLAG_STUDY_RHYTHM;
		asUser(USER_A);
		expect((await rhythmPOST(jsonRequest({ hoursPerWeek: 6, days: [] }))).status).toBe(404);
		expect((await checkinPOST(jsonRequest({ hoursActual: 3 }))).status).toBe(404);
		expect((await dismissPOST()).status).toBe(404);
		process.env.FLAG_STUDY_RHYTHM = "1";
	});

	it("deklaracja: upsert (drugi POST nadpisuje, nie dubluje); walidacja dni", async () => {
		asUser(USER_A);
		expect((await rhythmPOST(jsonRequest({ hoursPerWeek: 6, days: ["mon", "wed"] }))).status).toBe(
			200,
		);
		expect((await rhythmPOST(jsonRequest({ hoursPerWeek: 10, days: ["sat"] }))).status).toBe(200);
		expect((await rhythmPOST(jsonRequest({ hoursPerWeek: 6, days: ["xx"] }))).status).toBe(400);
		expect((await rhythmPOST(jsonRequest({ hoursPerWeek: 0, days: [] }))).status).toBe(400);

		const rows = await db
			.execute(
				sql`SELECT hours_per_week, days FROM study_rhythms WHERE student_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(rows).toEqual([{ hours_per_week: 10, days: ["sat"] }]);
	});

	it("check-in: weekStart server-side; drugi w tym samym tygodniu = update", async () => {
		asUser(USER_A);
		const first = await checkinPOST(jsonRequest({ hoursActual: 4, note: "start" }));
		expect(first.status).toBe(200);
		const second = await checkinPOST(jsonRequest({ hoursActual: 7 }));
		expect(second.status).toBe(200);
		// Pusty check-in (ani godzin, ani notatki) → 400.
		expect((await checkinPOST(jsonRequest({}))).status).toBe(400);

		const rows = await db
			.execute(
				sql`SELECT hours_actual, note FROM study_checkins WHERE student_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(rows).toEqual([{ hours_actual: 7, note: null }]);
	});

	it("streak z realnych śladów: check-in (bieżący) + tura tutora (zeszły tydzień) → 2", async () => {
		// Ślad w zeszłym tygodniu: tura tutora z przestawionym created_at.
		const [project] = await db
			.execute(
				sql`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, status)
			    VALUES ('p-118', 'P 1.18', 'x', 'L1', 2, 'open_data', 'active')
			    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		await db.execute(
			sql`INSERT INTO tutor_turns (student_id, tenant_id, project_id, turn_index, role, content, created_at)
		    VALUES (${studentIds[USER_A]}, ${tenantId}, ${project.id}, 0, 'user', 'ślad', now() - interval '7 days')`,
		);

		const state = await getRhythmState(studentIds[USER_A]);
		expect(state.streakWeeks).toBeGreaterThanOrEqual(2);
		expect(state.stagnant).toBe(false);
		expect(state.showStagnationAlert).toBe(false);
		expect(state.currentWeekCheckin).toEqual({ hoursActual: 7, note: null });
	});

	it("zastój: stare ślady → alert; dismiss zamyka epizod", async () => {
		asUser(USER_B);
		expect((await rhythmPOST(jsonRequest({ hoursPerWeek: 5, days: ["mon"] }))).status).toBe(200);
		// Jedyny ślad: check-in postarzony o 10 dni (poniżej progu 7 dni).
		await db.execute(
			sql`INSERT INTO study_checkins (student_id, tenant_id, week_start, hours_actual, created_at)
		    VALUES (${studentIds[USER_B]}, ${tenantId}, date_trunc('week', now() - interval '10 days'), 2, now() - interval '10 days')`,
		);

		let state = await getRhythmState(studentIds[USER_B]);
		expect(state.stagnant).toBe(true);
		expect(state.showStagnationAlert).toBe(true);

		expect((await dismissPOST()).status).toBe(200);
		state = await getRhythmState(studentIds[USER_B]);
		expect(state.stagnant).toBe(true);
		expect(state.showStagnationAlert).toBe(false); // epizod zamknięty
	});

	it("RLS: student widzi wyłącznie swój rytm i check-iny", async () => {
		const seenByB = await withTenantContext(
			{ userId: USER_B, tenantId, role: "student" },
			async (tx: { execute: (q: unknown) => Promise<{ rows: unknown[] }> }) => {
				const rhythms = await tx.execute(sql`SELECT student_id FROM study_rhythms`);
				const checkins = await tx.execute(sql`SELECT student_id FROM study_checkins`);
				return [...rhythms.rows, ...checkins.rows] as { student_id: string }[];
			},
		);
		expect(seenByB.length).toBeGreaterThanOrEqual(2);
		expect(new Set(seenByB.map((r: { student_id: string }) => r.student_id))).toEqual(
			new Set([studentIds[USER_B]]),
		);
	});
});
