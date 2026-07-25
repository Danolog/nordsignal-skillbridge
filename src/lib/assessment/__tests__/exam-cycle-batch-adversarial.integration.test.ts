// @vitest-environment node
//
// 1E.3 (ADR-014 D3) — BRAMKA QUINN/QA: adwersaryjne testy RÓWNOWAŻNOŚCI batcha C1
// dla evaluateExamCycle na ŻYWEJ bazie (:5433). Max zbatchował 1+2N zapytań → 3
// (loadCompletableCorrectiveItemIdsByConcept + loadCorrectiveAnswerTimes + czysta
// computeCorrectivesDoneAt). Unit exam-correctives-done-at.test.ts lockuje rdzeń
// czystej funkcji; TU atakujemy krawędzie, których czysty unit NIE osiąga:
// WIELE oblanych cap-2 sesji z RÓŻNYM failedAt, atom WSPÓŁDZIELONY przez sesje,
// prune `answered_at > min(failedAt)`, granica strict `>`, koncept bez atomu.
//
// Metoda: wołamy REALNĄ evaluateExamCycle (bez atrap bazy) na spreparowanym stanie
// historii sesji + odpowiedzi correctives, i porównujemy werdykt cyklu z RĘCZNIE
// policzonym oczekiwaniem = ZACHOWANIE SPRZED batcha (per-sesja: min(answered_at)
// WHERE answered_at > failedAt TEJ sesji, wszystkie wymagane obecne, boundary=max;
// granica cyklu = max domkniętych; failedInCycle = oblane sesje z completed_at PO
// granicy). Rozjazd którejkolwiek liczby = batch przecieka → BLOCK.
//
// Sesje wstawiamy wprost (reprezentują PRZESZŁE werdykty, które trasa complete już
// zapisała) — to jedyny sposób na zbudowanie ≥2 cykli z kontrolowanym failedAt,
// nieosiągalny czystym przejściem trasy w jednym teście. Baza, funkcja, SQL i prune
// są PRAWDZIWE.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`. Bez niej — pomija się.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-qadv-cycle";
const PREFIX = "qadv-";

// Baza czasu — offsety w minutach dla czytelnych scenariuszy.
const T0 = Date.UTC(2026, 6, 1, 0, 0, 0);
const at = (min: number) => new Date(T0 + min * 60_000);

dBack("Quinn/QA · równoważność batcha evaluateExamCycle (adwersaryjne, żywa :5433)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: serwis ładowany dynamicznie po env.
	let evaluateExamCycle: any;

	let tenantId = "";
	let studentId = "";
	let moduleId = "";

	// slug konceptu → { atomId?: id ukończalnego atomu (exercise), retrievalQId }.
	const atomIdByConcept = new Map<string, string>();
	const retrievalQByConcept = new Map<string, string>();

	async function cleanup() {
		await db.execute(
			sql`DELETE FROM curriculum_item_answers WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM assessment_sessions WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER}`);
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`}`);
	}

	/** Wyczyść sesje i odpowiedzi correctives między scenariuszami (concepty/atomy zostają). */
	async function resetState() {
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id = ${studentId}`);
	}

	/**
	 * Koncept testowy. withAtom=true → dołoż UKOŃCZALNY atom (exercise) linkowany
	 * curriculum_item_concepts + pytanie retrieval (do questionItemId odpowiedzi).
	 * withAtom=false → koncept BEZ ukończalnego atomu (Vector 4: nie może blokować).
	 */
	async function seedConcept(slug: string, withAtom: boolean, posBase: number) {
		const [concept] = await db
			.insert(schema.questionConcepts)
			.values({ slug, name: `Koncept ${slug}`, trunk: "foundations" })
			.returning({ id: schema.questionConcepts.id });
		if (!withAtom) return;
		const [atom] = await db
			.insert(schema.curriculumModuleItems)
			.values({
				moduleId,
				slug: `${slug}-atom`,
				position: posBase,
				kind: "exercise",
				title: `Atom ${slug}`,
			})
			.returning({ id: schema.curriculumModuleItems.id });
		await db
			.insert(schema.curriculumItemConcepts)
			.values({ itemId: atom.id, conceptId: concept.id });
		const [rq] = await db
			.insert(schema.questionItems)
			.values({
				conceptId: concept.id,
				difficulty: 1,
				type: "single_choice",
				stem: `retrieval ${slug}`,
				optionsJson: ["a", "b"],
				answerJson: { correct: 0 },
			})
			.returning({ id: schema.questionItems.id });
		atomIdByConcept.set(slug, atom.id);
		retrievalQByConcept.set(slug, rq.id);
	}

	/** Wstaw OBLANĄ, ukończoną sesję egzaminu modułu (przeszły werdykt). */
	async function insertFailedSession(opts: {
		completedAt: Date;
		correctives: boolean;
		failedConcepts: string[];
		hash: string;
		withPackage?: boolean;
	}) {
		const resultJson: Record<string, unknown> = {
			passed: false,
			errorCount: 2,
			maxErrors: 1,
			failedConcepts: opts.failedConcepts,
			correctives: opts.correctives,
		};
		if (opts.withPackage) {
			resultJson.correctivesPackage = {
				concepts: opts.failedConcepts.map((c) => ({ conceptSlug: c, conceptName: c, atoms: [] })),
				distanceToPass: 1,
			};
		}
		await db.insert(schema.assessmentSessions).values({
			studentId,
			tenantId,
			kind: "module_exam",
			moduleId,
			inputHash: opts.hash,
			status: "completed",
			planJson: {},
			resultJson,
			completedAt: opts.completedAt,
		});
	}

	/** Poprawne re-ukończenie atomu konceptu w danym czasie (retrieval PO oblaniu). */
	async function answerAtom(conceptSlug: string, answeredAt: Date) {
		await db.insert(schema.curriculumItemAnswers).values({
			studentId,
			tenantId,
			itemId: atomIdByConcept.get(conceptSlug),
			questionItemId: retrievalQByConcept.get(conceptSlug),
			isCorrect: true,
			hintDepth: 0,
			hintDepthSource: "server",
			answeredAt,
		});
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_MASTERY_GATE", "1");
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ evaluateExamCycle } = await import("../exam-service"));
		await cleanup();

		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, ${"Quinn Adv"}, ${`${USER}@test.local`}, true, now(), now())`,
		);
		const [s] = await db
			.insert(schema.students)
			.values({
				userId: USER,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "adv",
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentId = s.id;

		const [module] = await db
			.insert(schema.curriculumModules)
			.values({ slug: `${PREFIX}mod`, title: "Adv batch" })
			.returning({ id: schema.curriculumModules.id });
		moduleId = module.id;

		// cA/cB: koncepty z ukończalnym atomem. cEmpty: BEZ atomu (Vector 4).
		await seedConcept(`${PREFIX}cA`, true, 101);
		await seedConcept(`${PREFIX}cB`, true, 102);
		await seedConcept(`${PREFIX}cEmpty`, false, 0);
	}, 60_000);

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (db) await cleanup();
	});

	beforeEach(async () => {
		await resetState();
	});

	const cA = `${PREFIX}cA`;
	const cB = `${PREFIX}cB`;
	const cEmpty = `${PREFIX}cEmpty`;

	// ── S1: ATOM WSPÓŁDZIELONY przez DWA cykle, prune > min(failedAt), 2 odpowiedzi ──
	// Wektor 1+2+5. Dwie oblane cap-2 sesje wymagają TEGO SAMEGO atomu X (cA) przy
	// RÓŻNYM failedAt; X odrobiony raz między cyklami, raz po drugim cyklu. Batch
	// fetchuje answered_at > min(failedAt)=10, ale próg `> failedAt` należy do KAŻDEJ
	// sesji z osobna. Domknięcie cyklu 2 MUSI wziąć odpowiedź po min(40), nie po min(10).
	it("S1 — atom współdzielony, 2 cykle, prune>min: oba cykle correctives ODBYTE → attempt 1", async () => {
		// cykl 1: fail(0), cap-2 fail(10, correctives) [wymaga X]; cykl 2: fail(30), cap-2 fail(40) [X]
		await insertFailedSession({
			completedAt: at(0),
			correctives: false,
			failedConcepts: [cA],
			hash: "s1-1a",
		});
		await insertFailedSession({
			completedAt: at(10),
			correctives: true,
			failedConcepts: [cA],
			hash: "s1-1b",
		});
		await insertFailedSession({
			completedAt: at(30),
			correctives: false,
			failedConcepts: [cA],
			hash: "s1-2a",
		});
		await insertFailedSession({
			completedAt: at(40),
			correctives: true,
			failedConcepts: [cA],
			hash: "s1-2b",
		});
		// X odrobiony: 20 (dla cyklu 1, >10) i 50 (dla cyklu 2, >40).
		await answerAtom(cA, at(20));
		await answerAtom(cA, at(50));

		// RĘCZNIE (sprzed batcha): s1b failedAt=10 → min(>10)={20} → doneAt=20.
		//                          s2b failedAt=40 → min(>40)={50} → doneAt=50.
		// granica = max(20,50)=50. failedInCycle = oblane completedAt>50 = 0.
		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(0);
		expect(state.correctivesRequired).toBe(false);
		expect(state.attempt).toBe(1);
		// PUŁAPKA min-prune: gdyby loadCorrectiveAnswerTimes zwracało tylko min({20,50})={20},
		// s2b (failedAt=40) NIE znalazłoby 50 → null → granica=20 → failedInCycle=2 (s2a,s2b)
		// → correctivesRequired=true. Ten expect wyżej to wykrywa.
	});

	// ── S2: DYSTYNKTNE atomy, różny failedAt — jeden ODBYTY, drugi OTWARTY ──────────
	// Wektor 1. sA (failedAt=0, wymaga X/cA) odrobiony; sB (failedAt=20, wymaga Y/cB)
	// NIE odrobiony. Batch NIE może przeciec odpowiedzi X do sesji B (rozłączne atomy).
	it("S2 — dwie cap-2 różny failedAt, rozłączne atomy: A odbyte, B otwarte → failedInCycle 1", async () => {
		await insertFailedSession({
			completedAt: at(0),
			correctives: true,
			failedConcepts: [cA],
			hash: "s2-a",
			withPackage: true,
		});
		await insertFailedSession({
			completedAt: at(20),
			correctives: true,
			failedConcepts: [cB],
			hash: "s2-b",
			withPackage: true,
		});
		await answerAtom(cA, at(10)); // X >0 → A odbyte; Y nigdy → B otwarte.

		// RĘCZNIE: sA doneAt=10; sB null. granica=10. oblane>10 = {sB(20)} → 1.
		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(1);
		expect(state.correctivesRequired).toBe(false);
		expect(state.attempt).toBe(2);
	});

	// ── S3: granica strict `>` PER-SESJA obserwowalna PONAD SQL-owym prune ──────────
	// Wektor 3. Krytyczne: pojedyncza sesja z odpowiedzią == failedAt jest już odcinana
	// przez SQL prune `gt(answered_at, minFailedAt)` — mutacja in-memory `>`→`>=` byłaby
	// NIEWIDOCZNA. Żeby granica per-sesja NAPRAWDĘ się liczyła, potrzebna PÓŹNIEJSZA
	// sesja (failedAt > minFailedAt) z odpowiedzią DOKŁADNIE w jej failedAt: SQL prune
	// (>min) ją PRZEPUSZCZA, a odrzuca ją wyłącznie strict `>` per-sesja w pamięci.
	//
	// Dwa cykle, oba wymagają X (cA). Cykl 1 (cap-2 failedAt=5) domknięty odpowiedzią o 10.
	// Cykl 2 (cap-2 failedAt=20) ma odpowiedź DOKŁADNIE o 20 (== jego failedAt).
	// minFailedAt=5 → prune przepuszcza {10,20}. Strict `>` cyklu 2: 20 !> 20 → NIEODBYTE.
	it("S3 — strict `>` per-sesja ponad prune: odpowiedź == późniejszego failedAt NIE domyka", async () => {
		// cykl 1
		await insertFailedSession({
			completedAt: at(0),
			correctives: false,
			failedConcepts: [cA],
			hash: "s3-1a",
		});
		await insertFailedSession({
			completedAt: at(5),
			correctives: true,
			failedConcepts: [cA],
			hash: "s3-1b",
		});
		// cykl 2
		await insertFailedSession({
			completedAt: at(15),
			correctives: false,
			failedConcepts: [cA],
			hash: "s3-2a",
		});
		await insertFailedSession({
			completedAt: at(20),
			correctives: true,
			failedConcepts: [cA],
			hash: "s3-2b",
			withPackage: true,
		});
		await answerAtom(cA, at(10)); // domyka cykl 1 (>5)
		await answerAtom(cA, at(20)); // == failedAt cyklu 2 → strict > odrzuca

		// RĘCZNIE (strict >): f1b(5)→min(>5) w {10,20}=10 → done 10. f2b(20)→(>20) w {10,20}=∅
		// → null → NIEODBYTE. granica=10. oblane completedAt>10 = {s3-2a(15), s3-2b(20)} = 2.
		// Mutacja `>=`: f2b bierze 20 → granica=20 → oblane>20=0 → attempt 1 (rozjazd).
		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(2);
		expect(state.correctivesRequired).toBe(true);
		expect(state.attempt).toBe(2);
		expect(state.correctivesPackage).toBeDefined();
	});

	// ── S4: koncept BEZ ukończalnego atomu nie blokuje (D4) ─────────────────────────
	// Wektor 4. cap-2 fail na WYŁĄCZNIE cEmpty (brak atomu) → requiredItemIds puste →
	// doneAt=failedAt (auto-odbyte, nie może blokować) mimo ZERA odpowiedzi.
	it("S4a — cap-2 tylko koncept-bez-atomu (cEmpty), zero odpowiedzi → NIE blokuje", async () => {
		await insertFailedSession({
			completedAt: at(0),
			correctives: false,
			failedConcepts: [cEmpty],
			hash: "s4a-1a",
		});
		await insertFailedSession({
			completedAt: at(10),
			correctives: true,
			failedConcepts: [cEmpty],
			hash: "s4a-1b",
		});
		// Zero odpowiedzi correctives.

		// RĘCZNIE: s1b requiredItemIds=[] → doneAt=failedAt=10. granica=10. oblane>10=0.
		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(0);
		expect(state.correctivesRequired).toBe(false);
		expect(state.attempt).toBe(1);
	});

	// Wektor 4 (mieszany): cap-2 fail na [cEmpty, cA] → requiredItemIds=[X] (cEmpty
	// nic nie wnosi) → blokuje DOPÓKI X nieodrobiony; po X → odbyte.
	it("S4b — cap-2 [cEmpty, cA]: blokuje aż X odrobiony, cEmpty nie wpływa", async () => {
		await insertFailedSession({
			completedAt: at(0),
			correctives: false,
			failedConcepts: [cEmpty, cA],
			hash: "s4b-1a",
		});
		await insertFailedSession({
			completedAt: at(10),
			correctives: true,
			failedConcepts: [cEmpty, cA],
			hash: "s4b-1b",
			withPackage: true,
		});

		// Bez odpowiedzi na X → NIEODBYTE (cEmpty nie odblokowuje).
		let state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(2);
		expect(state.correctivesRequired).toBe(true);

		// X odrobiony o 20 (>10) → ODBYTE, cEmpty nie miało wpływu.
		await answerAtom(cA, at(20));
		state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(0);
		expect(state.correctivesRequired).toBe(false);
		expect(state.attempt).toBe(1);
	});

	// ── S5: WIELE odpowiedzi na atom — MIN z kwalifikujących PO failedAt ─────────────
	// Wektor 5. X ma odpowiedzi: 5 (przed failedAt=10 → ignorowana), 15 (min kwalif.),
	// 25 (późniejsza). Domknięcie = 15 (MIN po failedAt), nie 25 (max) i nie failedAt.
	// Świeży fail o 20 (>15) → failedInCycle=1 → attempt 2. Wybór MAX/failedAt dałby 0/1.
	it("S5 — wiele odpowiedzi na atom: domknięcie = MIN kwalifikujących (15), nie max (25)", async () => {
		await insertFailedSession({
			completedAt: at(0),
			correctives: false,
			failedConcepts: [cA],
			hash: "s5-1a",
		});
		await insertFailedSession({
			completedAt: at(10),
			correctives: true,
			failedConcepts: [cA],
			hash: "s5-1b",
		});
		await insertFailedSession({
			completedAt: at(20),
			correctives: false,
			failedConcepts: [cA],
			hash: "s5-2a",
		});
		await answerAtom(cA, at(5)); // przed failedAt → ignorowana
		await answerAtom(cA, at(15)); // min kwalifikująca
		await answerAtom(cA, at(25)); // późniejsza

		// RĘCZNIE: s1b failedAt=10 → min(>10)=15 → granica=15. oblane>15 = {s5-2a(20)} = 1.
		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(1);
		expect(state.correctivesRequired).toBe(false);
		expect(state.attempt).toBe(2);
	});

	// ── S6: TRZY cykle, atom współdzielony przez wszystkie — granica = ostatni domknięty ─
	// Krawędź „max po domkniętych" przy 3 cap-2 sesjach różnego failedAt; prune>min(10)
	// musi obsłużyć wszystkie trzy progi per-sesja z jednej mapy odpowiedzi.
	it("S6 — trzy cap-2 współdzielą atom X, wszystkie odbyte → granica ostatnia, attempt 1", async () => {
		await insertFailedSession({
			completedAt: at(10),
			correctives: true,
			failedConcepts: [cA],
			hash: "s6-1",
		});
		await insertFailedSession({
			completedAt: at(40),
			correctives: true,
			failedConcepts: [cA],
			hash: "s6-2",
		});
		await insertFailedSession({
			completedAt: at(70),
			correctives: true,
			failedConcepts: [cA],
			hash: "s6-3",
		});
		await answerAtom(cA, at(20)); // dla failedAt=10
		await answerAtom(cA, at(50)); // dla failedAt=40
		await answerAtom(cA, at(80)); // dla failedAt=70

		// RĘCZNIE: doneAt = {20,50,80}; granica=80; oblane>80=0.
		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(0);
		expect(state.correctivesRequired).toBe(false);
		expect(state.attempt).toBe(1);
	});
});
