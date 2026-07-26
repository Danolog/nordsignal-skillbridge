// @vitest-environment node
//
// 1E.7 (SLICE L3) — warstwa serwisowa placementu NA REALNEJ BAZIE (:5433, nie
// prod NEON, nie atrapy). Sedno: most uuid → slug jest wykonywany SQL-em, więc
// atrapa bazy świeciłaby zielono dokładnie tam, gdzie funkcja pęka.
//
// Co dowodzimy:
//  • ZAPIS PEŁNEGO WERDYKTU (wymóg produktowy Sophii v0.3, blokujący): wiersz
//    niesie concept_slug, level, threshold, reason, support_mode,
//    blocking_hole_slug i id sesji — nie samą listę slugów.
//  • WYŁĄCZNIE moduły otwarte (minimalizacja art. 5 ust. 1 lit. c).
//  • MONOTONICZNOŚĆ (§6b): druga diagnoza DOKŁADA moduły i NIE przepisuje
//    powodu pierwszego otwarcia (ON CONFLICT DO NOTHING).
//  • C1 (Leo): tag o kształcie UUID PRZERYWA błędem zamiast po cichu dać
//    całej drabinie „brak pomiaru".
//  • C6 (Leo): `competencyName` z `question_concepts.competency_name` — bez
//    niej powód `uncovered` degraduje się po cichu do `no_measurement`.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0045).

import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PlacementDiagnosis } from "../placement";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-1e7-serwis";
const PREFIX = "l3s-";
const PATH_KEY = "l3s-sciezka-testowa";
const KOMPETENCJA_PYTHON = "L3S Python";
const KOMPETENCJA_PANDAS = "L3S Pandas";
const KOMPETENCJA_EDA = "L3S EDA";

/** `result_json` z mapy slug konceptu → poziom (pominięty slug = brak pomiaru). */
function diagnoza(
	levels: Record<string, 1 | 2 | 3 | 4>,
	uncovered: string[] = [],
): PlacementDiagnosis {
	const concepts: PlacementDiagnosis["concepts"] = {};
	for (const [slug, level] of Object.entries(levels)) {
		concepts[slug] = { asked: 2, correct: level >= 3 ? 2 : 0, level };
	}
	return { concepts, uncovered };
}

dBack("1E.7 L3 · placement-service: most uuid→slug + zapis werdyktu (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let recordPlacementForDiagnosis: typeof import("../placement-service").recordPlacementForDiagnosis;
	let loadPlacementLadder: typeof import("../placement-service").loadPlacementLadder;
	let PlacementTagResolutionError: typeof import("../placement-service").PlacementTagResolutionError;

	let tenantId = "";
	let studentId = "";
	let sessionId = "";
	let sessionId2 = "";
	const moduleIds: Record<string, string> = {};

	/** Drabina testowa — kształt drabiny DS: korzeń + tag + NULL + tag + tag. */
	const DRABINA: Array<{ slug: string; position: number; tag: string | null }> = [
		{ slug: `${PREFIX}l0-start`, position: 1, tag: null },
		{ slug: `${PREFIX}f1-python`, position: 2, tag: `${PREFIX}ds-python` },
		{ slug: `${PREFIX}f2-python-2`, position: 3, tag: null },
		{ slug: `${PREFIX}m-pandas`, position: 4, tag: `${PREFIX}ds-pandas` },
		{ slug: `${PREFIX}m-eda`, position: 5, tag: `${PREFIX}ds-eda` },
	];

	async function nowaSesja(hash: string): Promise<string> {
		const [s] = await db
			.execute(
				sql`INSERT INTO assessment_sessions
				      (student_id, tenant_id, kind, input_hash, status, plan_json, result_json, completed_at)
				    VALUES (${studentId}, ${tenantId}, 'diagnostic', ${hash}, 'completed',
				            '{"schemaVersion":1,"kind":"diagnostic","competencies":[],"uncovered":[]}'::jsonb,
				            '{"competencies":{},"concepts":{},"uncovered":[]}'::jsonb, now())
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		return s.id;
	}

	async function wiersze() {
		return db
			.execute(
				sql`SELECT m.slug AS module_slug, p.concept_slug, p.level, p.threshold, p.reason,
				           p.support_mode, p.blocking_hole_slug, p.assessment_session_id
				    FROM curriculum_placements p
				    JOIN curriculum_modules m ON m.id = p.module_id
				    WHERE p.student_id = ${studentId}
				    ORDER BY m.slug`,
			)
			.then((r: { rows: Record<string, unknown>[] }) => r.rows);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		({ recordPlacementForDiagnosis, loadPlacementLadder, PlacementTagResolutionError } =
			await import("../placement-service"));

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e7-serwis', 'Tenant 1E.7 serwis')
				    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, ${USER}, ${`${USER}@test.local`}, true, now(), now())
			    ON CONFLICT (id) DO NOTHING`,
		);
		const [student] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${USER}, ${tenantId}, 'Test U', 'Informatyka', 3, 'Data Scientist')
				    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		studentId = student.id;

		// Koncepty rynkowe (trunk='market' wymaga competency_name — CHECK 0030).
		const koncepty: Array<[string, string]> = [
			[`${PREFIX}ds-python`, KOMPETENCJA_PYTHON],
			[`${PREFIX}ds-pandas`, KOMPETENCJA_PANDAS],
			[`${PREFIX}ds-eda`, KOMPETENCJA_EDA],
		];
		const conceptIds: Record<string, string> = {};
		for (const [slug, competencyName] of koncepty) {
			const [c] = await db
				.execute(
					sql`INSERT INTO question_concepts (slug, name, trunk, competency_name, diagnostic)
					    VALUES (${slug}, ${slug}, 'market', ${competencyName}, true)
					    ON CONFLICT (slug) DO UPDATE SET competency_name = EXCLUDED.competency_name
					    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			conceptIds[slug] = c.id;
		}

		// Drabina: moduły + tag diagnostyczny (uuid!) + przypisanie do ścieżki.
		await db.execute(sql`DELETE FROM curriculum_path_modules WHERE path_key = ${PATH_KEY}`);
		for (const m of DRABINA) {
			const tagId = m.tag ? conceptIds[m.tag] : null;
			const [row] = await db
				.execute(
					sql`INSERT INTO curriculum_modules (slug, title, diagnostic_concept_id)
					    VALUES (${m.slug}, ${m.slug}, ${tagId})
					    ON CONFLICT (slug) DO UPDATE SET diagnostic_concept_id = EXCLUDED.diagnostic_concept_id
					    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			moduleIds[m.slug] = row.id;
			await db.execute(
				sql`INSERT INTO curriculum_path_modules (path_key, module_id, position)
				    VALUES (${PATH_KEY}, ${row.id}, ${m.position})`,
			);
		}
	});

	beforeEach(async () => {
		await db.execute(sql`DELETE FROM curriculum_placements WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id = ${studentId}`);
		sessionId = await nowaSesja("h-1");
		sessionId2 = await nowaSesja("h-2");
	});

	// ─── 1. Most uuid → slug DZIAŁA (bez niego wszystko byłoby 'no_measurement') ─
	it("rozwiązuje tag uuid → slug konceptu i odblokowuje prefiks", async () => {
		const wynik = await recordPlacementForDiagnosis({
			studentId,
			tenantId,
			assessmentSessionId: sessionId,
			pathKey: PATH_KEY,
			// python=4, pandas=3 → prefiks do m-pandas; eda=1 ucina dalej.
			diagnosis: diagnoza({
				[`${PREFIX}ds-python`]: 4,
				[`${PREFIX}ds-pandas`]: 3,
				[`${PREFIX}ds-eda`]: 1,
			}),
		});

		expect(wynik.unlockedSlugs).toEqual([
			`${PREFIX}f1-python`,
			`${PREFIX}f2-python-2`,
			`${PREFIX}m-pandas`,
		]);
		expect(wynik.written).toBe(3);
	});

	it("zapisuje PEŁNY WERDYKT per moduł, nie samą listę slugów (wymóg Sophii v0.3)", async () => {
		await recordPlacementForDiagnosis({
			studentId,
			tenantId,
			assessmentSessionId: sessionId,
			pathKey: PATH_KEY,
			diagnosis: diagnoza({
				[`${PREFIX}ds-python`]: 4,
				[`${PREFIX}ds-pandas`]: 3,
				[`${PREFIX}ds-eda`]: 1,
			}),
		});

		const rows = await wiersze();
		expect(rows).toEqual([
			{
				module_slug: `${PREFIX}f1-python`,
				concept_slug: `${PREFIX}ds-python`,
				level: 4,
				threshold: 3,
				reason: "qualified",
				// poziom POWYŻEJ progu → wygaszane wsparcie
				support_mode: "fading",
				blocking_hole_slug: `${PREFIX}m-eda`,
				assessment_session_id: sessionId,
			},
			{
				module_slug: `${PREFIX}f2-python-2`,
				// moduł bez tagu wciągnięty prefiksem: brak własnego pomiaru,
				// dowód wyłącznie pośredni → pełne wsparcie
				concept_slug: null,
				level: null,
				threshold: 3,
				reason: "carried_untagged",
				support_mode: "full",
				blocking_hole_slug: `${PREFIX}m-eda`,
				assessment_session_id: sessionId,
			},
			{
				module_slug: `${PREFIX}m-pandas`,
				concept_slug: `${PREFIX}ds-pandas`,
				level: 3,
				threshold: 3,
				reason: "qualified",
				// poziom RÓWNY progowi = moduł graniczny → pełne wsparcie
				support_mode: "full",
				blocking_hole_slug: `${PREFIX}m-eda`,
				assessment_session_id: sessionId,
			},
		]);
	});

	it("zapisuje WYŁĄCZNIE moduły otwarte — korzeń i moduły za dziurą bez wiersza", async () => {
		await recordPlacementForDiagnosis({
			studentId,
			tenantId,
			assessmentSessionId: sessionId,
			pathKey: PATH_KEY,
			diagnosis: diagnoza({
				[`${PREFIX}ds-python`]: 4,
				[`${PREFIX}ds-pandas`]: 3,
				[`${PREFIX}ds-eda`]: 1,
			}),
		});
		const slugi = (await wiersze()).map((r: Record<string, unknown>) => r.module_slug);
		// Minimalizacja: ani korzeń (dostępny zawsze), ani m-eda (student wypadł
		// tam słabo) nie zostawiają śladu w nośniku uprawnienia.
		expect(slugi).not.toContain(`${PREFIX}l0-start`);
		expect(slugi).not.toContain(`${PREFIX}m-eda`);
	});

	it("diagnoza bez ani jednego kwalifikującego pomiaru → zero wierszy", async () => {
		const wynik = await recordPlacementForDiagnosis({
			studentId,
			tenantId,
			assessmentSessionId: sessionId,
			pathKey: PATH_KEY,
			diagnosis: diagnoza({ [`${PREFIX}ds-python`]: 2 }),
		});
		expect(wynik.written).toBe(0);
		expect(await wiersze()).toEqual([]);
	});

	it("ścieżka bez drabiny (cel kariery spoza pilotażu) → zero wierszy, bez błędu", async () => {
		const wynik = await recordPlacementForDiagnosis({
			studentId,
			tenantId,
			assessmentSessionId: sessionId,
			pathKey: "sciezka-ktorej-nie-ma",
			diagnosis: diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		});
		expect(wynik).toMatchObject({ written: 0, unlockedSlugs: [] });
	});

	// ─── 2. Monotoniczność (§6b) — druga diagnoza DOKŁADA, nie przepisuje ──────
	it("druga diagnoza DOKŁADA moduły i NIE przepisuje powodu pierwszego otwarcia", async () => {
		await recordPlacementForDiagnosis({
			studentId,
			tenantId,
			assessmentSessionId: sessionId,
			pathKey: PATH_KEY,
			diagnosis: diagnoza({
				[`${PREFIX}ds-python`]: 3,
				[`${PREFIX}ds-pandas`]: 3,
				[`${PREFIX}ds-eda`]: 1,
			}),
		});
		const przed = await wiersze();

		// Re-onboarding: TA SAMA drabina, lepszy wynik, INNY próg.
		const drugi = await recordPlacementForDiagnosis({
			studentId,
			tenantId,
			assessmentSessionId: sessionId2,
			pathKey: PATH_KEY,
			diagnosis: diagnoza({
				[`${PREFIX}ds-python`]: 4,
				[`${PREFIX}ds-pandas`]: 4,
				[`${PREFIX}ds-eda`]: 4,
			}),
			threshold: 4,
		});

		// Dołożony DOKŁADNIE jeden moduł (m-eda); trzy stare wiersze nietknięte —
		// stary poziom 3, stary próg 3, stara sesja, stare wsparcie.
		expect(drugi.written).toBe(1);
		const po = await wiersze();
		expect(po.length).toBe(4);
		expect(
			po.filter((r: Record<string, unknown>) => r.assessment_session_id === sessionId),
		).toEqual(przed);
		const eda = po.find(
			(r: Record<string, unknown>) => r.module_slug === `${PREFIX}m-eda`,
		) as Record<string, unknown>;
		expect(eda).toMatchObject({
			level: 4,
			threshold: 4,
			reason: "qualified",
			// próg 4 i poziom 4 → moduł graniczny → pełne wsparcie
			support_mode: "full",
			assessment_session_id: sessionId2,
		});
	});

	it("powtórne wywołanie z TYM SAMYM wynikiem → written: 0 (bezpieczny retry trasy)", async () => {
		const args = {
			studentId,
			tenantId,
			assessmentSessionId: sessionId,
			pathKey: PATH_KEY,
			diagnosis: diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		};
		const pierwszy = await recordPlacementForDiagnosis(args);
		const drugi = await recordPlacementForDiagnosis(args);
		expect(pierwszy.written).toBeGreaterThan(0);
		expect(drugi.written).toBe(0);
		expect(drugi.unlockedSlugs).toEqual(pierwszy.unlockedSlugs);
	});

	// ─── 3. C1 — twarda bariera uuid/slug ─────────────────────────────────────
	it("C1: tag rozwiązany do wartości o KSZTAŁCIE UUID → wyjątek, nie cichy 'brak pomiaru'", async () => {
		// Slug konceptu literalnie w kształcie uuid = symulacja pomyłki „podłączyłem
		// kolumnę id zamiast slug". Bez bariery cała drabina dostałaby
		// `no_measurement` i NIKT nie zostałby odblokowany — bez jednego błędu.
		const UDAWANY_UUID = "0f9d4a1e-1111-4111-8111-abcdefabcdef";
		const [c] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk, competency_name, diagnostic)
				    VALUES (${UDAWANY_UUID}, 'koncept-pulapka', 'market', 'L3S Pulapka', true)
				    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		await db.execute(
			sql`UPDATE curriculum_modules SET diagnostic_concept_id = ${c.id}
			    WHERE slug = ${`${PREFIX}m-eda`}`,
		);

		try {
			await expect(loadPlacementLadder(PATH_KEY)).rejects.toBeInstanceOf(
				PlacementTagResolutionError,
			);
			await expect(
				recordPlacementForDiagnosis({
					studentId,
					tenantId,
					assessmentSessionId: sessionId,
					pathKey: PATH_KEY,
					diagnosis: diagnoza({ [`${PREFIX}ds-python`]: 4 }),
				}),
			).rejects.toBeInstanceOf(PlacementTagResolutionError);
			// Awaria bariery jest GŁOŚNA i nic nie zapisuje.
			expect(await wiersze()).toEqual([]);
		} finally {
			const [oryginal] = await db
				.execute(sql`SELECT id FROM question_concepts WHERE slug = ${`${PREFIX}ds-eda`}`)
				.then((r: { rows: { id: string }[] }) => r.rows);
			await db.execute(
				sql`UPDATE curriculum_modules SET diagnostic_concept_id = ${oryginal.id}
				    WHERE slug = ${`${PREFIX}m-eda`}`,
			);
		}
	});

	// ─── 4. C6 — competencyName z tej samej kolumny, która karmi plan diagnozy ──
	it("C6: kompetencja w `uncovered` → powód 'uncovered', nie 'no_measurement'", async () => {
		// `uncovered` niesie NAZWY KOMPETENCJI, a `concepts` — SLUGI KONCEPTÓW.
		// Zestawienie ich wymaga `question_concepts.competency_name` — DOKŁADNIE
		// tej kolumny, która karmiła plan diagnozy. Wzięcie nazwy skądinąd
		// degraduje powód po cichu do 'no_measurement'.
		const wynik = await recordPlacementForDiagnosis({
			studentId,
			tenantId,
			assessmentSessionId: sessionId,
			pathKey: PATH_KEY,
			diagnosis: diagnoza({ [`${PREFIX}ds-python`]: 4 }, [KOMPETENCJA_PANDAS]),
		});

		const pandas = wynik.outcome.modules.find((m) => m.slug === `${PREFIX}m-pandas`);
		const eda = wynik.outcome.modules.find((m) => m.slug === `${PREFIX}m-eda`);
		// Pandas: kompetencji NIE BADALIŚMY (jest w uncovered) → 'uncovered'.
		expect(pandas?.reason).toBe("uncovered");
		// EDA: tag jest, kompetencja badana, ale wyniku brak → 'no_measurement'.
		// Kontrast dowodzi, że rozróżnienie jest ŻYWE, nie przypadkowe.
		expect(eda?.reason).toBe("no_measurement");
	});
});
