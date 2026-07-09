// @vitest-environment node
//
// A5/1.12 — DOWÓD E2E NA REALNEJ BAZIE (roadmapa: „student bez sylabusa:
// diagnoza → mapa kompetencji"): pełna pętla przez PRAWDZIWE trasy —
// /api/assessment/{start,answer,complete} → POST /api/onboarding z sessionId:
//  • poziomy zapisane ZMIERZONE (w tym 1!): wiersz missing/diagnostic zostaje
//    w competencies (prowieniencja), a luka powstaje z niezmiennika statusów
//    (§4a.1: luka ≡ wymagana ∧ missing — zaznaczenie nie chroni przed luką),
//  • uncovered → samoocena (method='self') — jawnie, bez udawania pomiaru,
//  • pokrycie: mianownik = katalog (wiersz missing nie podwaja pozycji),
//  • mapa kompetencji: węzeł missing TYLKO z luki (bez duplikatu z wiersza),
//  • §4a.2 carry-over: klasyczny re-POST (bez sesji) NIE degraduje pomiaru
//    do deklaracji — poziom zmierzony (także 1) wygrywa z samooceną klienta,
//  • recompute AG.5: luka z poziomu 1 przeżywa odświeżenie rynku (posiadane
//    = status ≠ missing — spójnie z onboardingiem),
//  • bez sesji wpis bez poziomu → 400; cudza/nieukończona sesja → 409.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (tabele 0030).

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

const USER = "u-a512-diagnoza";
const GOAL = "Ścieżka A512 Test";
const COMP_A = "A512 Alpha"; // pokryta bankiem — zmierzy się na poziom 3
const COMP_B = "A512 Beta"; // pokryta bankiem — OBLANA (poziom 1 → missing → luka)
const COMP_C = "A512 Gamma"; // bez pytań w banku (uncovered) → samoocena
const SLUG_PREFIX = "a512-test-";

function postJson(body: unknown): Request {
	return new Request("http://test.local/api", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function ctxFor(id: string) {
	return { params: Promise.resolve({ id }) };
}

dBack("A5/1.12 · diagnoza → onboarding → luki/mapa/pokrycie (realna baza)", () => {
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
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let onboardingPOST: any;

	let tenantId = "";
	let studentId = "";
	let completedSessionId = "";

	async function cleanup() {
		for (const table of ["assessment_answers", "assessment_sessions"]) {
			await db.execute(
				sql.raw(
					`DELETE FROM ${table} WHERE student_id IN (SELECT id FROM students WHERE user_id = '${USER}')`,
				),
			);
		}
		for (const table of ["gaps", "skill_maps", "passports", "competencies"]) {
			await db.execute(
				sql.raw(
					`DELETE FROM ${table} WHERE student_id IN (SELECT id FROM students WHERE user_id = '${USER}')`,
				),
			);
		}
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER}`);
		await db.execute(
			sql`DELETE FROM question_items WHERE concept_id IN (SELECT id FROM question_concepts WHERE slug LIKE ${`${SLUG_PREFIX}%`})`,
		);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${SLUG_PREFIX}%`}`);
		await db.execute(sql`DELETE FROM job_market_data WHERE career_goal = ${GOAL}`);
	}

	async function insertConceptWithItems(
		slug: string,
		competencyName: string,
		numericValue: number,
	) {
		const [concept] = await db
			.insert(schema.questionConcepts)
			.values({ slug, name: competencyName, trunk: "market", competencyName, diagnostic: true })
			.returning({ id: schema.questionConcepts.id });
		await db.insert(schema.questionItems).values([
			{
				conceptId: concept.id,
				difficulty: 1,
				type: "single_choice",
				stem: `[${slug}] Pytanie podstawowe (d1) — wskaż poprawną.`,
				optionsJson: ["Dobra", "Zła", "Gorsza"],
				answerJson: { correct: 0 },
			},
			{
				conceptId: concept.id,
				difficulty: 2,
				type: "numeric",
				stem: `[${slug}] Pytanie praktyczne (d2) — podaj wynik.`,
				answerJson: { value: numericValue, tolerance: 0 },
			},
			{
				conceptId: concept.id,
				difficulty: 3,
				type: "multi_choice",
				stem: `[${slug}] Pytanie zaawansowane (d3) — zaznacz wszystkie poprawne.`,
				optionsJson: ["P1", "F1", "P2", "F2"],
				answerJson: { correct: [0, 2] },
			},
		]);
	}

	async function competencyRows() {
		return db
			.execute(
				sql`SELECT name, status, self_assessment AS level, verified_by_method AS method
			    FROM competencies WHERE student_id = ${studentId} ORDER BY name`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_DIAGNOSTIC_ASSESSMENT", "1");
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ POST: startPOST } = await import("../../assessment/start/route"));
		({ POST: answerPOST } = await import("../../assessment/[id]/answer/route"));
		({ POST: completePOST } = await import("../../assessment/[id]/complete/route"));
		({ POST: onboardingPOST } = await import("../route"));
		await cleanup();

		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;

		// Katalog rynku ścieżki testowej: 3 pozycje (A pokryta bankiem, B pokryta,
		// C bez pytań → uncovered).
		await db.insert(schema.jobMarketData).values([
			{ careerGoal: GOAL, competencyName: COMP_A, demandPercentage: 60, category: "II" },
			{ careerGoal: GOAL, competencyName: COMP_B, demandPercentage: 40, category: "II" },
			{ careerGoal: GOAL, competencyName: COMP_C, demandPercentage: 20, category: "II" },
		]);

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, 'A512 Test', ${`${USER}@test.local`}, true, now(), now())`,
		);
		// Prowizoryczny student z Kroku 0 (careerGoal ustalony — start diagnozy go czyta).
		const [student] = await db
			.insert(schema.students)
			.values({
				userId: USER,
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

		await insertConceptWithItems(`${SLUG_PREFIX}alpha`, COMP_A, 7);
		await insertConceptWithItems(`${SLUG_PREFIX}beta`, COMP_B, 3);

		mockGetSession.mockResolvedValue({ user: { id: USER } });
	});

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (db) await cleanup();
	});

	it("pełna pętla: diagnoza (A=3, B=1) + samoocena uncovered (C) → wiersze/luki/pokrycie/mapa", async () => {
		// ── Test adaptacyjny przez prawdziwe trasy ──
		const started = await (
			await startPOST(postJson({ competencyNames: [COMP_A, COMP_B, COMP_C] }))
		).json();
		expect(started.uncovered).toEqual([COMP_C]);
		completedSessionId = started.sessionId;

		// A: d2✓ (7) → d3✗ (zły zbiór) → poziom 3.
		let res = await answerPOST(
			postJson({ questionItemId: started.question.itemId, answer: { value: "7" } }),
			ctxFor(completedSessionId),
		);
		let body = await res.json();
		res = await answerPOST(
			postJson({ questionItemId: body.question.itemId, answer: { selected: [1, 3] } }),
			ctxFor(completedSessionId),
		);
		body = await res.json();
		// B: d2✗ (999) → d1✗ (indeks 2) → poziom 1 (OBLANE).
		res = await answerPOST(
			postJson({ questionItemId: body.question.itemId, answer: { value: "999" } }),
			ctxFor(completedSessionId),
		);
		body = await res.json();
		res = await answerPOST(
			postJson({ questionItemId: body.question.itemId, answer: { selected: 2 } }),
			ctxFor(completedSessionId),
		);
		body = await res.json();
		expect(body.done).toBe(true);
		const completed = await (await completePOST(postJson({}), ctxFor(completedSessionId))).json();
		expect(completed.result.competencies).toEqual({ [COMP_A]: 3, [COMP_B]: 1 });

		// ── POST /api/onboarding: zmierzone BEZ poziomu + uncovered z samooceną ──
		const onboardingRes = await onboardingPOST(
			postJson({
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: GOAL,
				syllabusText: "",
				competencies: [
					{ name: COMP_A, marketPercentage: 60 },
					{ name: COMP_B, marketPercentage: 40 },
					{ name: COMP_C, level: 3, marketPercentage: 20 },
				],
				diagnosticSessionId: completedSessionId,
			}),
		);
		expect(onboardingRes.status).toBe(200);

		// Wiersze: poziomy ZMIERZONE (A=3 diagnostic, B=1 missing diagnostic) + C self.
		expect(await competencyRows()).toEqual([
			{ name: COMP_A, status: "acquired", level: 3, method: "diagnostic" },
			{ name: COMP_B, status: "missing", level: 1, method: "diagnostic" },
			{ name: COMP_C, status: "acquired", level: 3, method: "self" },
		]);

		// Luka: DOKŁADNIE B (zaznaczona, ale oblana) — zaznaczenie nie chroni przed luką.
		const gapRows = await db
			.execute(sql`SELECT competency_name AS name FROM gaps WHERE student_id = ${studentId}`)
			.then((r: { rows: { name: string }[] }) => r.rows.map((x) => x.name));
		expect(gapRows).toEqual([COMP_B]);

		// Pokrycie: 2 acquired / (2 posiadane + 1 luka) = 67% — wiersz missing nie podwaja.
		const [passport] = await db
			.execute(
				sql`SELECT market_coverage_percent AS pct FROM passports WHERE student_id = ${studentId}`,
			)
			.then((r: { rows: { pct: number }[] }) => r.rows);
		expect(passport.pct).toBe(67);

		// Mapa: dokładnie 1 węzeł missing (z luki B) — wiersz missing NIE duplikuje węzła.
		const [mapRow] = await db
			.execute(sql`SELECT nodes FROM skill_maps WHERE student_id = ${studentId}`)
			.then((r: { rows: { nodes: { data?: { status?: string }; id: string }[] }[] }) => r.rows);
		const missingNodes = mapRow.nodes.filter(
			(n: { data?: { status?: string } }) => n.data?.status === "missing",
		);
		expect(missingNodes).toHaveLength(1);
	});

	it("§4a.2 carry-over: klasyczny re-POST nie degraduje pomiaru do deklaracji", async () => {
		// Edytor profilu / ponowny przebieg BEZ testu: klient deklaruje A=2, B=2, C=2.
		const res = await onboardingPOST(
			postJson({
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: GOAL,
				syllabusText: "",
				competencies: [
					{ name: COMP_A, level: 2, marketPercentage: 60 },
					{ name: COMP_B, level: 2, marketPercentage: 40 },
					{ name: COMP_C, level: 2, marketPercentage: 20 },
				],
			}),
		);
		expect(res.status).toBe(200);
		// A i B zachowują POMIAR (3 i 1, diagnostic) mimo deklaracji 2;
		// C (self) przyjmuje nową samoocenę — deklaracją wolno ruszać deklarację.
		expect(await competencyRows()).toEqual([
			{ name: COMP_A, status: "acquired", level: 3, method: "diagnostic" },
			{ name: COMP_B, status: "missing", level: 1, method: "diagnostic" },
			{ name: COMP_C, status: "in_progress", level: 2, method: "self" },
		]);
		// Luka B przeżyła re-POST (statusowy niezmiennik).
		const gapRows = await db
			.execute(sql`SELECT competency_name AS name FROM gaps WHERE student_id = ${studentId}`)
			.then((r: { rows: { name: string }[] }) => r.rows.map((x) => x.name));
		expect(gapRows).toEqual([COMP_B]);
	});

	it("recompute AG.5: luka z poziomu 1 przeżywa odświeżenie rynku", async () => {
		const { runMarketRecompute } = await import("@/lib/market-refresh/recompute");
		const summary = await runMarketRecompute({
			describe: async () => "opis-stub (test 1.12)",
		});
		expect(summary.errors).toBe(0);
		const gapRows = await db
			.execute(sql`SELECT competency_name AS name FROM gaps WHERE student_id = ${studentId}`)
			.then((r: { rows: { name: string }[] }) => r.rows.map((x) => x.name));
		// B (missing) dalej luką; A i C (posiadane) nie stały się lukami.
		expect(gapRows).toEqual([COMP_B]);
	});

	it("kontrakt: wpis bez poziomu bez sesji → 400; cudza/zła sesja → 409", async () => {
		const noLevel = await onboardingPOST(
			postJson({
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: GOAL,
				syllabusText: "",
				competencies: [{ name: COMP_A, marketPercentage: 60 }],
			}),
		);
		expect(noLevel.status).toBe(400);

		// Sesja z INNYM careerGoal niż payload → 409 (pomiar dotyczył innego celu).
		const wrongGoal = await onboardingPOST(
			postJson({
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "Inny Cel A512",
				syllabusText: "",
				competencies: [{ name: COMP_A, marketPercentage: 60 }],
				diagnosticSessionId: completedSessionId,
			}),
		);
		expect(wrongGoal.status).toBe(409);
	});

	it("flaga off: sessionId ignorowany → wpis bez poziomu odrzucony (zachowanie sprzed 1.12)", async () => {
		vi.stubEnv("FLAG_DIAGNOSTIC_ASSESSMENT", "0");
		try {
			const res = await onboardingPOST(
				postJson({
					university: "Testowa",
					fieldOfStudy: "Informatyka",
					semester: 4,
					careerGoal: GOAL,
					syllabusText: "",
					competencies: [{ name: COMP_A, marketPercentage: 60 }],
					diagnosticSessionId: completedSessionId,
				}),
			);
			expect(res.status).toBe(400);
		} finally {
			vi.stubEnv("FLAG_DIAGNOSTIC_ASSESSMENT", "1");
		}
	});
});
