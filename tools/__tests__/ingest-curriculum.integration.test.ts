// @vitest-environment node
//
// 1E.2 — test integracyjny rozszerzonego ingestu curriculum (runCurriculumIngest)
// na BAZIE TESTOWEJ (:5433, wzorzec content-ds-projects.integration.test.ts).
//
// CO TESTUJEMY (ustalenia wiążące z przeglądu Ethana po 1E.1):
//   1. Atomy + bank foundations: pozycje po (module_id, slug), pytania po hashu,
//      config_json.questionItemIds/hints wired, przegląd rozwiązuje refy.
//   2. Idempotencja: drugi bieg = identyczny stan (te same id pytań, 0 retired).
//   3. Niemutowalność banku: zmiana stemu = retire + NOWY item, config pozycji
//      wskazuje nowy zestaw.
//   4. STRAŻNIK: zmiana questionItemIds pozycji Z POSTĘPEM studenta wymaga
//      CONFIRM_CONTENT_MIGRATION=1 (bez env — ingest przerwany, stan nietknięty).
//   5. RECOMPUTE (decyzja Darka 2026-07-11): dogranie nowej pozycji do modułu
//      completed → downgrade na in_progress (verified_by_method IS NULL);
//      wstawka w środek modułu nie renumeruje tożsamości (slug!).
//   6. Walidacja zestawu: nierozwiązywalny questionRef nie dotyka bazy.

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AtomModuleContent } from "../content-curriculum-atoms";
import { type Ladder, runCurriculumIngest } from "../ingest-curriculum";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

const PATH = "t-1e2-ingest-path";
const MODULE = "t-1e2-ing-a";
const CONCEPT = "t-1e2-ing-koncept";
const USER = "u-1e2-ingest";

const ladder: Ladder = {
	path: PATH,
	modules: [{ slug: MODULE, title: "Moduł ingest 1E.2", items: [] }],
};

function question(ref: string, stem: string) {
	return {
		ref,
		conceptSlug: CONCEPT,
		difficulty: 1 as const,
		type: "single_choice" as const,
		stem,
		options: ["dobra", "zła", "też zła"],
		answer: { correct: 0 },
		explanationMd: "Bo pierwsza.",
		optionFeedback: [
			{ feedbackMd: "Tak.", diagnosis: "" },
			{ feedbackMd: "Nie — pułapka 1.", diagnosis: "myli a z b" },
			{ feedbackMd: "Nie — pułapka 2." },
		],
	};
}

function contentsV1(): AtomModuleContent[] {
	return [
		{
			moduleSlug: MODULE,
			items: [
				{
					slug: "a-1",
					position: 10,
					kind: "exercise",
					title: "Atom 1",
					contentMd: "## Cel\nTeoria atomu 1.",
					concepts: [{ slug: CONCEPT, name: "Koncept ingest 1E.2", key: true }],
					questions: [
						question("t1e2a-1-p1", "Pytanie 1 atomu 1 — które poprawne?"),
						question("t1e2a-1-p2", "Pytanie 2 atomu 1 — które poprawne?"),
						question("t1e2a-1-p3", "Pytanie 3 atomu 1 — które poprawne?"),
					],
					hints: ["koncepcyjny", "szkielet", "pełne rozwiązanie"],
					resources: [
						{
							title: "Dokumentacja PL",
							url: "https://docs.python.org/pl/3/",
							type: "docs",
							license: "PSF",
							language: "PL",
							registrationRequired: false,
							verifiedAt: "2026-07-11",
						},
					],
				},
				{
					slug: "a-lab",
					position: 20,
					kind: "lab",
					title: "Lab 1",
					contentMd: "Checklist labu.",
					concepts: [{ slug: CONCEPT, name: "Koncept ingest 1E.2" }],
					hints: ["h1", "h2", "h3"],
					// 1E.6b (ADR-015): realny kontrakt checku, nie atrapa `{type:"token"}`
					// — walidator ją odrzuca (`validateChecks` w content-curriculum-atoms).
					config: {
						checks: [
							{
								id: "C1",
								kind: "predicate",
								note: "pieczątka wykonała się w sesji",
								rule: { op: "is_true", var: "_wykonano" },
							},
						],
					},
				},
				{
					slug: "a-przeglad",
					position: 80,
					kind: "exercise",
					title: "Przegląd przed egzaminem",
					contentMd: "Reuse pytań atomowych.",
					questionRefs: ["t1e2a-1-p1", "t1e2a-1-p3"],
				},
			],
		},
	];
}

d("1E.2 · ingest curriculum: atomy + bank + strażnik + recompute (realna baza)", () => {
	const pool = new Pool({ connectionString: DATABASE_URL });
	let studentId = "";
	let tenantId = "";

	const itemBySlug = async (slug: string) => {
		const { rows } = await pool.query(
			`SELECT i.* FROM curriculum_module_items i
			 JOIN curriculum_modules m ON m.id = i.module_id
			 WHERE m.slug = $1 AND i.slug = $2`,
			[MODULE, slug],
		);
		return rows[0];
	};
	const activeQuestionIds = async () => {
		const { rows } = await pool.query(
			`SELECT q.id, q.stem FROM question_items q
			 JOIN question_concepts c ON c.id = q.concept_id
			 WHERE c.slug = $1 AND q.status = 'active' ORDER BY q.stem`,
			[CONCEPT],
		);
		return rows as { id: string; stem: string }[];
	};

	beforeAll(async () => {
		delete process.env.CONFIRM_CONTENT_MIGRATION;
		// Czysty stan syntetycznych encji (kaskady sprzątną pozycje/postęp/pytania).
		await pool.query(`DELETE FROM curriculum_modules WHERE slug = $1`, [MODULE]);
		await pool.query(`DELETE FROM question_concepts WHERE slug = $1`, [CONCEPT]);
		await pool.query(`DELETE FROM curriculum_path_modules WHERE path_key = $1`, [PATH]);

		const { rows: tenant } = await pool.query(
			`INSERT INTO tenants (slug, name) VALUES ('t-1e2-ing', 'Tenant ingest 1E.2')
			 ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
		);
		tenantId = tenant[0].id;
		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, $1, $1 || '@test.local', true, now(), now()) ON CONFLICT (id) DO NOTHING`,
			[USER],
		);
		const { rows: student } = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'Test U', 'Informatyka', 3, 'Data Scientist')
			 ON CONFLICT (user_id) DO UPDATE SET career_goal = EXCLUDED.career_goal RETURNING id`,
			[USER, tenantId],
		);
		studentId = student[0].id;
	});

	afterAll(async () => {
		delete process.env.CONFIRM_CONTENT_MIGRATION;
		await pool.end();
	});

	it("pierwszy bieg: pozycje po slugu, bank foundations, config wired, przegląd z refów", async () => {
		const stats = await runCurriculumIngest(DATABASE_URL, ladder, contentsV1());
		expect(stats.items).toBe(3);
		expect(stats.downgraded).toBe(0);

		const atom = await itemBySlug("a-1");
		expect(atom.kind).toBe("exercise");
		expect(atom.config_json.questionItemIds).toHaveLength(3);
		expect(atom.config_json.hints).toEqual(["koncepcyjny", "szkielet", "pełne rozwiązanie"]);

		const lab = await itemBySlug("a-lab");
		expect(lab.config_json.checks).toHaveLength(1);
		expect(lab.config_json.questionItemIds).toBeUndefined();

		const przeglad = await itemBySlug("a-przeglad");
		expect(przeglad.config_json.questionItemIds).toHaveLength(2);
		// Refy przeglądu wskazują TE SAME itemy banku co atom (reuse, nie kopie).
		for (const id of przeglad.config_json.questionItemIds) {
			expect(atom.config_json.questionItemIds).toContain(id);
		}

		const bank = await activeQuestionIds();
		expect(bank).toHaveLength(3);
		const { rows: feedback } = await pool.query(
			`SELECT option_feedback_json FROM question_items WHERE id = $1`,
			[bank[0].id],
		);
		expect(feedback[0].option_feedback_json).toHaveLength(3);

		const { rows: resources } = await pool.query(
			`SELECT title, language FROM curriculum_item_resources WHERE item_id = $1`,
			[atom.id],
		);
		expect(resources).toEqual([{ title: "Dokumentacja PL", language: "PL" }]);
		const { rows: concepts } = await pool.query(
			`SELECT 1 FROM curriculum_item_concepts WHERE item_id = $1`,
			[atom.id],
		);
		expect(concepts).toHaveLength(1);
	});

	it("idempotencja: drugi bieg = te same id pytań, zero retired", async () => {
		const before = await activeQuestionIds();
		const stats = await runCurriculumIngest(DATABASE_URL, ladder, contentsV1());
		expect(stats.bank).toContain("+0 nowe");
		expect(stats.bank).toContain("0 retired");
		// Idempotencja obejmuje feedback: porównanie kanoniczne (JSONB przestawia
		// klucze) — drugi bieg nie może "aktualizować" niczego.
		expect(stats.bank).toContain("w tym 0 aktualizacji feedbacku");
		const after = await activeQuestionIds();
		expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
	});

	// Wersje treści są KUMULATYWNE (jak realne poprawki kuracji) — bez kumulacji
	// cofnięcie stemu wskrzeszałoby stary item jako „nowy" i psuło liczniki.
	function contentsV2(): AtomModuleContent[] {
		const contents = contentsV1();
		// biome-ignore lint/style/noNonNullAssertion: struktura zbudowana wyżej.
		contents[0].items[0].questions![1].stem = "Pytanie 2 atomu 1 — wersja POPRAWIONA?";
		return contents;
	}
	function contentsV3(): AtomModuleContent[] {
		const contents = contentsV2();
		// biome-ignore lint/style/noNonNullAssertion: struktura zbudowana wyżej.
		contents[0].items[0].questions![2].stem = "Pytanie 3 atomu 1 — kolejna zmiana?";
		return contents;
	}

	it("niemutowalność: zmiana stemu = retire + NOWY item; config pozycji nadąża", async () => {
		const stats = await runCurriculumIngest(DATABASE_URL, ladder, contentsV2());
		expect(stats.bank).toContain("+1 nowe");
		expect(stats.bank).toContain("1 retired");

		const atom = await itemBySlug("a-1");
		const active = await activeQuestionIds();
		expect(active).toHaveLength(3);
		expect([...atom.config_json.questionItemIds].sort()).toEqual(active.map((r) => r.id).sort());
		const { rows: retired } = await pool.query(
			`SELECT count(*)::int AS n FROM question_items q
			 JOIN question_concepts c ON c.id = q.concept_id
			 WHERE c.slug = $1 AND q.status = 'retired'`,
			[CONCEPT],
		);
		expect(retired[0].n).toBe(1);
	});

	it("STRAŻNIK: zmiana questionItemIds pozycji z postępem wymaga CONFIRM_CONTENT_MIGRATION=1", async () => {
		const atom = await itemBySlug("a-1");
		await pool.query(
			`INSERT INTO curriculum_item_progress (student_id, tenant_id, item_id, status, attempts)
			 VALUES ($1, $2, $3, 'in_progress', 1)
			 ON CONFLICT (student_id, item_id) DO UPDATE SET status = 'in_progress'`,
			[studentId, tenantId, atom.id],
		);

		const contents = contentsV3();
		await expect(runCurriculumIngest(DATABASE_URL, ladder, contents)).rejects.toThrow(
			/CONFIRM_CONTENT_MIGRATION/,
		);
		// Transakcja wycofana: stary zestaw pytań pozycji nietknięty.
		const after = await itemBySlug("a-1");
		expect(after.config_json.questionItemIds).toEqual(atom.config_json.questionItemIds);

		process.env.CONFIRM_CONTENT_MIGRATION = "1";
		const stats = await runCurriculumIngest(DATABASE_URL, ladder, contents);
		delete process.env.CONFIRM_CONTENT_MIGRATION;
		expect(stats.bank).toContain("+1 nowe");
		const confirmed = await itemBySlug("a-1");
		expect(confirmed.config_json.questionItemIds).not.toEqual(atom.config_json.questionItemIds);
	});

	it("RECOMPUTE: dogranie pozycji do modułu completed → downgrade na in_progress", async () => {
		// Student „ukończył" moduł w stanie v1: komplet pozycji completed.
		const { rows: moduleRow } = await pool.query(
			`SELECT id FROM curriculum_modules WHERE slug = $1`,
			[MODULE],
		);
		const moduleId = moduleRow[0].id;
		const { rows: items } = await pool.query(
			`SELECT id FROM curriculum_module_items WHERE module_id = $1`,
			[moduleId],
		);
		for (const row of items) {
			await pool.query(
				`INSERT INTO curriculum_item_progress (student_id, tenant_id, item_id, status, completed_at)
				 VALUES ($1, $2, $3, 'completed', now())
				 ON CONFLICT (student_id, item_id) DO UPDATE SET status = 'completed', completed_at = now()`,
				[studentId, tenantId, row.id],
			);
		}
		await pool.query(
			`INSERT INTO curriculum_module_progress (student_id, tenant_id, module_id, status, completed_at)
			 VALUES ($1, $2, $3, 'completed', now())
			 ON CONFLICT (student_id, module_id) DO UPDATE SET status = 'completed', completed_at = now()`,
			[studentId, tenantId, moduleId],
		);

		// v4 = v3 + NOWY atom W ŚRODKU (position 15) — tożsamości slug bez zmian.
		const contents = contentsV3();
		contents[0].items.push({
			slug: "a-2",
			position: 15,
			kind: "exercise",
			title: "Atom 2 (dogrywka)",
			contentMd: "## Cel\nNowa treść.",
			concepts: [{ slug: CONCEPT, name: "Koncept ingest 1E.2" }],
			questions: [
				question("t1e2a-2-p1", "Pytanie 1 atomu 2?"),
				question("t1e2a-2-p2", "Pytanie 2 atomu 2?"),
				question("t1e2a-2-p3", "Pytanie 3 atomu 2?"),
			],
			hints: ["h1", "h2", "h3"],
		});
		const stats = await runCurriculumIngest(DATABASE_URL, ladder, contents);
		expect(stats.items).toBe(4);
		expect(stats.downgraded).toBe(1);

		const { rows: progress } = await pool.query(
			`SELECT status, completed_at FROM curriculum_module_progress
			 WHERE student_id = $1 AND module_id = $2`,
			[studentId, moduleId],
		);
		expect(progress[0].status).toBe("in_progress");
		expect(progress[0].completed_at).toBeNull();

		// Wstawka w środek NIE podmieniła treści pod postępem: a-1 to wciąż ten sam
		// wiersz (slug = tożsamość), a-2 stoi między a-1 a a-lab tylko sortowaniem.
		const { rows: order } = await pool.query(
			`SELECT slug, position FROM curriculum_module_items WHERE module_id = $1 ORDER BY position`,
			[moduleId],
		);
		expect(order.map((r) => r.slug)).toEqual(["a-1", "a-2", "a-lab", "a-przeglad"]);
	});

	it("walidacja zestawu: nierozwiązywalny questionRef nie dotyka bazy", async () => {
		const contents = contentsV3();
		// biome-ignore lint/style/noNonNullAssertion: struktura zbudowana wyżej.
		contents[0].items[2].questionRefs!.push("nie-ma-takiego-refa");
		await expect(runCurriculumIngest(DATABASE_URL, ladder, contents)).rejects.toThrow(
			/nie istnieje w zestawie/,
		);
	});

	// 1E.3 W1 (bramka Leo): item egzaminu = OSOBNE źródło (question_items pod tym
	// samym concept_id co atomy, treść spoza plików atomów), zarejestrowany w pozycji
	// kind='exam' → config_json.examSlots. Retire syncQuestionBank MUSI go pominąć,
	// inaczej ingest treści zretire'owałby pytania egzaminu. Wzorzec „atom przeżywa".
	it("W1: item egzaminu (examSlots) PRZEŻYWA ingest-curriculum — nie jest retired", async () => {
		const { rows: moduleRow } = await pool.query(
			`SELECT id FROM curriculum_modules WHERE slug = $1`,
			[MODULE],
		);
		const moduleId = moduleRow[0].id;
		const { rows: conceptRow } = await pool.query(
			`SELECT id FROM question_concepts WHERE slug = $1`,
			[CONCEPT],
		);
		const conceptId = conceptRow[0].id;

		// Item egzaminu: ten sam concept_id co atomy, ale treść (stem) SPOZA plików
		// atomów — więc jego hash NIE jest w fileHashes i bez wykluczenia examSlots
		// retire by go zdjął.
		const { rows: examItem } = await pool.query<{ id: string }>(
			`INSERT INTO question_items
			   (concept_id, difficulty, type, stem, options_json, answer_json)
			 VALUES ($1, 2, 'single_choice', 'PYTANIE EGZAMINU — spoza plikow atomow', $2, $3)
			 RETURNING id`,
			[conceptId, JSON.stringify(["a", "b", "c", "d"]), JSON.stringify({ correct: 1 })],
		);
		const examItemId = examItem[0].id;

		// Rejestracja pozycji egzaminu (kind='exam') z examSlots wskazującym item.
		const examSlots = [
			{
				slotRef: "e1",
				conceptSlug: CONCEPT,
				variants: [{ ref: "t1e2-ex-e1-a", variant: "A", itemId: examItemId }],
			},
		];
		await pool.query(
			`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, config_json)
			 VALUES ($1, 'exam', 900, 'exam', 'Egzamin modułu', $2)
			 ON CONFLICT (module_id, slug) DO UPDATE SET config_json = EXCLUDED.config_json`,
			[moduleId, JSON.stringify({ examSlots })],
		);

		// Ingest treści (idempotentny na v4 — questionItemIds atomów bez zmian).
		const contents = contentsV3();
		contents[0].items.push({
			slug: "a-2",
			position: 15,
			kind: "exercise",
			title: "Atom 2 (dogrywka)",
			contentMd: "## Cel\nNowa treść.",
			concepts: [{ slug: CONCEPT, name: "Koncept ingest 1E.2" }],
			questions: [
				question("t1e2a-2-p1", "Pytanie 1 atomu 2?"),
				question("t1e2a-2-p2", "Pytanie 2 atomu 2?"),
				question("t1e2a-2-p3", "Pytanie 3 atomu 2?"),
			],
			hints: ["h1", "h2", "h3"],
		});
		await runCurriculumIngest(DATABASE_URL, ladder, contents);

		const { rows: after } = await pool.query<{ status: string }>(
			`SELECT status FROM question_items WHERE id = $1`,
			[examItemId],
		);
		// Bez poprawki W1 status byłby 'retired' — bramka: item egzaminu żyje.
		expect(after[0].status).toBe("active");
	});

	// 1E.3 W1 PRECYZJA (mutacja Quinn/QA): wykluczenie z retire nie może być ZA
	// SZEROKIE. Przy zarejestrowanym itemie egzaminu (examItemIds ≠ ∅) atom, którego
	// treść zniknęła z plików, MUSI się nadal zretire'ować. Gdyby fix wykluczał za
	// dużo (np. wszystkie itemy konceptu), retired=0 → czerwony; gdyby za wąsko (exam
	// też retiruje), zniknąłby exam item → też czerwony. Guard łapie OBIE strony.
	it("W1 precyzja: atom NADAL retiruje się mimo examItemIds≠∅ (wykluczenie nie za szerokie)", async () => {
		const retiredCount = async () => {
			const { rows } = await pool.query<{ n: number }>(
				`SELECT count(*)::int AS n FROM question_items q
				 JOIN question_concepts c ON c.id = q.concept_id
				 WHERE c.slug = $1 AND q.status = 'retired'`,
				[CONCEPT],
			);
			return rows[0].n;
		};
		const before = await retiredCount();

		// Stan bazy = contentsV3 + atom a-2 (z testu W1 wyżej). Zmieniamy stem pytania
		// a-2/p1 → jego stary item pytania atomu ma się zretire'ować (retire+nowy).
		const contents = contentsV3();
		contents[0].items.push({
			slug: "a-2",
			position: 15,
			kind: "exercise",
			title: "Atom 2 (dogrywka)",
			contentMd: "## Cel\nNowa treść.",
			concepts: [{ slug: CONCEPT, name: "Koncept ingest 1E.2" }],
			questions: [
				question("t1e2a-2-p1", "Pytanie 1 atomu 2 — ZMIANA (retire+nowy)?"),
				question("t1e2a-2-p2", "Pytanie 2 atomu 2?"),
				question("t1e2a-2-p3", "Pytanie 3 atomu 2?"),
			],
			hints: ["h1", "h2", "h3"],
		});
		const stats = await runCurriculumIngest(DATABASE_URL, ladder, contents);
		expect(stats.bank).toContain("1 retired"); // atom zretire'owany mimo examItemIds≠∅

		// Dokładnie +1 retired (stary a-2/p1) — NIE +0 (za szerokie wykluczenie) i NIE
		// +2 (exam item wpadłby do retire — za wąskie). Tożsame liczenie w before/after.
		expect(await retiredCount()).toBe(before + 1);

		// Item egzaminu z testu W1 dalej aktywny (druga strona guardu).
		const { rows: exam } = await pool.query<{ status: string }>(
			`SELECT status FROM question_items WHERE stem = 'PYTANIE EGZAMINU — spoza plikow atomow'`,
		);
		expect(exam[0].status).toBe("active");
	});
});
