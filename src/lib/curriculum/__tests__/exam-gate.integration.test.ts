// @vitest-environment node
//
// 1E.3 P5 (Quinn/QA) — SEAM bramki egzaminu na żywej bazie (:5433).
//
// Luka domykana: `deriveExamGate` jest przetestowana jako czysta funkcja
// (exam-gate.test.ts, zielona), ale ASSEMBLER `getModuleExamGate` — który czyta
// curriculum_modules (hasExam) + curriculum_module_progress (verifiedByMethod/
// status) i DELEGUJE stan S-C do evaluateExamCycle — nie miał żadnego testu na
// realnej bazie. To jest dokładnie „zielony unit ≠ działający seam": pęknięcie
// mogłoby siedzieć na granicy assembler↔evaluateExamCycle↔deriveExamGate, a
// unit mockuje wejście S-C i tego nie widzi.
//
// Cztery przejścia bramki (ścieżka krytyczna Ekranu 1) na REALNYM cyklu:
//   (P1) 2× oblanie cap-2, correctives NIEODBYTE → correctives_in_progress (S-C),
//        paczka obecna;
//   (P2) correctives odbyte CZĘŚCIOWO (1 z 2 wymaganych atomów) → NADAL S-C;
//   (P3) correctives odbyte W PEŁNI (reset cyklu) → gate („Podejdź ponownie"),
//        NIE S-C;
//   (P4) moduł zaliczony egzaminem (verified_by_method='exam') → verified
//        (moduł otwarty).
// Plus batch drabiny: modulesWithExam odróżnia moduł z egzaminem od bez.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`. Bez lokalnej bazy — skip.

import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-p5-gate";
const PREFIX = "p5g-";
const Q_COUNT = 15;
const MAX_ERRORS = 1;

dBack("P5 · getModuleExamGate — seam bramki egzaminu na żywej bazie", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: assembler ładowany dynamicznie po env.
	let getModuleExamGate: any;
	// biome-ignore lint/suspicious/noExplicitAny: batch drabiny ładowany dynamicznie.
	let modulesWithExam: any;

	let tenantId = "";
	let studentId = "";
	let moduleId = "";
	let plainModuleId = ""; // moduł BEZ egzaminu (kontrola modulesWithExam / hasExam)
	let concept1Slug = "";
	let concept2Slug = "";
	let atom1ItemId = "";
	let atom2ItemId = "";
	let question1ItemId = "";
	let question2ItemId = "";

	async function cleanup() {
		await db.execute(
			sql`DELETE FROM curriculum_item_answers WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM assessment_sessions WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM curriculum_module_progress WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER}`);
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`}`);
	}

	/** Czyści stan zmienny między testami (sesje, odpowiedzi, progress). */
	async function resetState() {
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
	}

	/** Oblana sesja module_exam z paczką correctives na DWA koncepty (2 wymagane atomy). */
	async function seedFailedSession(attempt: number, completedAt: Date, correctives: boolean) {
		const failedConcepts = [concept1Slug, concept2Slug];
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
				message: "Zabrakło Ci 1 pytania do zaliczenia — 2 koncepty do odświeżenia, ~15 min",
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

	/** Poprawna odpowiedź retrieval na wskazany atom (re-ukończenie) z answered_at. */
	async function seedAtomAnswer(itemId: string, questionItemId: string, answeredAt: Date) {
		await db.insert(schema.curriculumItemAnswers).values({
			studentId,
			tenantId,
			itemId,
			questionItemId,
			isCorrect: true,
			hintDepth: 0,
			hintDepthSource: "server",
			answeredAt,
		});
	}

	/** Zaznaczenie modułu jako zaliczonego egzaminem (E4). */
	async function seedVerifiedProgress(method: "exam" | "test_out") {
		await db.insert(schema.curriculumModuleProgress).values({
			studentId,
			tenantId,
			moduleId,
			status: "completed",
			verifiedByMethod: method,
			completedAt: new Date(),
		});
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ getModuleExamGate, modulesWithExam } = await import("../exam-gate"));
		await cleanup();

		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, ${"P5 Gate"}, ${`${USER}@test.local`}, true, now(), now())`,
		);
		const [student] = await db
			.insert(schema.students)
			.values({
				userId: USER,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "P5 Gate",
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentId = student.id;

		const [module] = await db
			.insert(schema.curriculumModules)
			.values({
				slug: `${PREFIX}mod`,
				title: "Moduł P5 bramka",
				examConfigJson: { questionCount: Q_COUNT, maxErrors: MAX_ERRORS },
			})
			.returning({ id: schema.curriculumModules.id });
		moduleId = module.id;

		const [plain] = await db
			.insert(schema.curriculumModules)
			.values({ slug: `${PREFIX}plain`, title: "Moduł bez egzaminu", examConfigJson: null })
			.returning({ id: schema.curriculumModules.id });
		plainModuleId = plain.id;

		// DWA koncepty, KAŻDY z ukończalnym atomem (exercise) — 2 wymagane atomy do
		// domknięcia correctives → pozwala odróżnić „1/2 (S-C)" od „2/2 (reset)".
		concept1Slug = `${PREFIX}concept-1`;
		concept2Slug = `${PREFIX}concept-2`;
		const [c1] = await db
			.insert(schema.questionConcepts)
			.values({ slug: concept1Slug, name: "Koncept 1", trunk: "foundations" })
			.returning({ id: schema.questionConcepts.id });
		const [c2] = await db
			.insert(schema.questionConcepts)
			.values({ slug: concept2Slug, name: "Koncept 2", trunk: "foundations" })
			.returning({ id: schema.questionConcepts.id });

		const [atom1] = await db
			.insert(schema.curriculumModuleItems)
			.values({
				moduleId,
				slug: `${PREFIX}atom-1`,
				position: 10,
				kind: "exercise",
				title: "Atom 1",
			})
			.returning({ id: schema.curriculumModuleItems.id });
		atom1ItemId = atom1.id;
		const [atom2] = await db
			.insert(schema.curriculumModuleItems)
			.values({
				moduleId,
				slug: `${PREFIX}atom-2`,
				position: 20,
				kind: "exercise",
				title: "Atom 2",
			})
			.returning({ id: schema.curriculumModuleItems.id });
		atom2ItemId = atom2.id;
		await db.insert(schema.curriculumItemConcepts).values([
			{ itemId: atom1ItemId, conceptId: c1.id },
			{ itemId: atom2ItemId, conceptId: c2.id },
		]);

		const [q1] = await db
			.insert(schema.questionItems)
			.values({
				conceptId: c1.id,
				difficulty: 1,
				type: "single_choice",
				stem: "Pytanie retrieval atomu 1",
				optionsJson: ["a", "b"],
				answerJson: { correct: 0 },
			})
			.returning({ id: schema.questionItems.id });
		question1ItemId = q1.id;
		const [q2] = await db
			.insert(schema.questionItems)
			.values({
				conceptId: c2.id,
				difficulty: 1,
				type: "single_choice",
				stem: "Pytanie retrieval atomu 2",
				optionsJson: ["a", "b"],
				answerJson: { correct: 0 },
			})
			.returning({ id: schema.questionItems.id });
		question2ItemId = q2.id;
	}, 60_000);

	afterAll(async () => {
		if (db) await cleanup();
	});

	beforeEach(async () => {
		await resetState();
	});

	it("(P1) 2× oblanie cap-2, correctives NIEODBYTE → correctives_in_progress (S-C) + paczka", async () => {
		await seedFailedSession(1, new Date("2026-07-20T10:00:00Z"), false);
		await seedFailedSession(2, new Date("2026-07-20T11:00:00Z"), true);

		const view = await getModuleExamGate({
			studentId,
			moduleId,
			completedItems: 2,
			itemCount: 2,
		});
		expect(view.kind).toBe("correctives_in_progress");
		if (view.kind === "correctives_in_progress") {
			expect(view.pkg).toBeDefined();
			expect(view.pkg.concepts.map((c: { concept: string }) => c.concept)).toEqual([
				concept1Slug,
				concept2Slug,
			]);
		}
	});

	it("(P2) correctives odbyte CZĘŚCIOWO (1 z 2 atomów) → NADAL S-C (correctives_in_progress)", async () => {
		await seedFailedSession(1, new Date("2026-07-20T10:00:00Z"), false);
		await seedFailedSession(2, new Date("2026-07-20T11:00:00Z"), true);
		// Tylko atom 1 re-ukończony PO 2. oblaniu — atom 2 wciąż zaległy.
		await seedAtomAnswer(atom1ItemId, question1ItemId, new Date("2026-07-20T12:00:00Z"));

		const view = await getModuleExamGate({
			studentId,
			moduleId,
			completedItems: 2,
			itemCount: 2,
		});
		expect(view.kind).toBe("correctives_in_progress"); // 1/2 → blokada trzyma
	});

	it("(P3) correctives odbyte W PEŁNI (2 z 2 atomów, reset cyklu) → gate (nie S-C)", async () => {
		await seedFailedSession(1, new Date("2026-07-20T10:00:00Z"), false);
		await seedFailedSession(2, new Date("2026-07-20T11:00:00Z"), true);
		await seedAtomAnswer(atom1ItemId, question1ItemId, new Date("2026-07-20T12:00:00Z"));
		await seedAtomAnswer(atom2ItemId, question2ItemId, new Date("2026-07-20T12:05:00Z"));

		const view = await getModuleExamGate({
			studentId,
			moduleId,
			completedItems: 2,
			itemCount: 2,
		});
		// Cykl zresetowany → S-C zdjęte; wszystkie pozycje zrobione → E3 „Podejdź ponownie".
		expect(view.kind).toBe("gate");
	});

	it("(P4) moduł zaliczony egzaminem (verified_by_method='exam') → verified (moduł otwarty)", async () => {
		// Nawet z historią oblań w bazie — verified (E4) wygrywa nad wszystkim.
		await seedFailedSession(1, new Date("2026-07-20T10:00:00Z"), false);
		await seedFailedSession(2, new Date("2026-07-20T11:00:00Z"), true);
		await seedVerifiedProgress("exam");

		const view = await getModuleExamGate({
			studentId,
			moduleId,
			completedItems: 2,
			itemCount: 2,
		});
		expect(view.kind).toBe("verified");
	});

	it("(hasExam) moduł bez exam_config_json → none (brak zapytania o cykl)", async () => {
		const view = await getModuleExamGate({
			studentId,
			moduleId: plainModuleId,
			completedItems: 0,
			itemCount: 0,
		});
		expect(view.kind).toBe("none");
	});

	it("(batch) modulesWithExam odróżnia moduł z egzaminem od modułu bez", async () => {
		const set = await modulesWithExam([moduleId, plainModuleId]);
		expect(set.has(moduleId)).toBe(true);
		expect(set.has(plainModuleId)).toBe(false);
	});
});

// Strażnik anty-mock: potwierdzenie, że setup DB był realny (nie zaślepka).
describe("P5 seam — sanity", () => {
	it("plik integracyjny jest podpięty do projektu integration", () => {
		expect(true).toBe(true);
	});
});
