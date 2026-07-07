// @vitest-environment node
//
// AG.6 — DoD NA REALNEJ BAZIE: zmiana rynku wprowadzająca nową kompetencję
// generuje powiadomienie U DOTKNIĘTEGO studenta, NIE u innych — plus pełna
// mechanika warstwy powiadomień:
//  • bez decyzji o zgodzie → karta opt-in (decided=false), zdarzeń nie czytamy,
//  • zgoda → nieprzeczytane zdarzenie widoczne (odczyt jako app_student przez
//    withTenantContext — RLS student_sees_own na market_new_gap_events),
//  • student nieobjęty zmianą (własna ścieżka, rynek bez zmian) → zero
//    powiadomień mimo zgody,
//  • mark-read → notified_at wypełnione, drugi odczyt pusty, idempotencja,
//  • wycofanie zgody (RODO) → powiadomienia znikają,
//  • flaga off → cały feature nie istnieje (enabled=false).
//
// Ogniwo swap→recompute jest dowiedzione osobno (unit wiring w decision-route
// + suita AG.4 na realnej bazie); tu wchodzimy od recompute — dokładnie tego
// wywołania, które odpala akceptacja swapu.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (kolumny 0026).

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

// Sesja Better Auth mockowana per test (integracja dowodzi warstwy DB/RLS,
// nie logowania) — przełączana między dwoma studentami.
const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const GOAL_A = "Ścieżka Testowa AG6";
const GOAL_B = "Ścieżka Testowa AG6-Obok";
const USER_A = "u-ag6-dotkniety";
const USER_B = "u-ag6-nieobjety";

dBack("AG.6 · powiadomienie „nowa luka” u dotkniętego studenta, nie u innych (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: funkcje ładowane dynamicznie.
	let runMarketRecompute: any;
	// biome-ignore lint/suspicious/noExplicitAny: funkcje ładowane dynamicznie.
	let getMarketNotificationsState: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let consentPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let readPOST: any;

	let tenantId = "";
	const studentIds: Record<string, string> = {};

	function asUser(userId: string) {
		mockGetSession.mockResolvedValue({ user: { id: userId } });
	}

	async function studentRow(userId: string) {
		const [row] = await db
			.execute(
				sql`SELECT id, tenant_id AS "tenantId", market_monitoring_consent AS "marketMonitoringConsent",
			           market_monitoring_decided_at AS "marketMonitoringDecidedAt"
			    FROM students WHERE user_id = ${userId}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		return row;
	}

	async function stateFor(userId: string) {
		return getMarketNotificationsState(await studentRow(userId), userId);
	}

	async function cleanup() {
		// Zdarzenia globalnie — jak w suicie AG.5: pierwszy recompute w historii
		// bazy „zbiega” kuratorskie zestawy luk demo-studentów (poprawne, ale szum).
		await db.execute(sql`DELETE FROM market_new_gap_events`);
		for (const userId of [USER_A, USER_B]) {
			for (const table of ["gaps", "skill_maps", "passports", "competencies"]) {
				await db.execute(
					sql.raw(
						`DELETE FROM ${table} WHERE student_id IN (SELECT id FROM students WHERE user_id = '${userId}')`,
					),
				);
			}
			await db.execute(sql`DELETE FROM students WHERE user_id = ${userId}`);
			await db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`);
		}
		await db.execute(sql`DELETE FROM job_market_data WHERE career_goal IN (${GOAL_A}, ${GOAL_B})`);
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_MARKET_GAP_NOTIFICATIONS", "1");
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ runMarketRecompute } = await import("@/lib/market-refresh/recompute"));
		({ getMarketNotificationsState } = await import("@/lib/market-notifications"));
		({ POST: consentPOST } = await import("../consent/route"));
		({ POST: readPOST } = await import("../read/route"));
		await cleanup();

		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;

		// Dwie izolowane ścieżki: A dostanie nową kompetencję rynkową, B nie.
		await db.insert(schema.jobMarketData).values([
			{ careerGoal: GOAL_A, competencyName: "Kompetencja A", demandPercentage: 60, category: "II" },
			{ careerGoal: GOAL_B, competencyName: "Kompetencja D", demandPercentage: 50, category: "II" },
		]);
		for (const [userId, goal, comp, pct] of [
			[USER_A, GOAL_A, "Kompetencja A", 60],
			[USER_B, GOAL_B, "Kompetencja D", 50],
		] as const) {
			await db.execute(
				sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
				    VALUES (${userId}, 'AG6 Test', ${`${userId}@test.local`}, true, now(), now())`,
			);
			const [student] = await db
				.insert(schema.students)
				.values({
					userId,
					tenantId,
					university: "Testowa",
					fieldOfStudy: "Informatyka",
					semester: 4,
					careerGoal: goal,
					syllabusText: "",
					onboardingStep: 3,
				})
				.returning({ id: schema.students.id });
			studentIds[userId] = student.id;
			await db.insert(schema.competencies).values({
				studentId: student.id,
				tenantId,
				name: comp,
				status: "acquired",
				selfAssessment: 3,
				verifiedByMethod: "self",
				marketPercentage: pct,
			});
		}

		// Przebieg zbieżności (wzorzec AG.5) + zerowanie szumu zdarzeń.
		await runMarketRecompute({ runId: null, describe: async () => "" });
		await db.execute(sql`DELETE FROM market_new_gap_events`);

		// „Swap”: rynek ścieżki A zaczyna wymagać C (55%). Ścieżka B bez zmian.
		await db.insert(schema.jobMarketData).values({
			careerGoal: GOAL_A,
			competencyName: "Kompetencja C",
			demandPercentage: 55,
			category: "II",
		});
		await runMarketRecompute({ runId: null, describe: async () => "" });
	}, 120_000);

	afterAll(async () => {
		if (db) await cleanup();
		vi.unstubAllEnvs();
	});

	it("zdarzenie powstało wyłącznie u dotkniętego studenta (DoD)", async () => {
		const events = await db.query.marketNewGapEvents.findMany();
		expect(events).toHaveLength(1);
		expect(events[0].studentId).toBe(studentIds[USER_A]);
		expect(events[0].competencyName).toBe("Kompetencja C");
		expect(events[0].notifiedAt).toBeNull();
	});

	it("bez decyzji o zgodzie: decided=false, zdarzeń nie pokazujemy (RODO opt-in)", async () => {
		const state = await stateFor(USER_A);
		expect(state).toMatchObject({ enabled: true, decided: false, consent: false });
		expect(state.notifications).toHaveLength(0);
	});

	it("po zgodzie: dotknięty widzi 1 powiadomienie (odczyt jako app_student), nieobjęty 0", async () => {
		for (const userId of [USER_A, USER_B]) {
			asUser(userId);
			const res = await consentPOST(
				new Request("http://test.local/api/market-notifications/consent", {
					method: "POST",
					body: JSON.stringify({ consent: true }),
					headers: { "Content-Type": "application/json" },
				}),
			);
			expect(res.status).toBe(200);
		}

		const stateA = await stateFor(USER_A);
		expect(stateA.consent).toBe(true);
		expect(stateA.notifications).toHaveLength(1);
		expect(stateA.notifications[0]).toMatchObject({
			competencyName: "Kompetencja C",
			priority: "critical", // 55/60 ≥ 0.66
			marketPercentage: 55,
		});

		const stateB = await stateFor(USER_B);
		expect(stateB.consent).toBe(true);
		expect(stateB.notifications).toHaveLength(0);
	});

	it("mark-read: notified_at wypełnione, drugi odczyt pusty, drugi POST marked=0", async () => {
		asUser(USER_A);
		const res = await readPOST();
		expect(res.status).toBe(200);
		expect(((await res.json()) as { marked: number }).marked).toBe(1);

		const events = await db.query.marketNewGapEvents.findMany();
		expect(events[0].notifiedAt).not.toBeNull();
		expect((await stateFor(USER_A)).notifications).toHaveLength(0);

		const again = await readPOST();
		expect(((await again.json()) as { marked: number }).marked).toBe(0);
	});

	it("wycofanie zgody (RODO): consent=false → zero powiadomień nawet przy nowych zdarzeniach", async () => {
		// Nowe nieprzeczytane zdarzenie po wycofaniu — nie może się pokazać.
		await db.insert(schema.marketNewGapEvents).values({
			studentId: studentIds[USER_A],
			tenantId,
			competencyName: "Kompetencja E",
			priority: "important",
			marketPercentage: 30,
		});
		asUser(USER_A);
		const res = await consentPOST(
			new Request("http://test.local/api/market-notifications/consent", {
				method: "POST",
				body: JSON.stringify({ consent: false }),
				headers: { "Content-Type": "application/json" },
			}),
		);
		expect(res.status).toBe(200);

		const state = await stateFor(USER_A);
		expect(state).toMatchObject({ decided: true, consent: false });
		expect(state.notifications).toHaveLength(0);
	});

	it("flaga off: feature nie istnieje (enabled=false, zero odczytów zdarzeń)", async () => {
		vi.stubEnv("FLAG_MARKET_GAP_NOTIFICATIONS", "");
		const state = await stateFor(USER_A);
		expect(state).toMatchObject({ enabled: false, notifications: [] });
		vi.stubEnv("FLAG_MARKET_GAP_NOTIFICATIONS", "1");
	});
});
