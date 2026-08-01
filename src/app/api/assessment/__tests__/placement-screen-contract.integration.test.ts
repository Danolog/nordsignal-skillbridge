// @vitest-environment node
// ============================================================================
// 1E.7 L6 — KONTRAKT DANYCH EKRANU WYNIKU DIAGNOZY, na realnej bazie (:5433).
//
// Test jest na poziomie TRASY, nie modułu, i to jest jego sedno. Kontrakt liczy
// się poprawnie tylko wtedy, gdy powstaje PO zapisie wierszy placementu tej sesji
// (§12.2, „kolejność wykonania"). Ta kolejność jest własnością TRASY — moduł sam
// z siebie nie ma jej jak złamać. Awaria jest BEZOBJAWOWA: rekomendacja policzona
// przed zapisem pokazuje moduł o kilka pozycji za nisko i nadal wygląda sensownie.
//
// Rekwizyt dobrany tak, żeby ta różnica BYŁA WIDOCZNA:
//   • korzeń jest ZALICZONY — inaczej nadpisanie z DECYZJI 3 dałoby `l0-start`
//     w obu kolejnościach i test przespałby awarię (to jest pułapka tego testu);
//   • przed zapisem najgłębszy dostępny to `f1` (otwarty łańcuchem po zaliczonym
//     korzeniu), po zapisie — `pandas` (otwarty placementem).
// Zamiana kolejności w trasie zmienia więc rekomendację `pandas` → `f1`.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracje 0044/0045).
// ============================================================================

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-1e7-l6-kontrakt";
const PREFIX = "l6k-";
const PATH_KEY = "l6k-sciezka-testowa"; // gitleaks:allow — slug ścieżki curriculum, nie sekret
const CEL = "Data Scientist";

/** Ścieżka mapowana na drabinę TESTOWĄ — hook i ekran muszą dostać tę samą. */
vi.mock("@/lib/curriculum/path-key", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/curriculum/path-key")>();
	return {
		...actual,
		pathKeyForCareerGoal: (goal: string) => (goal === CEL ? PATH_KEY : null),
		// Helper zwraca PARĘ `{ pathKey, goalSource }` — atrapa musi oddać ten sam
		// kształt, inaczej trasa dostaje `undefined` zamiast klucza ścieżki.
		resolveDiagnosisPathKey: (p: {
			sessionCareerGoal: string | null | undefined;
			studentCareerGoal: string | null | undefined;
		}) => {
			const cel = (p.sessionCareerGoal ?? p.studentCareerGoal)?.trim();
			return {
				pathKey: cel === CEL ? PATH_KEY : null,
				goalSource: p.sessionCareerGoal?.trim()
					? "session"
					: p.studentCareerGoal?.trim()
						? "student_row"
						: "none",
			};
		},
	};
});

const mockLogError = vi.fn();
vi.mock("@/lib/log", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/log")>();
	return { ...actual, logError: (...a: unknown[]) => mockLogError(...a) };
});

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({ auth: { api: { getSession: () => mockGetSession() } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

/** Moduły drabiny testowej: korzeń → f1 → f2 → pandas → eda (prereq = poprzedni). */
const DRABINA = [
	`${PREFIX}l0-start`,
	`${PREFIX}f1`,
	`${PREFIX}f2`,
	`${PREFIX}pandas`,
	`${PREFIX}eda`,
] as const;

/** Tagi diagnostyczne: f1 i pandas mierzone, f2 bez tagu, eda mierzona i OBLANA. */
const KONCEPT_F1 = `${PREFIX}k-python`;
const KONCEPT_PANDAS = `${PREFIX}k-pandas`;
const KONCEPT_EDA = `${PREFIX}k-eda`;
const KOMPETENCJA_F1 = "L6K Python";
const KOMPETENCJA_PANDAS = "L6K Pandas";
const KOMPETENCJA_EDA = "L6K Eksploracja danych";

dBack("1E.7 L6 · kontrakt ekranu wyniku diagnozy (realna baza, cała trasa)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: handler trasy ładowany dynamicznie.
	let completePOST: any;

	let tenantId = "";
	let studentId = "";
	const moduleIds: Record<string, string> = {};
	const itemIds: Record<string, { d1: string; d2: string; d3: string }> = {};

	function postReq(): Request {
		return new Request("http://test.local/api/assessment/x/complete", { method: "POST" });
	}
	function ctxFor(id: string) {
		return { params: Promise.resolve({ id }) };
	}

	async function insertConcept(slug: string, competencyName: string) {
		const [c] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk, competency_name, diagnostic)
				    VALUES (${slug}, ${competencyName}, 'market', ${competencyName}, true)
				    ON CONFLICT (slug) DO UPDATE SET competency_name = EXCLUDED.competency_name
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		const ids: Record<string, string> = {};
		for (const d of [1, 2, 3]) {
			const [item] = await db
				.execute(
					sql`INSERT INTO question_items (concept_id, difficulty, type, stem, options_json, answer_json)
					    VALUES (${c.id}, ${d}, 'single_choice', ${`[${slug}/d${d}] pytanie`},
					            '["Dobra","Zła"]'::jsonb, '{"correct":0}'::jsonb)
					    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			ids[`d${d}`] = item.id;
		}
		itemIds[slug] = ids as { d1: string; d2: string; d3: string };
		return c.id as string;
	}

	/**
	 * Sesja diagnozy w stanie 'in_progress' + odpowiedzi, tak jak zostawiłyby je
	 * trasy start/answer. Trajektorie: d2 ✓ + d3 ✓ → poziom 4; d2 ✗ + d1 ✗ → 1.
	 */
	async function zalozSesje(): Promise<string> {
		const plan = {
			schemaVersion: 1,
			kind: "diagnostic",
			competencies: [
				{
					competencyName: KOMPETENCJA_F1,
					conceptSlug: KONCEPT_F1,
					items: itemIds[KONCEPT_F1],
				},
				{
					competencyName: KOMPETENCJA_PANDAS,
					conceptSlug: KONCEPT_PANDAS,
					items: itemIds[KONCEPT_PANDAS],
				},
				{
					competencyName: KOMPETENCJA_EDA,
					conceptSlug: KONCEPT_EDA,
					items: itemIds[KONCEPT_EDA],
				},
			],
			uncovered: [],
		};
		const [s] = await db
			.execute(
				sql`INSERT INTO assessment_sessions
				      (student_id, tenant_id, kind, input_hash, status, plan_json, career_goal, started_at)
				    VALUES (${studentId}, ${tenantId}, 'diagnostic', ${`h-${Date.now()}`}, 'in_progress',
				            ${JSON.stringify(plan)}::jsonb, ${CEL}, now())
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);

		let pozycja = 1;
		async function odpowiedz(itemId: string, poprawna: boolean) {
			await db.execute(
				sql`INSERT INTO assessment_answers
				      (session_id, student_id, tenant_id, question_item_id, answer_json, is_correct, position)
				    VALUES (${s.id}, ${studentId}, ${tenantId}, ${itemId},
				            ${JSON.stringify({ selected: poprawna ? 0 : 1 })}::jsonb, ${poprawna}, ${pozycja++})`,
			);
		}
		// Poziom 4 dla f1 i pandas (d2 ✓ → d3 ✓), poziom 1 dla eda (d2 ✗ → d1 ✗).
		await odpowiedz(itemIds[KONCEPT_F1].d2, true);
		await odpowiedz(itemIds[KONCEPT_F1].d3, true);
		await odpowiedz(itemIds[KONCEPT_PANDAS].d2, true);
		await odpowiedz(itemIds[KONCEPT_PANDAS].d3, true);
		await odpowiedz(itemIds[KONCEPT_EDA].d2, false);
		await odpowiedz(itemIds[KONCEPT_EDA].d1, false);
		return s.id as string;
	}

	async function sprzatnij() {
		await db.execute(
			sql`DELETE FROM assessment_answers WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM curriculum_placements WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM assessment_sessions WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM curriculum_module_progress WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(
			sql`DELETE FROM competencies WHERE student_id IN (SELECT id FROM students WHERE user_id = ${USER})`,
		);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER}`);
		// Kolejność wymuszona kluczami obcymi: pozycje/prereqi/ścieżka → moduły →
		// (dopiero teraz) bank pytań. `curriculum_modules.diagnostic_concept_id`
		// wskazuje na `question_concepts`, więc odwrotna kolejność daje 23503.
		const moje = sql`SELECT id FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`;
		await db.execute(sql`DELETE FROM curriculum_module_prereqs WHERE module_id IN (${moje})`);
		await db.execute(
			sql`DELETE FROM curriculum_module_prereqs WHERE requires_module_id IN (${moje})`,
		);
		await db.execute(sql`DELETE FROM curriculum_path_modules WHERE path_key = ${PATH_KEY}`);
		await db.execute(sql`DELETE FROM curriculum_module_items WHERE module_id IN (${moje})`);
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(
			sql`DELETE FROM question_items WHERE concept_id IN (SELECT id FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`})`,
		);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`}`);
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_DIAGNOSTIC_ASSESSMENT", "1");
		// `placementDiagnostic` ma przesłankę `masteryGate` (fail-closed w flags.ts) —
		// bez niej flaga jest w env zapalona, a funkcja WYŁĄCZONA.
		vi.stubEnv("FLAG_MASTERY_GATE", "1");
		vi.stubEnv("FLAG_PLACEMENT_DIAGNOSTIC", "1");
		({ db } = await import("@/lib/db"));
		({ POST: completePOST } = await import("../[id]/complete/route"));
		await sprzatnij();

		const [tenant] = await db
			.execute(sql`SELECT id FROM tenants LIMIT 1`)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, 'L6 Kontrakt', ${`${USER}@test.local`}, true, now(), now())`,
		);
		// ⚠ `career_goal: ''` — REALNY stan kroku 4 kreatora (D0). Cel niesie SESJA.
		const [student] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${USER}, ${tenantId}, 'Testowa', 'Informatyka', 4, '')
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		studentId = student.id;

		const conceptIds: Record<string, string> = {
			[`${PREFIX}f1`]: await insertConcept(KONCEPT_F1, KOMPETENCJA_F1),
			[`${PREFIX}pandas`]: await insertConcept(KONCEPT_PANDAS, KOMPETENCJA_PANDAS),
			[`${PREFIX}eda`]: await insertConcept(KONCEPT_EDA, KOMPETENCJA_EDA),
		};

		for (const [i, slug] of DRABINA.entries()) {
			const [row] = await db
				.execute(
					sql`INSERT INTO curriculum_modules (slug, title, diagnostic_concept_id)
					    VALUES (${slug}, ${`Moduł ${slug}`}, ${conceptIds[slug] ?? null})
					    ON CONFLICT (slug) DO UPDATE
					      SET title = EXCLUDED.title, diagnostic_concept_id = EXCLUDED.diagnostic_concept_id
					    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			moduleIds[slug] = row.id;
			await db.execute(
				sql`INSERT INTO curriculum_path_modules (path_key, module_id, position)
				    VALUES (${PATH_KEY}, ${row.id}, ${i + 1})`,
			);
			await db.execute(
				sql`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title)
				    VALUES (${row.id}, ${`${slug}-poz-1`}, 1, 'theory', ${`${slug} pozycja 1`})
				    ON CONFLICT DO NOTHING`,
			);
			await db.execute(sql`DELETE FROM curriculum_module_prereqs WHERE module_id = ${row.id}`);
		}
		for (let i = 1; i < DRABINA.length; i++) {
			await db.execute(
				sql`INSERT INTO curriculum_module_prereqs (module_id, requires_module_id)
				    VALUES (${moduleIds[DRABINA[i]]}, ${moduleIds[DRABINA[i - 1]]})
				    ON CONFLICT DO NOTHING`,
			);
		}
		mockGetSession.mockResolvedValue({ user: { id: USER } });
	});

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (db) await sprzatnij();
	});

	beforeEach(async () => {
		vi.stubEnv("FLAG_MASTERY_GATE", "1");
		vi.stubEnv("FLAG_PLACEMENT_DIAGNOSTIC", "1");
		await db.execute(sql`DELETE FROM curriculum_placements WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
		// KORZEŃ ZALICZONY — bez tego nadpisanie z DECYZJI 3 zamaskowałoby kolejność.
		await db.execute(
			sql`INSERT INTO curriculum_module_progress (student_id, tenant_id, module_id, status, verified_by_method)
			    VALUES (${studentId}, ${tenantId}, ${moduleIds[`${PREFIX}l0-start`]}, 'completed', 'exam')`,
		);
	});

	it("KOLEJNOŚĆ: rekomendacja widzi odblokowania z TEJ diagnozy (moduł otwarty placementem, nie łańcuchem)", async () => {
		const sessionId = await zalozSesje();
		const res = await completePOST(postReq(), ctxFor(sessionId));
		const body = await res.json();

		expect(res.status).toBe(200);
		// Gdyby kontrakt powstał PRZED zapisem, najgłębszym dostępnym byłby `f1`
		// (otwarty łańcuchem po zaliczonym korzeniu) — wynik nadal „sensowny".
		expect(body.placement.recommendation.slug).toBe(`${PREFIX}pandas`);
		expect(body.placement.recommendation.title).toBe(`Moduł ${PREFIX}pandas`);
		// [DOPISANE PRZY L6 — Jack] Rekomendacja to NIE korzeń (korzeń jest zaliczony),
		// więc ekran ma dać krótkie „Zacznij od {tytuł}.", a nie pełne zdanie o
		// środowisku pracy z §8. Bez tej asercji nowe pole kontraktu nie ma pinu:
		// odwrócenie go zmienia zdanie na ekranie i żaden istniejący test tego nie widzi.
		expect(body.placement.recommendationIsRoot).toBe(false);
	});

	it("BLOK 2: niesie tytuły, nie slugi — dokładnie moduły otwarte diagnozą", async () => {
		const sessionId = await zalozSesje();
		const body = await (await completePOST(postReq(), ctxFor(sessionId))).json();
		expect(body.placement.unlockedByDiagnosis.map((m: { slug: string }) => m.slug)).toEqual([
			`${PREFIX}f1`,
			`${PREFIX}f2`,
			`${PREFIX}pandas`,
		]);
		for (const m of body.placement.unlockedByDiagnosis) {
			expect(m.title).toBe(`Moduł ${m.slug}`);
		}
	});

	it("BLOK 2b: dziura przychodzi jako KOMPLET (tytuł + nazwa kompetencji + powód)", async () => {
		const sessionId = await zalozSesje();
		const body = await (await completePOST(postReq(), ctxFor(sessionId))).json();
		expect(body.placement.hole).toEqual({
			moduleTitle: `Moduł ${PREFIX}eda`,
			// Nazwa Z `question_concepts.competency_name` — tej samej kolumny, która
			// karmi plan diagnozy (C6). Zbudowanie jej z innego źródła = cichy rozjazd.
			competencyName: KOMPETENCJA_EDA,
			reason: "below_threshold",
		});
	});

	it("BLOK 1: dorobek studenta to stan DRABINY (zaliczony korzeń), nie werdykt placementu", async () => {
		const sessionId = await zalozSesje();
		const body = await (await completePOST(postReq(), ctxFor(sessionId))).json();
		expect(body.placement.completedModules).toEqual([
			{ slug: `${PREFIX}l0-start`, title: `Moduł ${PREFIX}l0-start` },
		]);
	});

	it("D8: drabina niesie 'openedByPlacementEver' i ZACHOWUJE je po zaliczeniu modułu", async () => {
		const sessionId = await zalozSesje();
		await completePOST(postReq(), ctxFor(sessionId));
		const { getLadder } = await import("@/lib/curriculum/ladder");

		const przed = await getLadder(studentId, PATH_KEY);
		expect(przed.find((m) => m.slug === `${PREFIX}pandas`)?.openedByPlacementEver).toBe(true);
		expect(przed.find((m) => m.slug === `${PREFIX}eda`)?.openedByPlacementEver).toBe(false);

		// Student zalicza moduł otwarty diagnozą. Wiersz placementu jest niezmienny
		// i NIE znika — pole zostaje `true`, a warunek „czy pokazać odznakę" należy
		// do widoku (`openedByPlacementEver && status !== 'completed'`).
		await db.execute(
			sql`INSERT INTO curriculum_module_progress (student_id, tenant_id, module_id, status, verified_by_method)
			    VALUES (${studentId}, ${tenantId}, ${moduleIds[`${PREFIX}pandas`]}, 'completed', 'test_out')`,
		);
		const po = await getLadder(studentId, PATH_KEY);
		const pandas = po.find((m) => m.slug === `${PREFIX}pandas`);
		expect(pandas?.status).toBe("completed");
		expect(pandas?.openedByPlacementEver).toBe(true);
	});

	// ─── W1 (Leo) — gałąź `recommendationIsRoot === true` ──────────────────────
	// Pole rozstrzyga, KTÓRY tekst §8 zobaczy student: pełne zdanie o środowisku
	// pracy (korzeń) albo krótkie „Zacznij od…". Miało pokrycie wyłącznie dla
	// `false`, więc mutacja `position === 1` → `position === 0` przechodziła przez
	// 228 plików i 2399 testów. Trafia w NAJCZĘSTSZĄ personę pilotażu: nowy student
	// bez zaliczeń dostaje rekomendację korzenia.
	it("W1: korzeń NIEZALICZONY → rekomendacja to korzeń i recommendationIsRoot === true", async () => {
		// Zdejmujemy zaliczenie korzenia z beforeEach — to jest stan nowego studenta.
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
		const sessionId = await zalozSesje();
		const body = await (await completePOST(postReq(), ctxFor(sessionId))).json();

		expect(body.placement.recommendation.slug).toBe(`${PREFIX}l0-start`);
		expect(body.placement.recommendationIsRoot).toBe(true);
		// Kontrola dodatnia dla samej asercji: przy zaliczonym korzeniu (beforeEach)
		// to samo pole jest `false` — pilnuje tego test „KOLEJNOŚĆ" niżej w tym pliku.
	});

	// ─── W3 (Leo) — bramka parytetu ścieżek ────────────────────────────────────
	// Mutacja `if (false)` przeżywała komplet testów, bo żaden jej nie dotykał.
	// Scenariusz realny: drabina w bazie zmieniona między zapisem a odczytem
	// (przepięcie modułu, ingest, wyścig z ceremonią) — wtedy ekran opowiadałby
	// o innej drabinie niż ta, do której zapisano wiersze.
	it("W3: werdykt z INNEJ drabiny niż wczytana → kontrakt zwraca null i zostawia wpis w dzienniku", async () => {
		const sessionId = await zalozSesje();
		const { recordPlacementOnDiagnosisComplete } = await import(
			"@/lib/curriculum/placement-service"
		);
		const { buildPlacementScreenContract } = await import("@/lib/curriculum/placement-screen");

		const diagnoza = {
			concepts: {
				[KONCEPT_F1]: { asked: 2, correct: 2, level: 4 },
				[KONCEPT_PANDAS]: { asked: 2, correct: 2, level: 4 },
				[KONCEPT_EDA]: { asked: 2, correct: 0, level: 1 },
			},
			uncovered: [],
		};
		const write = await recordPlacementOnDiagnosisComplete(
			{ id: studentId, tenantId, careerGoal: CEL },
			sessionId,
			diagnoza as never,
		);
		expect(write).not.toBeNull();

		// Kontrola dodatnia: nietknięty werdykt daje kontrakt (bramka nie tnie wszystkiego).
		mockLogError.mockClear();
		const zdrowy = await buildPlacementScreenContract({ studentId, write: write as never });
		expect(zdrowy).not.toBeNull();
		expect(mockLogError).not.toHaveBeenCalled();

		// Rozjazd: werdykt twierdzi, że jego drabina ma inny korzeń niż wczytana.
		const rozjechany = {
			...(write as object),
			outcome: { ...(write as { outcome: object }).outcome, rootSlug: `${PREFIX}nie-ten-korzen` },
		};
		const wynik = await buildPlacementScreenContract({ studentId, write: rozjechany as never });
		expect(wynik).toBeNull();
		expect(mockLogError).toHaveBeenCalledWith(
			"curriculum.placement.screen",
			expect.any(Error),
			expect.objectContaining({ studentId, verdictRoot: `${PREFIX}nie-ten-korzen` }),
		);
	});

	it("FLAGA OFF: klucz `placement` NIE ISTNIEJE, a odpowiedź jest identyczna jak przed L6", async () => {
		vi.stubEnv("FLAG_PLACEMENT_DIAGNOSTIC", "0");
		const sessionId = await zalozSesje();
		const body = await (await completePOST(postReq(), ctxFor(sessionId))).json();
		expect(Object.hasOwn(body, "placement")).toBe(false);
		expect(Object.keys(body).sort()).toEqual(["completed", "result", "updatedCompetencies"]);
		// I ani jednego wiersza placementu — bramka zwiera przed hookiem.
		const { rows } = await db.execute(
			sql`SELECT count(*)::int AS c FROM curriculum_placements WHERE student_id = ${studentId}`,
		);
		expect(rows[0].c).toBe(0);
	});
});
