// @vitest-environment node
//
// N1 (1E.4) — BRAMKA QA (Quinn) filtra pojemności enroll-hook po ZAWĘŻENIU do
// `single_choice`, na REALNEJ bazie (:5433, NIE prod NEON, NIE atrapy). Testuje
// enrollModuleConceptsOnMasteryPass WPROST (bez trasy egzaminu — filtr żyje w
// zapytaniu hooka, nie w trasie): korelowany EXISTS na question_items zawężony
// `eq(type,'single_choice')`.
//
// KONTRAKT: koncept `trunk='market'`, `status='active'`, którego JEDYNE aktywne
// pytanie jest NIE-single_choice (numeric) → po zdanym mastery gate NIE tworzy
// wiersza review_states (parytet z kolejką R4, która serwuje wyłącznie
// single_choice — inaczej PHANTOM-wiersz: zaplanowana powtórka, której kolejka
// nigdy nie pokaże). Kontrast: koncept market z aktywnym single_choice →
// enrollowany. Trzeci przypadek broni „single_choice ale retired" — status też
// musi być active (regresja typu bez statusu przeciekłaby).
//
// Dlaczego łapie regresję: atrapa DB świeciłaby zielono tam, gdzie realnie pęka
// predykat SQL EXISTS. Dowód MUTACYJNY (w raporcie Quinn): usunięcie
// `eq(questionItems.type,'single_choice')` z enroll-hook → koncept numeric-only
// przecieka do enrollmentu → ten test czerwony. Rewert → zielony. To odróżnia
// „test faktycznie pilnuje typu" od „test przechodzi z innego powodu".
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`. Bez lokalnej bazy — skip.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-1e4-n1-single-choice";
const PREFIX = "n1sc-";

dBack("N1 · enroll-hook filtr single_choice (realna baza :5433)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	let enrollModuleConceptsOnMasteryPass: (studentId: string, moduleId: string) => Promise<void>;

	let tenantId = "";
	let studentId = "";
	let moduleId = "";
	const concept: Record<string, string> = {};

	async function cleanupAll() {
		await db.execute(sql`DELETE FROM review_logs WHERE student_id IN
			(SELECT id FROM students WHERE user_id = ${USER})`);
		await db.execute(sql`DELETE FROM review_states WHERE student_id IN
			(SELECT id FROM students WHERE user_id = ${USER})`);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER}`);
		await db.execute(sql`DELETE FROM curriculum_item_concepts WHERE concept_id IN
			(SELECT id FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`})`);
		await db.execute(sql`DELETE FROM curriculum_module_items WHERE module_id IN
			(SELECT id FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`})`);
		await db.execute(sql`DELETE FROM question_items WHERE concept_id IN
			(SELECT id FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`})`);
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM tenants WHERE slug LIKE ${`${PREFIX}%`}`);
	}

	async function mkConcept(key: string): Promise<string> {
		const [c] = await db
			.insert(schema.questionConcepts)
			.values({
				slug: `${PREFIX}${key}`,
				name: `Koncept ${key}`,
				trunk: "market",
				competencyName: `Kompetencja ${key}`,
				status: "active",
			})
			.returning({ id: schema.questionConcepts.id });
		return c.id;
	}

	async function mkQuestion(
		conceptId: string,
		type: "single_choice" | "numeric",
		status: "active" | "retired",
	): Promise<void> {
		await db.insert(schema.questionItems).values({
			conceptId,
			difficulty: 1,
			type,
			stem: `Pytanie ${type}/${status}`,
			// single_choice potrzebuje opcji + klucza; numeric: answerJson liczbowy.
			optionsJson: type === "single_choice" ? ["a", "b"] : null,
			answerJson: type === "single_choice" ? { correct: 0 } : { value: 42 },
			status,
		});
	}

	let itemPos = 0;
	async function mapConceptToModule(conceptId: string): Promise<void> {
		const [item] = await db
			.insert(schema.curriculumModuleItems)
			.values({
				moduleId,
				slug: `${PREFIX}item-${itemPos}`,
				position: itemPos++,
				kind: "exercise",
				title: `Pozycja ${itemPos}`,
			})
			.returning({ id: schema.curriculumModuleItems.id });
		await db.insert(schema.curriculumItemConcepts).values({ itemId: item.id, conceptId });
	}

	async function enrolledConceptIds(): Promise<Set<string>> {
		const r = await db.execute(
			sql`SELECT concept_id FROM review_states WHERE student_id = ${studentId}::uuid`,
		);
		return new Set(r.rows.map((row: { concept_id: string }) => row.concept_id));
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ enrollModuleConceptsOnMasteryPass } = await import("../enroll-hook"));
		await cleanupAll();

		const [t] = await db
			.insert(schema.tenants)
			.values({ slug: `${PREFIX}tenant`, name: `${PREFIX}tenant` })
			.returning({ id: schema.tenants.id });
		tenantId = t.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, 'N1 SC', ${`${USER}@test.local`}, true, now(), now())`,
		);
		const [student] = await db
			.insert(schema.students)
			.values({
				userId: USER,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "N1",
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentId = student.id;

		// ── Trzy koncepty market/active, różniące się WYŁĄCZNIE bankiem pytań: ──
		// SC       — jedyne aktywne pytanie: single_choice → ENROLL.
		// NUMONLY  — jedyne aktywne pytanie: numeric        → NIE enroll (rdzeń N1).
		// SCRETIRED— jedyne single_choice jest RETIRED       → NIE enroll (typ OK, status NIE).
		concept.sc = await mkConcept("sc");
		concept.numOnly = await mkConcept("num-only");
		concept.scRetired = await mkConcept("sc-retired");

		await mkQuestion(concept.sc, "single_choice", "active");
		await mkQuestion(concept.numOnly, "numeric", "active");
		await mkQuestion(concept.scRetired, "single_choice", "retired");

		moduleId = (
			await db
				.insert(schema.curriculumModules)
				.values({
					slug: `${PREFIX}mod`,
					title: "Moduł N1",
					examConfigJson: { questionCount: 2, maxErrors: 1 },
				})
				.returning({ id: schema.curriculumModules.id })
		)[0].id;

		await mapConceptToModule(concept.sc);
		await mapConceptToModule(concept.numOnly);
		await mapConceptToModule(concept.scRetired);
	}, 60_000);

	afterAll(async () => {
		if (db) await cleanupAll();
	});

	beforeEach(async () => {
		await db.execute(sql`DELETE FROM review_logs WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM review_states WHERE student_id = ${studentId}`);
	});

	it("koncept market z aktywnym single_choice → enrollowany", async () => {
		await enrollModuleConceptsOnMasteryPass(studentId, moduleId);
		const enrolled = await enrolledConceptIds();
		expect(enrolled.has(concept.sc)).toBe(true);
	});

	it("koncept market, którego JEDYNE aktywne pytanie jest numeric → NIE enrollowany (rdzeń N1)", async () => {
		await enrollModuleConceptsOnMasteryPass(studentId, moduleId);
		const enrolled = await enrolledConceptIds();
		expect(enrolled.has(concept.numOnly)).toBe(false);
	});

	it("koncept market z single_choice ale RETIRED → NIE enrollowany (typ OK, status wyklucza)", async () => {
		await enrollModuleConceptsOnMasteryPass(studentId, moduleId);
		const enrolled = await enrolledConceptIds();
		expect(enrolled.has(concept.scRetired)).toBe(false);
	});

	it("zbiór zasianych = DOKŁADNIE {sc} (żaden numeric/retired nie przeciekł)", async () => {
		await enrollModuleConceptsOnMasteryPass(studentId, moduleId);
		const enrolled = await enrolledConceptIds();
		expect([...enrolled].sort()).toEqual([concept.sc]);
	});
});
