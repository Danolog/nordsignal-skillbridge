// @vitest-environment node
//
// AG.5 — DoD NA REALNEJ BAZIE:
//  • recompute bez LLM dla niezmienionych (carry-over cache why_important),
//  • LLM (stub describe) DOKŁADNIE RAZ per unikalna nowa luka (memo),
//  • zdarzenie market_new_gap_events dla nowej luki; inni studenci bez zdarzeń,
//  • drugi przebieg = 0 wywołań describe i 0 nowych zdarzeń (idempotencja —
//    „drugi odczyt opisu z cache"),
//  • mapa kompetencji odświeżona (węzeł nowej luki obecny — niezmiennik #1).
//
// Izolacja: WŁASNA ścieżka kariery („Ścieżka Testowa AG5") z własnymi wierszami
// rynku i własnym studentem — katalogi pozostałych studentów są nietknięte,
// więc recompute-all regeneruje im luki IDENTYCZNIE (zero zdarzeń, zero szkód).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (tabele 0025).

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const GOAL = "Ścieżka Testowa AG5";
const USER_ID = "u-ag5-recompute-integ";
const TOKEN = "integ-token-ag5";

dBack("AG.5 · deterministyczny recompute luk (realna baza, describe-stub)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: funkcja ładowana dynamicznie.
	let runMarketRecompute: any;
	let studentId = "";
	let tenantId = "";

	const describeStub = vi.fn(
		async (name: string, _goal: string, pct: number) => `OPIS-STUB: ${name} (${pct}%)`,
	);

	async function cleanup() {
		// Zdarzenia czyścimy GLOBALNIE: pierwsza w historii bazy iteracja recompute
		// „zbiega" kuratorskie (niepełne) zestawy luk demo-studentów do pochodnych
		// z katalogu i generuje im zdarzenia — to poprawne zachowanie AG.5, ale
		// szum dla asercji tej suity (patrz przebieg zbieżności w beforeAll).
		await db.execute(sql`DELETE FROM market_new_gap_events`);
		await db.execute(
			sql`DELETE FROM gaps WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER_ID})`,
		);
		await db.execute(
			sql`DELETE FROM skill_maps WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER_ID})`,
		);
		await db.execute(
			sql`DELETE FROM passports WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER_ID})`,
		);
		await db.execute(
			sql`DELETE FROM competencies WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER_ID})`,
		);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER_ID}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER_ID}`);
		await db.execute(sql`DELETE FROM job_market_data WHERE career_goal = ${GOAL}`);
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_PROACTIVE_MARKET_REFRESH", "1");
		vi.stubEnv("MARKET_REFRESH_TOKEN", TOKEN);
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ runMarketRecompute } = await import("@/lib/market-refresh/recompute"));
		await cleanup();

		// Rynek testowej ścieżki: A (60%) + B (40%). Student MA A → luka = {B}.
		await db.insert(schema.jobMarketData).values([
			{ careerGoal: GOAL, competencyName: "Kompetencja A", demandPercentage: 60, category: "II" },
			{ careerGoal: GOAL, competencyName: "Kompetencja B", demandPercentage: 40, category: "II" },
		]);
		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER_ID}, 'AG5 Test', 'ag5@test.local', true, now(), now())`,
		);
		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;
		const [student] = await db
			.insert(schema.students)
			.values({
				userId: USER_ID,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: GOAL,
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentId = student.id;
		await db.insert(schema.competencies).values({
			studentId,
			tenantId,
			name: "Kompetencja A",
			status: "acquired",
			selfAssessment: 3,
			verifiedByMethod: "self",
			marketPercentage: 60,
		});
		// Stan wyjściowy jak po onboardingu: luka B z ZAPISANYM opisem (cache).
		await db.insert(schema.gaps).values({
			studentId,
			tenantId,
			competencyName: "Kompetencja B",
			priority: "important",
			marketPercentage: 40,
			estimatedHours: 5,
			whyImportant: "STARY OPIS B (cache sprzed odświeżenia)",
		});

		// PRZEBIEG ZBIEŻNOŚCI: demo-studenci z seeda mają kuratorskie (niepełne)
		// zestawy luk — pierwszy recompute w historii bazy słusznie dosypuje im
		// resztę katalogu jako „nowe". Wykonujemy go tu z opisem-pustkiem (""
		// = brak zapisu opisu), po czym zerujemy zdarzenia — właściwe testy
		// mierzą wyłącznie deltę wywołaną kontrolowaną zmianą rynku.
		await runMarketRecompute({ runId: null, describe: async () => "" });
		await db.execute(sql`DELETE FROM market_new_gap_events`);
	}, 120_000);

	afterAll(async () => {
		if (db) await cleanup();
		vi.unstubAllEnvs();
	});

	it("rynek zaczyna wymagać C: nowa luka + opis ze stuba DOKŁADNIE RAZ + zdarzenie; cache B PRZENIESIONY", async () => {
		// „Swap": rynek testowej ścieżki dostaje nową kompetencję C (55%).
		await db.insert(schema.jobMarketData).values({
			careerGoal: GOAL,
			competencyName: "Kompetencja C",
			demandPercentage: 55,
			category: "II",
		});

		const summary = await runMarketRecompute({ runId: null, describe: describeStub });

		// LLM-stub: dokładnie 1 wywołanie (jedna unikalna nowa luka) i to dla C.
		expect(describeStub).toHaveBeenCalledTimes(1);
		expect(describeStub).toHaveBeenCalledWith("Kompetencja C", GOAL, 55);
		expect(summary.llmCalls).toBe(1);
		expect(summary.newGapsTotal).toBe(1);
		expect(summary.studentsWithNewGaps).toBe(1);
		expect(summary.errors).toBe(0);

		// Luki po recompute: B (cache PRZENIESIONY — zero LLM dla niezmienionej) + C (opis ze stuba).
		const rows = await db.query.gaps.findMany({ where: eq(schema.gaps.studentId, studentId) });
		type GapRow = { competencyName: string; whyImportant: string | null; priority: string };
		const byName = new Map<string, GapRow>((rows as GapRow[]).map((g) => [g.competencyName, g]));
		expect([...byName.keys()].sort()).toEqual(["Kompetencja B", "Kompetencja C"]);
		expect(byName.get("Kompetencja B")?.whyImportant).toBe(
			"STARY OPIS B (cache sprzed odświeżenia)",
		);
		expect(byName.get("Kompetencja C")?.whyImportant).toBe("OPIS-STUB: Kompetencja C (55%)");
		// Priorytet względny: 55/60 = 0.92 ≥ 0.66 → krytyczna.
		expect(byName.get("Kompetencja C")?.priority).toBe("critical");

		// Zdarzenie dla AG.6: dokładnie jedno, dla naszego studenta, nienotyfikowane.
		const events = await db.query.marketNewGapEvents.findMany();
		expect(events).toHaveLength(1);
		expect(events[0].studentId).toBe(studentId);
		expect(events[0].competencyName).toBe("Kompetencja C");
		expect(events[0].notifiedAt).toBeNull();

		// Mapa odświeżona: węzeł C obecny (niezmiennik mapa==luki).
		const [map] = await db.query.skillMaps.findMany({
			where: eq(schema.skillMaps.studentId, studentId),
		});
		expect(JSON.stringify(map.nodes)).toContain("Kompetencja C");
	}, 60_000);

	it("drugi przebieg = 0 wywołań describe i 0 nowych zdarzeń (idempotencja / cache)", async () => {
		describeStub.mockClear();
		const summary = await runMarketRecompute({ runId: null, describe: describeStub });

		expect(describeStub).not.toHaveBeenCalled();
		expect(summary.newGapsTotal).toBe(0);
		expect(summary.llmCalls).toBe(0);

		const events = await db.query.marketNewGapEvents.findMany();
		expect(events).toHaveLength(1); // wciąż tylko to pierwsze

		// Opisy przetrwały drugi wipe+insert (carry-over, „drugi odczyt z cache").
		const rows = await db.query.gaps.findMany({ where: eq(schema.gaps.studentId, studentId) });
		const byName = new Map(
			rows.map((g: { competencyName: string; whyImportant: string | null }) => [
				g.competencyName,
				g.whyImportant,
			]),
		);
		expect(byName.get("Kompetencja C")).toBe("OPIS-STUB: Kompetencja C (55%)");
	}, 60_000);

	it("POST /api/market-refresh/recompute (właz naprawczy): guard + summary; bez nowych luk = 0 LLM", async () => {
		const { POST } = await import("../route");

		const noToken = await POST(
			new Request("http://test.local/api/market-refresh/recompute", { method: "POST" }),
		);
		expect(noToken.status).toBe(401);

		const res = await POST(
			new Request("http://test.local/api/market-refresh/recompute", {
				method: "POST",
				headers: { "x-market-refresh-token": TOKEN },
			}),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { summary: { newGapsTotal: number; llmCalls: number } };
		// Rynek niezmieniony od poprzedniego przebiegu → zero nowych luk, zero LLM
		// (endpoint używa realnego generateWhyImportant — brak wywołań = brak kosztu).
		expect(body.summary.newGapsTotal).toBe(0);
		expect(body.summary.llmCalls).toBe(0);
	}, 120_000);
});
