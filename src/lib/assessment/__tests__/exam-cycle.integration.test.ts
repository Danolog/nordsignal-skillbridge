// @vitest-environment node
//
// 1E.3 P5 (decyzje Sophii D1/D2/D4) — MASZYNA STANÓW CYKLU na żywej bazie (:5433).
// Dowodzi rdzenia nowej logiki zliczania: evaluateExamCycle derywuje granicę cyklu
// z istniejących danych (znaczniki czasu assessment_sessions + curriculum_item_answers),
// BEZ nowej kolumny. Trzy fakty:
//   (a) 2 oblania w cyklu, correctives NIEODBYTE → correctivesRequired (S-C), paczka
//       z result_json ostatniej cap-2 sesji;
//   (b) re-ukończenie WYMAGANEGO atomu (poprawna odpowiedź PO 2. oblaniu) → cykl się
//       resetuje: failedInCycle=0, attempt=1 (S-D → świeży cykl);
//   (c) koncept BEZ ukończalnego atomu nie bramkuje (correctives „odbyte" od razu).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`. Bez lokalnej bazy — skip.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-p5-cycle";
const PREFIX = "p5c-";
const Q_COUNT = 15;
const MAX_ERRORS = 1;

dBack("P5 · evaluateExamCycle — reset cyklu i blokada S-C na żywej bazie", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: serwis ładowany dynamicznie po env.
	let evaluateExamCycle: any;

	let tenantId = "";
	let studentId = "";
	let moduleId = "";
	let conceptSlug = "";
	let atomItemId = "";
	let questionItemId = "";

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

	async function resetSessions() {
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id = ${studentId}`);
	}

	/** Oblana sesja module_exam z zadanym result_json i completed_at. */
	async function seedFailedSession(
		attempt: number,
		completedAt: Date,
		correctives: boolean,
		failedConcepts: string[],
	) {
		const resultJson: Record<string, unknown> = {
			schemaVersion: 1,
			kind: "module_exam",
			questionCount: Q_COUNT,
			maxErrors: MAX_ERRORS,
			correctCount: Q_COUNT - 2,
			errorCount: 2,
			passed: false,
			attempt,
			failedConcepts,
			correctives,
		};
		if (correctives) {
			resultJson.correctivesPackage = {
				message: "Zabrakło Ci 1 pytania do zaliczenia — 1 koncept do odświeżenia, ~15 min",
				concepts: failedConcepts.map((c) => ({
					concept: c,
					conceptName: c,
					atoms: [{ slug: `${PREFIX}atom`, title: "Atom", kind: "exercise", moduleSlug: null }],
				})),
			};
		}
		await db.insert(schema.assessmentSessions).values({
			studentId,
			tenantId,
			kind: "module_exam",
			moduleId,
			inputHash: `${PREFIX}${attempt}-${completedAt.getTime()}`,
			status: "completed",
			planJson: { schemaVersion: 1, kind: "module_exam", attempt, items: [] },
			resultJson,
			completedAt,
		});
	}

	/** Poprawna odpowiedź retrieval na atom (re-ukończenie) z zadanym answered_at. */
	async function seedAtomAnswer(answeredAt: Date, isCorrect = true) {
		await db.insert(schema.curriculumItemAnswers).values({
			studentId,
			tenantId,
			itemId: atomItemId,
			questionItemId,
			isCorrect,
			hintDepth: 0,
			hintDepthSource: "server",
			answeredAt,
		});
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ evaluateExamCycle } = await import("../exam-service"));
		await cleanup();

		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, ${"P5 Cycle"}, ${`${USER}@test.local`}, true, now(), now())`,
		);
		const [student] = await db
			.insert(schema.students)
			.values({
				userId: USER,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "P5 Cycle",
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentId = student.id;

		const [module] = await db
			.insert(schema.curriculumModules)
			.values({
				slug: `${PREFIX}mod`,
				title: "Moduł P5 cykl",
				examConfigJson: { questionCount: Q_COUNT, maxErrors: MAX_ERRORS },
			})
			.returning({ id: schema.curriculumModules.id });
		moduleId = module.id;

		conceptSlug = `${PREFIX}concept`;
		const [concept] = await db
			.insert(schema.questionConcepts)
			.values({ slug: conceptSlug, name: "Koncept P5", trunk: "foundations" })
			.returning({ id: schema.questionConcepts.id });

		// Atom UKOŃCZALNY (exercise) uczący konceptu — bramkuje correctives (D4).
		const [atom] = await db
			.insert(schema.curriculumModuleItems)
			.values({
				moduleId,
				slug: `${PREFIX}atom`,
				position: 10,
				kind: "exercise",
				title: "Atom P5",
			})
			.returning({ id: schema.curriculumModuleItems.id });
		atomItemId = atom.id;
		await db
			.insert(schema.curriculumItemConcepts)
			.values({ itemId: atomItemId, conceptId: concept.id });

		const [q] = await db
			.insert(schema.questionItems)
			.values({
				conceptId: concept.id,
				difficulty: 1,
				type: "single_choice",
				stem: "Pytanie retrieval atomu P5",
				optionsJson: ["a", "b"],
				answerJson: { correct: 0 },
			})
			.returning({ id: schema.questionItems.id });
		questionItemId = q.id;
	}, 60_000);

	afterAll(async () => {
		if (db) await cleanup();
	});

	beforeEach(async () => {
		await resetSessions();
	});

	it("(a) 2 oblania cyklu, correctives NIEODBYTE → S-C (correctivesRequired + paczka)", async () => {
		const t0 = new Date("2026-07-20T10:00:00Z");
		const t1 = new Date("2026-07-20T11:00:00Z");
		await seedFailedSession(1, t0, false, [conceptSlug]); // oblanie 1 (attempt 1)
		await seedFailedSession(2, t1, true, [conceptSlug]); // oblanie 2 (cap-2, correctives)

		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(2);
		expect(state.correctivesRequired).toBe(true);
		expect(state.attempt).toBe(2); // clampAttempt(3) = 2
		expect(state.correctivesPackage).toBeDefined();
		expect(state.correctivesPackage.concepts[0].concept).toBe(conceptSlug);
	});

	it("(b) re-ukończenie atomu PO 2. oblaniu → cykl reset (failedInCycle=0, attempt=1)", async () => {
		const t0 = new Date("2026-07-20T10:00:00Z");
		const t1 = new Date("2026-07-20T11:00:00Z");
		await seedFailedSession(1, t0, false, [conceptSlug]);
		await seedFailedSession(2, t1, true, [conceptSlug]);
		// Poprawna odpowiedź retrieval PO completed_at 2. oblania → correctives odbyte.
		await seedAtomAnswer(new Date("2026-07-20T12:00:00Z"), true);

		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.correctivesRequired).toBe(false);
		expect(state.failedInCycle).toBe(0); // granica cyklu przesunięta za oba oblania
		expect(state.attempt).toBe(1); // świeży cykl, podejście od 1
		expect(state.correctivesPackage).toBeUndefined();
	});

	it("(b') odpowiedź PRZED 2. oblaniem NIE liczy się (answered_at musi być PO)", async () => {
		const t0 = new Date("2026-07-20T10:00:00Z");
		const t1 = new Date("2026-07-20T11:00:00Z");
		await seedFailedSession(1, t0, false, [conceptSlug]);
		await seedFailedSession(2, t1, true, [conceptSlug]);
		// Odpowiedź MIĘDZY oblaniami — nie domyka correctives (musi być > 2. oblanie).
		await seedAtomAnswer(new Date("2026-07-20T10:30:00Z"), true);

		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.correctivesRequired).toBe(true);
		expect(state.failedInCycle).toBe(2);
	});

	it("(b'') błędna odpowiedź atomu NIE domyka correctives (wymaga poprawnej)", async () => {
		const t0 = new Date("2026-07-20T10:00:00Z");
		const t1 = new Date("2026-07-20T11:00:00Z");
		await seedFailedSession(1, t0, false, [conceptSlug]);
		await seedFailedSession(2, t1, true, [conceptSlug]);
		await seedAtomAnswer(new Date("2026-07-20T12:00:00Z"), false); // is_correct=false

		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.correctivesRequired).toBe(true);
	});

	it("(single) jedno oblanie w cyklu → attempt=2 (wariant B), bez blokady", async () => {
		await seedFailedSession(1, new Date("2026-07-20T10:00:00Z"), false, [conceptSlug]);
		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(1);
		expect(state.attempt).toBe(2);
		expect(state.correctivesRequired).toBe(false);
	});

	it("(c) koncept BEZ ukończalnego atomu → correctives nie bramkują (od razu odbyte)", async () => {
		const t0 = new Date("2026-07-20T10:00:00Z");
		const t1 = new Date("2026-07-20T11:00:00Z");
		const orphan = `${PREFIX}orphan`; // koncept spoza curriculum_item_concepts
		await seedFailedSession(1, t0, false, [orphan]);
		await seedFailedSession(2, t1, true, [orphan]);

		const state = await evaluateExamCycle(studentId, moduleId);
		// Brak atomu do re-ukończenia → nie może blokować (D4) → cykl reset.
		expect(state.correctivesRequired).toBe(false);
		expect(state.failedInCycle).toBe(0);
	});

	it("(reset→fresh) po resecie nowe oblanie liczy się od 1 (nie kumuluje z poprzednim cyklem)", async () => {
		const t0 = new Date("2026-07-20T10:00:00Z");
		const t1 = new Date("2026-07-20T11:00:00Z");
		await seedFailedSession(1, t0, false, [conceptSlug]);
		await seedFailedSession(2, t1, true, [conceptSlug]);
		await seedAtomAnswer(new Date("2026-07-20T12:00:00Z"), true); // cykl 1 domknięty
		// Nowe oblanie w cyklu 2 (po granicy) — powinno liczyć się jako 1., nie 3.
		await seedFailedSession(1, new Date("2026-07-20T13:00:00Z"), false, [conceptSlug]);

		const state = await evaluateExamCycle(studentId, moduleId);
		expect(state.failedInCycle).toBe(1);
		expect(state.attempt).toBe(2);
		expect(state.correctivesRequired).toBe(false);
	});
});
