// @vitest-environment node
//
// 1E.7 · L0 (Quinn/QA) — BRAMKA FAKTU: czy ZDANY egzamin modułowy zostawia
// TRWAŁY ŚLAD W DRABINIE CURRICULUM? Test biegnie na ŻYWEJ bazie (:5433) przez
// REALNE trasy /api/exam/* — zero atrap poza sesją Better Auth (logowanie nie
// jest przedmiotem pytania).
//
// Pytanie L0 (dowód, nie deklaracja): po `complete` z `passed=true`
//   (a) czy w `curriculum_module_progress` powstaje/zmienia się wiersz,
//   (b) jaki ma `status` i `verified_by_method`,
//   (c) co po zdanym egzaminie zwraca `getModuleExamGate` (bramka Ekranu 1),
//   (d) czy moduł zależny (prereq) się odblokowuje (`isModuleUnlocked`, `getLadder`).
//
// Dlaczego to nie było złapane: `exam-flow.integration.test.ts` kończy asercje
// na `assessment_sessions` (werdykt), a `exam-gate.integration.test.ts` WSTAWIA
// `verified_by_method='exam'` fixture'em (`seedVerifiedProgress`) — zakłada ślad,
// którego nikt nie produkuje. Styk „silnik egzaminu → drabina" nie miał testu.
//
// Kontrola pozytywna [L0-4]: te same asercje na stanie, jaki POWINIEN powstać
// (status='completed' + verified_by_method='exam'), przechodzą na zielono —
// dowód, że czerwone/negatywne wyniki wyżej mówią o BRAKUJĄCYM ZAPISIE, a nie
// o zepsutym harnessie.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`. Bez lokalnej bazy — skip.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

// Sesja Better Auth mockowana — pytanie L0 dotyczy warstwy DB/tras, nie logowania.
const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const USER = "u-l0-trace";
const PREFIX = "ql0-";
const Q_COUNT = 15;
const MAX_ERRORS = 1;

function startReq(moduleId: string): Request {
	return new Request("http://test.local/api/exam/start", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ moduleId }),
	});
}

function answerReq(slotRef: string, selected: number): Request {
	return new Request("http://test.local/api/exam/x/answer", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ slotRef, answer: { selected } }),
	});
}

function completeReq(): Request {
	return new Request("http://test.local/api/exam/x/complete", { method: "POST" });
}

function ctxFor(id: string) {
	return { params: Promise.resolve({ id }) };
}

dBack("L0 · zdany egzamin modułowy a ślad w drabinie (żywa baza, realne trasy)", () => {
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
	// biome-ignore lint/suspicious/noExplicitAny: produkcyjna kaskada 1E.1e.
	let completeItem: any;
	// biome-ignore lint/suspicious/noExplicitAny: assembler bramki (P5).
	let getModuleExamGate: any;
	// biome-ignore lint/suspicious/noExplicitAny: drabina (1E.1d).
	let getModuleItems: any;
	// biome-ignore lint/suspicious/noExplicitAny: drabina (1E.1d).
	let isModuleUnlocked: any;
	// biome-ignore lint/suspicious/noExplicitAny: drabina (1E.1d).
	let getLadder: any;

	let tenantId = "";
	let studentId = "";
	let moduleId = ""; // moduł z egzaminem (przedmiot testu)
	let nextModuleId = ""; // moduł zależny (prereq = moduleId) — dowód odblokowania
	const learningItemIds: string[] = []; // pozycje uczące (exercise)
	let examItemId = ""; // pozycja kind='exam'
	const pathKey = `${PREFIX}path`;

	async function cleanup() {
		await db.execute(
			sql`DELETE FROM assessment_answers WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM assessment_sessions WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM curriculum_item_answers WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM curriculum_item_progress WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM curriculum_module_progress WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		// Zasiew powtórek FSRS (hak 1E.4 przy zdanym egzaminie) — sprzątamy, bo test
		// biegnie z FLAG_SPACED_REPETITION=1 (parytet z prodem).
		await db.execute(
			sql`DELETE FROM review_states WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER}`);
		await db.execute(sql`DELETE FROM curriculum_path_modules WHERE path_key = ${pathKey}`);
		await db.execute(
			sql`DELETE FROM curriculum_module_prereqs WHERE module_id IN (SELECT id FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`})`,
		);
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`}`);
	}

	/** Czyści WYŁĄCZNIE stan zmienny studenta (postęp + sesje) — stały świat zostaje. */
	async function resetState() {
		await db.execute(sql`DELETE FROM assessment_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_item_progress WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM review_states WHERE student_id = ${studentId}`);
	}

	/**
	 * Pełny cykl egzaminu przez REALNE trasy: start → 15× poprawna odpowiedź →
	 * complete. Zwraca ciało `complete`. Wszystkie warianty mają correct=0
	 * (wzorzec exam-flow), więc `selected:0` jest poprawne deterministycznie.
	 */
	async function passExam(): Promise<{
		completed: boolean;
		result: { passed: boolean; errorCount: number };
	}> {
		const startRes = await startPOST(startReq(moduleId));
		expect(startRes.status).toBe(201);
		const started = await startRes.json();
		const sessionId = started.sessionId as string;

		let q: { slotRef: string } | null = started.question;
		while (q) {
			const res: Response = await answerPOST(answerReq(q.slotRef, 0), ctxFor(sessionId));
			expect(res.status).toBe(200);
			const body = await res.json();
			q = body.question;
		}
		const completeRes = await completePOST(completeReq(), ctxFor(sessionId));
		expect(completeRes.status).toBe(200);
		return await completeRes.json();
	}

	/** Wiersze drabiny modułu dla studenta (surowy SQL — czytamy TO, co jest w bazie). */
	async function moduleProgressRows(): Promise<
		{ status: string; verified_by_method: string | null }[]
	> {
		return await db
			.execute(
				sql`SELECT status, verified_by_method FROM curriculum_module_progress
				    WHERE student_id = ${studentId} AND module_id = ${moduleId}`,
			)
			.then((r: { rows: { status: string; verified_by_method: string | null }[] }) => r.rows);
	}

	/**
	 * Bramka policzona DOKŁADNIE tak, jak robi to strona modułu
	 * (`src/app/(dashboard)/curriculum/[moduleId]/page.tsx`): completedItems i
	 * itemCount z `getModuleItems`, reszta z assemblera. Zero ręcznych liczb.
	 */
	async function gateAsPageComputesIt() {
		const items = await getModuleItems(studentId, moduleId);
		const completedItems = items.filter(
			(i: { status: string }) => i.status === "completed" || i.status === "skipped_by_placement",
		).length;
		const view = await getModuleExamGate({
			studentId,
			moduleId,
			completedItems,
			itemCount: items.length,
		});
		return { view, completedItems, itemCount: items.length };
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_MASTERY_GATE", "1");
		vi.stubEnv("FLAG_CURRICULUM_PATH", "1");
		// Parytet z prodem (1E.4 zapalone): hak zasiewu powtórek po zdanym egzaminie
		// realnie odpala. Pisze WYŁĄCZNIE do review_states — sprzątamy w cleanup.
		vi.stubEnv("FLAG_SPACED_REPETITION", "1");

		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ POST: startPOST } = await import("../start/route"));
		({ POST: answerPOST } = await import("../[id]/answer/route"));
		({ POST: completePOST } = await import("../[id]/complete/route"));
		({ completeItem } = await import("@/lib/curriculum/completion"));
		({ getModuleExamGate } = await import("@/lib/curriculum/exam-gate"));
		({ getModuleItems, isModuleUnlocked, getLadder } = await import("@/lib/curriculum/ladder"));
		await cleanup();

		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, ${"L0 Trace"}, ${`${USER}@test.local`}, true, now(), now())`,
		);
		const [student] = await db
			.insert(schema.students)
			.values({
				userId: USER,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "L0 Trace",
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentId = student.id;

		// Moduł z egzaminem — kształt jak po `tools/ingest-exam-bank.ts`: pozycje
		// uczące (exercise) + JEDNA pozycja kind='exam' z config_json.examSlots.
		const [module] = await db
			.insert(schema.curriculumModules)
			.values({
				slug: `${PREFIX}mod`,
				title: "Moduł L0 z egzaminem",
				examConfigJson: { questionCount: Q_COUNT, maxErrors: MAX_ERRORS },
			})
			.returning({ id: schema.curriculumModules.id });
		moduleId = module.id;

		const [nextModule] = await db
			.insert(schema.curriculumModules)
			.values({ slug: `${PREFIX}next`, title: "Moduł następny (prereq)", examConfigJson: null })
			.returning({ id: schema.curriculumModules.id });
		nextModuleId = nextModule.id;
		await db
			.insert(schema.curriculumModulePrereqs)
			.values({ moduleId: nextModuleId, requiresModuleId: moduleId });

		// Ścieżka (drabina) z obydwoma modułami — dowód (d) na getLadder.
		await db.insert(schema.curriculumPathModules).values([
			{ pathKey, moduleId, position: 1 },
			{ pathKey, moduleId: nextModuleId, position: 2 },
		]);

		// Dwie pozycje uczące (exercise), żeby dało się osiągnąć „wszystkie pozycje
		// uczące zrobione" produkcyjną kaskadą completeItem.
		for (const n of [1, 2]) {
			const [atom] = await db
				.insert(schema.curriculumModuleItems)
				.values({
					moduleId,
					slug: `${PREFIX}atom-${n}`,
					position: n,
					kind: "exercise",
					title: `Atom ${n}`,
				})
				.returning({ id: schema.curriculumModuleItems.id });
			learningItemIds.push(atom.id);
		}
		// Moduł następny musi mieć pozycję, inaczej drabina daje mu 'coming_soon'.
		await db.insert(schema.curriculumModuleItems).values({
			moduleId: nextModuleId,
			slug: `${PREFIX}next-atom`,
			position: 1,
			kind: "exercise",
			title: "Atom modułu następnego",
		});

		// Bank egzaminu: 15 slotów × 2 warianty (A/B), KAŻDY z correct=0.
		const examSlots: {
			slotRef: string;
			conceptSlug: string;
			variants: { ref: string; variant: string; itemId: string }[];
		}[] = [];
		for (let i = 1; i <= Q_COUNT; i++) {
			const conceptSlug = `${PREFIX}c${i}`;
			const [concept] = await db
				.insert(schema.questionConcepts)
				.values({ slug: conceptSlug, name: `Koncept L0 ${i}`, trunk: "foundations" })
				.returning({ id: schema.questionConcepts.id });
			const variants: { ref: string; variant: string; itemId: string }[] = [];
			for (const label of ["A", "B"]) {
				const [item] = await db
					.insert(schema.questionItems)
					.values({
						conceptId: concept.id,
						difficulty: 1,
						type: "single_choice",
						stem: `[l0/e${i}/${label}] Pytanie ${i}`,
						optionsJson: ["Odpowiedź 0", "Odpowiedź 1", "Odpowiedź 2"],
						answerJson: { correct: 0 },
					})
					.returning({ id: schema.questionItems.id });
				variants.push({ ref: `l0-e${i}-${label.toLowerCase()}`, variant: label, itemId: item.id });
			}
			examSlots.push({ slotRef: `e${i}`, conceptSlug, variants });
		}
		const [examItem] = await db
			.insert(schema.curriculumModuleItems)
			.values({
				moduleId,
				slug: `${PREFIX}exam`,
				position: 90,
				kind: "exam",
				title: "Egzamin modułu",
				configJson: { examSlots },
			})
			.returning({ id: schema.curriculumModuleItems.id });
		examItemId = examItem.id;

		mockGetSession.mockResolvedValue({ user: { id: USER } });
	}, 120_000);

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (db) await cleanup();
	});

	beforeEach(async () => {
		mockGetSession.mockResolvedValue({ user: { id: USER } });
		await resetState();
	});

	// ── (a)+(b) ŚLAD W TABELI ────────────────────────────────────────────────
	it("[L0-1] zdany egzamin (passed=true) → stan curriculum_module_progress dla tego modułu", async () => {
		const before = await moduleProgressRows();
		expect(before).toEqual([]); // punkt wyjścia: brak wiersza

		const completed = await passExam();
		expect(completed.result.passed).toBe(true);
		expect(completed.result.errorCount).toBe(0);

		// Werdykt egzaminu JEST zapisany (kontrola, że przepływ naprawdę przeszedł).
		const [sessionRow] = await db
			.execute(
				sql`SELECT status, result_json ->> 'passed' AS passed FROM assessment_sessions
				    WHERE student_id = ${studentId} AND module_id = ${moduleId}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(sessionRow).toEqual({ status: "completed", passed: "true" });

		// KONTRAKT L0: zdany egzamin = moduł zaliczony (wiersz JEST).
		// L5: ten przypadek nie robi ANI JEDNEJ pozycji przed egzaminem, więc drogą
		// jest test-out i dowód brzmi 'test_out' — wartość zmieniona razem z kodem
		// (przed L5 stało tu 'exam' jako świadomy dług okna L0→L5). Druga strona
		// rozróżnienia (pozycje zrobione ⇒ 'exam') ma własny przypadek: [L0-2].
		const after = await moduleProgressRows();
		expect(after).toEqual([{ status: "completed", verified_by_method: "test_out" }]);
	});

	it("[L0-2] wszystkie pozycje uczące zrobione + zdany egzamin → wiersz drabiny dostaje verified_by_method='exam' (ścieżka aktualizacji upsertu)", async () => {
		// KROK 1 (FAKT, nie kontrakt): produkcyjna kaskada 1E.1e po WSZYSTKICH
		// pozycjach uczących. Kaskada liczy KOMPLET pozycji modułu — a pozycji
		// kind='exam' nie da się ukończyć żadną trasą (`/answer` → 400 „Item does
		// not accept answers", `/complete` → 400 „Item kind not completable here").
		// Wniosek: w module Z EGZAMINEM kaskada NIGDY nie domknie modułu.
		let lastCascade = { moduleCompleted: true };
		for (const itemId of learningItemIds) {
			lastCascade = await completeItem(studentId, tenantId, itemId, moduleId);
		}
		expect(lastCascade.moduleCompleted).toBe(false);
		expect(await moduleProgressRows()).toEqual([]);
		// FAKT drugiego rzędu: pozycja egzaminu wlicza się do `itemCount` strony
		// modułu, a nie da się jej ukończyć → completedItems < itemCount → karta
		// bramki nie renderuje się wcale (`none`), mimo kompletu pozycji uczących.
		const gateWithRealWiring = await gateAsPageComputesIt();
		expect({
			kind: gateWithRealWiring.view.kind,
			completedItems: gateWithRealWiring.completedItems,
			itemCount: gateWithRealWiring.itemCount,
		}).toEqual({ kind: "none", completedItems: 2, itemCount: 3 });

		// KROK 2: konstruujemy SZTUCZNIE stan „wszystkie pozycje zrobione" (kaskada
		// na pozycji egzaminu — droga niedostępna produkcyjnie), żeby sprawdzić
		// zachowanie także dla wiersza, który JUŻ istnieje z verified_by_method=NULL.
		await completeItem(studentId, tenantId, examItemId, moduleId);
		const afterCascade = await moduleProgressRows();
		expect(afterCascade).toEqual([{ status: "completed", verified_by_method: null }]);

		const completed = await passExam();
		expect(completed.result.passed).toBe(true);

		// KONTRAKT L0: po zdanym egzaminie metoda zaliczenia to 'exam', nie NULL.
		const after = await moduleProgressRows();
		expect(after).toEqual([{ status: "completed", verified_by_method: "exam" }]);
	});

	// ── (c) BRAMKA EKRANU 1 ──────────────────────────────────────────────────
	it("[L0-3] bramka po zdanym egzaminie (wejście liczone jak na stronie modułu) → verified", async () => {
		for (const itemId of [...learningItemIds, examItemId]) {
			await completeItem(studentId, tenantId, itemId, moduleId);
		}
		const gateBefore = await gateAsPageComputesIt();
		expect(gateBefore.view.kind).toBe("gate"); // przed egzaminem: „Podejdź do egzaminu"

		const completed = await passExam();
		expect(completed.result.passed).toBe(true);

		const gateAfter = await gateAsPageComputesIt();
		// KONTRAKT L0: po ZDANYM egzaminie bramka gaśnie (E4 verified), nie zaprasza
		// w nieskończoność do egzaminu, który student już zdał.
		expect(gateAfter.view.kind).toBe("verified");
	});

	// ── (d) DRABINA: ODBLOKOWANIE NASTĘPNEGO MODUŁU ──────────────────────────
	// 1E.7 · L5 — ASERCJA ODWRÓCONA (dług z okna L0→L5 spłacony). Ta ścieżka to
	// zdany egzamin przy ZERO zaliczonych pozycji, czyli test-out; decyzja produktowa
	// 1E.7 przypisuje jej verified_by_method='test_out'. Skutki dla drabiny są
	// identyczne jak przy 'exam' (moduł zaliczony, następny otwarty) — różni się
	// wyłącznie DOWÓD. Kontrola pozytywna dla drugiej strony rozróżnienia (pozycje
	// zaliczone ⇒ 'exam') stoi w [L0-2].
	it("[L0-4] zdany egzamin bez pozycji (test-out) → drabina i moduł następny", async () => {
		const completed = await passExam();
		expect(completed.result.passed).toBe(true);

		const rows = await moduleProgressRows();
		const ladder = await getLadder(studentId, pathKey);
		const examModule = ladder.find((m: { id: string }) => m.id === moduleId);
		const nextUnlocked = await isModuleUnlocked(studentId, nextModuleId);

		// KONTRAKT L0+L5: zdany egzamin zalicza moduł ⇒ następny moduł otwarty,
		// a dowód nazywa DROGĘ — tu 'test_out' (zero zaliczonych pozycji).
		// JEDNA asercja na całym stanie — komunikat błędu ma pokazać KOMPLET
		// zmierzonych wartości (gdzie dokładnie ślad znika), nie urwać się na
		// pierwszej rozbieżności.
		expect({
			progressRows: rows,
			ladderStatus: examModule.status,
			ladderVerifiedByMethod: examModule.verifiedByMethod,
			nextModuleUnlocked: nextUnlocked,
		}).toEqual({
			progressRows: [{ status: "completed", verified_by_method: "test_out" }],
			ladderStatus: "completed",
			ladderVerifiedByMethod: "test_out",
			nextModuleUnlocked: true,
		});
	});

	// ── KONTROLA POZYTYWNA (anty-vacuous) ────────────────────────────────────
	it("[L0-5] kontrola: gdy ślad 'exam' JEST w bazie, bramka i drabina reagują poprawnie", async () => {
		// Ten sam zestaw asercji, co wyżej, ale na stanie, jaki BRAKUJĄCY zapis
		// miałby wyprodukować. Zielony wynik dowodzi, że czerwień wyżej pochodzi
		// z braku zapisu, a nie z pomyłki w harnessie/asercjach.
		await db.insert(schema.curriculumModuleProgress).values({
			studentId,
			tenantId,
			moduleId,
			status: "completed",
			verifiedByMethod: "exam",
			completedAt: new Date(),
		});

		expect(await moduleProgressRows()).toEqual([
			{ status: "completed", verified_by_method: "exam" },
		]);
		const { view } = await gateAsPageComputesIt();
		expect(view.kind).toBe("verified");
		expect(await isModuleUnlocked(studentId, nextModuleId)).toBe(true);
		const ladder = await getLadder(studentId, pathKey);
		expect(ladder.find((m: { id: string }) => m.id === moduleId).status).toBe("completed");
	});
});
