// @vitest-environment node
//
// 1.17 — DoD NA REALNEJ BAZIE: instrumentacja placement rate.
//  • flaga off → trasy nie istnieją (404),
//  • zgoda opt-in (audytowana), zdarzenia WYMAGAJĄ zgody (403 bez niej),
//  • baseline dokładnie raz (partial unique → 409, status nietknięty),
//  • zdarzenie pracy z careerAligned; data z przyszłości → 400,
//  • odwołanie zgody KASUJE zdarzenia w tej samej tx (delete-on-revoke),
//  • RLS: app_student widzi wyłącznie swoje wiersze (student_sees_own).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0033).

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

const USER_A = "u-117-zgodny";
const USER_B = "u-117-obcy";

function jsonRequest(body: unknown): Request {
	return new Request("http://test.local/api/placement", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

dBack("1.17 · placement: zgoda, baseline, zdarzenia, delete-on-revoke, RLS (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let consentPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let eventsPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: tenant-context ładowany dynamicznie.
	let withTenantContext: any;

	let tenantId = "";
	const studentIds: Record<string, string> = {};

	function asUser(userId: string) {
		mockGetSession.mockResolvedValue({ user: { id: userId } });
	}

	beforeAll(async () => {
		process.env.FLAG_PLACEMENT_TRACKING = "1";
		({ db } = await import("@/lib/db"));
		({ withTenantContext } = await import("@/lib/db/tenant-context"));
		({ POST: consentPOST } = await import("../consent/route"));
		({ POST: eventsPOST } = await import("../events/route"));

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-117', 'Tenant 1.17')
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
		delete process.env.FLAG_PLACEMENT_TRACKING;
	});

	it("flaga off → obie trasy 404 (feature nie istnieje)", async () => {
		delete process.env.FLAG_PLACEMENT_TRACKING;
		asUser(USER_A);
		expect((await consentPOST(jsonRequest({ consent: true }))).status).toBe(404);
		expect((await eventsPOST(jsonRequest({ kind: "baseline" }))).status).toBe(404);
		process.env.FLAG_PLACEMENT_TRACKING = "1";
	});

	it("zdarzenie BEZ zgody → 403; zbieranie bramkowane per student", async () => {
		asUser(USER_A);
		const res = await eventsPOST(
			jsonRequest({
				kind: "baseline",
				employmentStatus: "studying",
				occurredAt: new Date().toISOString(),
			}),
		);
		expect(res.status).toBe(403);
	});

	it("zgoda → audyt granted; baseline zapisany; drugi baseline → 409", async () => {
		asUser(USER_A);
		const consent = await consentPOST(jsonRequest({ consent: true }));
		expect(consent.status).toBe(200);

		const audit = await db
			.execute(
				sql`SELECT count(*)::int AS c FROM audit_log
			    WHERE action = 'placement.consent.granted' AND actor_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: { c: number }[] }) => r.rows[0].c);
		expect(audit).toBeGreaterThanOrEqual(1);

		const baseline = await eventsPOST(
			jsonRequest({
				kind: "baseline",
				employmentStatus: "seeking",
				occurredAt: new Date().toISOString(),
			}),
		);
		expect(baseline.status).toBe(200);

		const second = await eventsPOST(
			jsonRequest({
				kind: "baseline",
				employmentStatus: "studying",
				occurredAt: new Date().toISOString(),
			}),
		);
		expect(second.status).toBe(409);

		const rows = await db
			.execute(
				sql`SELECT kind, employment_status FROM placement_events WHERE student_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(rows).toEqual([{ kind: "baseline", employment_status: "seeking" }]);
	});

	it("zdarzenie pracy z careerAligned; data z przyszłości → 400", async () => {
		asUser(USER_A);
		const future = await eventsPOST(
			jsonRequest({
				kind: "job",
				careerAligned: true,
				occurredAt: new Date(Date.now() + 86_400_000).toISOString(),
			}),
		);
		expect(future.status).toBe(400);

		const ok = await eventsPOST(
			jsonRequest({
				kind: "internship",
				careerAligned: true,
				occurredAt: "2026-07-01",
				note: "Staż DS",
			}),
		);
		expect(ok.status).toBe(200);
	});

	it("RLS: app_student widzi wyłącznie swoje zdarzenia (student_sees_own)", async () => {
		const seenByA = await withTenantContext(
			{ userId: USER_A, tenantId, role: "student" },
			async (tx: { execute: (q: unknown) => Promise<{ rows: unknown[] }> }) => {
				const r = await tx.execute(sql`SELECT student_id FROM placement_events`);
				return r.rows as { student_id: string }[];
			},
		);
		expect(seenByA.length).toBeGreaterThanOrEqual(2);
		expect(new Set(seenByA.map((r: { student_id: string }) => r.student_id))).toEqual(
			new Set([studentIds[USER_A]]),
		);

		const seenByB = await withTenantContext(
			{ userId: USER_B, tenantId, role: "student" },
			async (tx: { execute: (q: unknown) => Promise<{ rows: unknown[] }> }) => {
				const r = await tx.execute(sql`SELECT student_id FROM placement_events`);
				return r.rows;
			},
		);
		expect(seenByB).toEqual([]);
	});

	it("odwołanie zgody → zdarzenia SKASOWANE w tej samej tx + audyt revoked", async () => {
		asUser(USER_A);
		const res = await consentPOST(jsonRequest({ consent: false }));
		expect(res.status).toBe(200);

		const left = await db
			.execute(
				sql`SELECT count(*)::int AS c FROM placement_events WHERE student_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: { c: number }[] }) => r.rows[0].c);
		expect(left).toBe(0);

		const audit = await db
			.execute(
				sql`SELECT count(*)::int AS c FROM audit_log
			    WHERE action = 'placement.consent.revoked' AND actor_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: { c: number }[] }) => r.rows[0].c);
		expect(audit).toBeGreaterThanOrEqual(1);

		// Po odwołaniu zbieranie znowu zablokowane.
		const blocked = await eventsPOST(
			jsonRequest({ kind: "job", careerAligned: false, occurredAt: "2026-07-01" }),
		);
		expect(blocked.status).toBe(403);
	});
});
