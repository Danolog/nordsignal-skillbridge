// @vitest-environment node
//
// 1E.7 (D0 — BLOKER ZAPŁONU) — ŹRÓDŁO CELU KARIERY dla hooka placementu,
// na realnej bazie (:5433, nie prod NEON, nie atrapy).
//
// Sedno defektu: hook brał cel z WIERSZA STUDENTA, a wiersz w chwili domknięcia
// diagnozy trzyma placeholder `career_goal: ""` (Krok 0 kreatora zakłada go jako
// `NOT NULL`, właściwy cel zapisuje dopiero `POST /api/onboarding` PO diagnozie).
// Łańcuch pusty jest fałszywy → `pathKey = null` → hak wychodził cicho: zero
// wierszy, zero zdarzenia miernika, pusty ekran L6 dla KAŻDEGO nowego studenta.
//
// Dlaczego suita świeciła zielono mimo produkcyjnej awarii: jedyny test bramki
// (`assessment-complete-placement-gating.test.ts:50`) sadza studenta z gotowym
// `careerGoal: "Data Scientist"` w wierszu — czyli w stanie, którego pilotażowy
// student W TYM MOMENCIE PRZEPŁYWU NIE MA. Ten plik testuje stan REALNY.
//
// Rozstrzygnięcie produktowe Sophii (§13 D0): placement liczy się dla celu,
// DLA KTÓREGO STUDENT ODBYŁ DIAGNOZĘ — źródłem jest `assessment_sessions
// .career_goal` tej sesji; wiersz studenta co najwyżej jako źródło ZAPASOWE.
//
// Co dowodzimy:
//  1. wiersz pusty + cel na sesji → placement SIĘ LICZY (wariant „nowy student"),
//  2. wiersz z celem NIEAKTUALNYM + inny cel na sesji → liczy się cel z SESJI
//     (wariant „zmiana kierunku"; wiersze są niezmienne, więc policzenie na
//     cudzej drabinie zostałoby na stałe),
//  3. brak celu po obu stronach ZOSTAWIA ŚLAD i jest w dzienniku ODRÓŻNIALNY
//     od celu spoza pilotażu DS (warunek kontrolny Sophii: pierwsze to defekt,
//     drugie to poprawne zachowanie — dziś oba wyglądały jak cisza),
//  4. zgodność wstecz: sesja bez celu → wiersz studenta jako źródło zapasowe.
//
// Ścieżka `data-science` jest tu PRAWDZIWA (przez `pathKeyForCareerGoal`,
// bez atrap) — test PRZEJMUJE ją w bazie testowej wzorcem
// `curriculum.integration.test.ts` (delete + reinsert w `beforeAll`).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`.

import { sql } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlacementDiagnosis } from "../placement";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-1e7-d0-cel";
const PREFIX = "d0h-";
/** Ścieżka REALNA — dokładnie ta, którą zwraca `pathKeyForCareerGoal`. */
const PATH_KEY = "data-science";
/** Cel REALNY — jedyny wpis mapy ścieżek (pilotaż ADR-014 D10). */
const CEL_DS = "Data Scientist";
/** Cel poprawny, ale spoza pilotażu — curriculum nie ma dla niego drabiny. */
const CEL_SPOZA_PILOTAZU = "Frontend Developer";
const KOMPETENCJA_PYTHON = "D0H Python";

/**
 * PRZESŁONIĘCIE JEDYNEGO NOŚNIKA PRECEDENCJI — narzędzie testów delegacji.
 *
 * Domyślnie `null`: atrapa przepuszcza wywołanie do PRAWDZIWEJ implementacji,
 * więc wszystkie pozostałe testy w tym pliku sprawdzają realne zachowanie.
 * Testy delegacji podstawiają odpowiedź, której PRAWDZIWA reguła nigdy by nie
 * dała — jeśli hook ma własną, prywatną precedencję, zignoruje podstawioną
 * odpowiedź i test poczerwienieje. Zwykły test zachowania tego nie złapie:
 * dwie kopie reguły dają dziś ten sam wynik i właśnie dlatego ich rozjazd
 * byłby bezobjawowy.
 */
const { przesloniecie } = vi.hoisted(() => ({
	przesloniecie: {
		fn: null as
			| null
			| ((p: {
					sessionCareerGoal: string | null | undefined;
					studentCareerGoal: string | null | undefined;
			  }) => { pathKey: string | null; goalSource: "session" | "student_row" | "none" }),
	},
}));

vi.mock("../path-key", async (importOriginal) => {
	const oryginal = await importOriginal<typeof import("../path-key")>();
	return {
		...oryginal,
		resolveDiagnosisPathKey: (p: {
			sessionCareerGoal: string | null | undefined;
			studentCareerGoal: string | null | undefined;
		}) => przesloniecie.fn?.(p) ?? oryginal.resolveDiagnosisPathKey(p),
	};
});

/** `result_json` z mapy slug konceptu → poziom (pominięty slug = brak pomiaru). */
function diagnoza(levels: Record<string, 1 | 2 | 3 | 4>): PlacementDiagnosis {
	const concepts: PlacementDiagnosis["concepts"] = {};
	for (const [slug, level] of Object.entries(levels)) {
		concepts[slug] = { asked: 2, correct: level >= 3 ? 2 : 0, level };
	}
	return { concepts, uncovered: [] };
}

dBack("1E.7 D0 · źródło celu kariery dla hooka placementu (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let recordPlacementOnDiagnosisComplete: typeof import("../placement-service").recordPlacementOnDiagnosisComplete;

	let tenantId = "";
	let studentId = "";
	/** Drugi, REALNY student — do dowodu granicy najemcy na odczycie sesji. */
	let OBCY_STUDENT_ID = "";

	/** Drabina: korzeń (bez tagu) → f1 (tag) → f2 (bez tagu, jedzie prefiksem). */
	const DRABINA: Array<{ slug: string; position: number; tag: string | null }> = [
		{ slug: `${PREFIX}l0-start`, position: 1, tag: null },
		{ slug: `${PREFIX}f1-python`, position: 2, tag: `${PREFIX}ds-python` },
		{ slug: `${PREFIX}f2-python-2`, position: 3, tag: null },
	];

	/**
	 * Sesja diagnozy z celem DOKŁADNIE takim, jaki podał kreator (albo bez celu —
	 * sesja sprzed 1E.7). `career_goal` jest `NULL`-owalne z projektu.
	 */
	async function nowaSesja(hash: string, careerGoal: string | null): Promise<string> {
		const [s] = await db
			.execute(
				sql`INSERT INTO assessment_sessions
				      (student_id, tenant_id, kind, career_goal, input_hash, status, plan_json,
				       result_json, completed_at)
				    VALUES (${studentId}, ${tenantId}, 'diagnostic', ${careerGoal}, ${hash}, 'completed',
				            '{"schemaVersion":1,"kind":"diagnostic","competencies":[],"uncovered":[]}'::jsonb,
				            '{"competencies":{},"concepts":{},"uncovered":[]}'::jsonb, now())
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		return s.id;
	}

	async function slugiOdblokowane(): Promise<string[]> {
		return db
			.execute(
				sql`SELECT m.slug AS module_slug
				    FROM curriculum_placements p
				    JOIN curriculum_modules m ON m.id = p.module_id
				    WHERE p.student_id = ${studentId}
				    ORDER BY m.slug`,
			)
			.then((r: { rows: { module_slug: string }[] }) => r.rows.map((x) => x.module_slug));
	}

	/**
	 * Student w stanie REALNEGO kroku 4 kreatora: wiersz z placeholderem `""`.
	 * To jest persona pilotażu — nie student z gotowym celem w wierszu.
	 */
	function studentKrok4(careerGoal: string | null = "") {
		return { id: studentId, tenantId, careerGoal };
	}

	/**
	 * Zdarzenia `curriculum.placement.skipped` DLA JEDNEJ sesji, najstarsze pierwsze.
	 * `audit_log` jest append-only (wyzwalacz odrzuca DELETE), więc zawężamy po
	 * sesji zamiast czyścić tabelę między testami.
	 */
	async function zdarzeniaPominiecia(dlaSesji: string): Promise<Array<Record<string, unknown>>> {
		return db
			.execute(
				sql`SELECT action, actor_type, actor_id, target_type, target_id, metadata
				    FROM audit_log
				    WHERE action = 'curriculum.placement.skipped' AND target_id = ${dlaSesji}
				    ORDER BY created_at ASC`,
			)
			.then((r: { rows: Record<string, unknown>[] }) => r.rows);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		({ recordPlacementOnDiagnosisComplete } = await import("../placement-service"));

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e7-d0', 'Tenant 1E.7 D0')
				    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, ${USER}, ${`${USER}@test.local`}, true, now(), now())
			    ON CONFLICT (id) DO NOTHING`,
		);
		// W BAZIE cel też pusty — dokładnie to, co zakłada Krok 0 kreatora.
		const [student] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${USER}, ${tenantId}, 'Test U', 'Informatyka', 3, '')
				    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, career_goal = ''
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		studentId = student.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${`${USER}-obcy`}, ${`${USER}-obcy`}, ${`${USER}-obcy@test.local`}, true, now(), now())
			    ON CONFLICT (id) DO NOTHING`,
		);
		const [obcy] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${`${USER}-obcy`}, ${tenantId}, 'Test U', 'Informatyka', 3, '')
				    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		OBCY_STUDENT_ID = obcy.id;

		const [koncept] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk, competency_name, diagnostic)
				    VALUES (${`${PREFIX}ds-python`}, ${`${PREFIX}ds-python`}, 'market',
				            ${KOMPETENCJA_PYTHON}, true)
				    ON CONFLICT (slug) DO UPDATE SET competency_name = EXCLUDED.competency_name
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);

		// PRZEJĘCIE ścieżki 'data-science' w bazie TESTOWEJ (wzorzec
		// curriculum.integration.test.ts): delete + reinsert własnej drabiny.
		// Pliki integracyjne biegną sekwencyjnie, a każdy odbudowuje swoje w beforeAll.
		await db.execute(sql`DELETE FROM curriculum_path_modules WHERE path_key = ${PATH_KEY}`);
		for (const m of DRABINA) {
			const tagId = m.tag ? koncept.id : null;
			const [row] = await db
				.execute(
					sql`INSERT INTO curriculum_modules (slug, title, diagnostic_concept_id)
					    VALUES (${m.slug}, ${m.slug}, ${tagId})
					    ON CONFLICT (slug) DO UPDATE SET diagnostic_concept_id = EXCLUDED.diagnostic_concept_id
					    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			await db.execute(
				sql`INSERT INTO curriculum_path_modules (path_key, module_id, position)
				    VALUES (${PATH_KEY}, ${row.id}, ${m.position})`,
			);
		}
	});

	beforeEach(async () => {
		await db.execute(sql`DELETE FROM curriculum_placements WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id = ${studentId}`);
	});

	afterEach(() => {
		przesloniecie.fn = null;
		vi.restoreAllMocks();
	});

	// ─── 0. JEDNOŚĆ NOŚNIKA REGUŁY — hook DELEGUJE, nie ma własnej kopii ───────
	it("delegacja: hook honoruje ŚCIEŻKĘ z `resolveDiagnosisPathKey`, nie własną regułę", async () => {
		// Wejście, dla którego PRAWDZIWA reguła daje `pathKey: null` (żadnego celu
		// po obu stronach). Podstawiony nośnik mówi co innego — i to on ma rządzić.
		const sessionId = await nowaSesja("h-d0-13", null);
		przesloniecie.fn = () => ({ pathKey: PATH_KEY, goalSource: "session" });

		const wynik = await recordPlacementOnDiagnosisComplete(
			studentKrok4(""),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		// Prywatna precedencja w hooku zwróciłaby tu `null` (brak celu) i test padnie.
		expect(wynik?.written).toBe(1);
		expect(await slugiOdblokowane()).toEqual([`${PREFIX}f1-python`]);
	});

	it("delegacja: hook honoruje ŹRÓDŁO CELU z helpera — także w kodzie powodu", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		// Znów: po obu stronach pusto, więc prawdziwa reguła powiedziałaby
		// `goalSource: "none"` → powód `missing_career_goal`. Nośnik mówi
		// „student_row", więc powód MUSI być `unmapped_career_goal`.
		const sessionId = await nowaSesja("h-d0-14", null);
		przesloniecie.fn = () => ({ pathKey: null, goalSource: "student_row" });

		await recordPlacementOnDiagnosisComplete(
			studentKrok4(""),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		// Gdyby hook liczył źródło u siebie, dostalibyśmy 'none'/'missing_career_goal'.
		// To pina, że `goalSource` NIE jest drugą, cichą połową reguły w tym pliku.
		const [zd] = await zdarzeniaPominiecia(sessionId);
		expect(zd.metadata).toEqual({ reason: "unmapped_career_goal", goalSource: "student_row" });
	});

	// ─── 1. Wariant „nowy student" — TEN test przepuścił defekt D0 ─────────────
	it("wiersz studenta PUSTY, cel na sesji → placement SIĘ LICZY (defekt D0)", async () => {
		const sessionId = await nowaSesja("h-d0-1", CEL_DS);

		const wynik = await recordPlacementOnDiagnosisComplete(
			// Stan realnego kroku 4: `careerGoal: ""` — placeholder, nie wybór.
			studentKrok4(""),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		// PRZED poprawką: `student.careerGoal ? … : null` → null → cichy `return null`.
		expect(wynik).not.toBeNull();
		// f2 (bez tagu) NIE jedzie — prefiks kończy się na ostatnim module
		// z dowodem, a za f1 nie ma już żadnego kwalifikującego pomiaru.
		expect(wynik?.unlockedSlugs).toEqual([`${PREFIX}f1-python`]);
		expect(wynik?.written).toBe(1);
		expect(await slugiOdblokowane()).toEqual([`${PREFIX}f1-python`]);
	});

	it("sam biały znak jest BRAKIEM celu po OBU stronach (`'   '` to nie cel)", async () => {
		const ostrzezenia = vi.spyOn(console, "warn").mockImplementation(() => {});
		// Spacja jest PRAWDZIWA jako łańcuch, więc `goal ? … : null` wpuściłoby ją
		// jako cel: `pathKeyForCareerGoal("   ")` dałoby null i hak wyszedłby jako
		// „cel spoza pilotażu" — czyli defekt PRZEBRANY za poprawne zachowanie.
		const sessionId = await nowaSesja("h-d0-2", "   ");
		const wynik = await recordPlacementOnDiagnosisComplete(
			studentKrok4("   "),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);
		expect(wynik).toBeNull();
		expect(ostrzezenia).toHaveBeenCalledWith(
			"[curriculum.placement.skipped]",
			expect.objectContaining({ reason: "missing_career_goal", goalSource: "none" }),
		);
	});

	it("biały znak NA SESJI nie wygrywa z prawdziwym celem w wierszu (spada na zapas)", async () => {
		const sessionId = await nowaSesja("h-d0-2b", "   ");
		const wynik = await recordPlacementOnDiagnosisComplete(
			studentKrok4(CEL_DS),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);
		// Prymat sesji dotyczy sesji z CELEM. Sesja z samą spacją nie ma celu,
		// więc źródło zapasowe wchodzi normalnie — inaczej pusta sesja kasowałaby
		// jedyną prawdziwą informację, jaką mamy.
		expect(wynik?.written).toBe(1);
	});

	// ─── 2. Wariant „zmiana kierunku" — cel z SESJI wygrywa z wierszem ─────────
	it("wiersz z celem NIEAKTUALNYM, sesja z celem DS → liczy się cel z SESJI", async () => {
		const sessionId = await nowaSesja("h-d0-3", CEL_DS);

		const wynik = await recordPlacementOnDiagnosisComplete(
			// Student zmienił kierunek: wiersz trzyma STARY cel, diagnozę odbył pod nowy.
			studentKrok4(CEL_SPOZA_PILOTAZU),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		// Wiersze placementu są NIEZMIENNE (ON CONFLICT DO NOTHING + wyzwalacz),
		// więc policzenie na cudzej drabinie zostałoby na stałe. Cel sesji to
		// jedyne miejsce, gdzie para (cel, pomiar) jest związana w chwili pomiaru.
		expect(wynik?.unlockedSlugs).toEqual([`${PREFIX}f1-python`]);
		expect(await slugiOdblokowane()).toEqual([`${PREFIX}f1-python`]);
	});

	it("sesja z celem SPOZA pilotażu wygrywa z wierszem DS → placement NIE liczy się", async () => {
		// Kontrola negatywna do testu wyżej: gdyby cel nadal szedł z wiersza,
		// student z 'Data Scientist' w wierszu dostałby odblokowania mimo diagnozy
		// odbytej pod inny cel. Prymat sesji musi działać w OBIE strony.
		const sessionId = await nowaSesja("h-d0-4", CEL_SPOZA_PILOTAZU);
		const wynik = await recordPlacementOnDiagnosisComplete(
			studentKrok4(CEL_DS),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);
		expect(wynik).toBeNull();
		expect(await slugiOdblokowane()).toEqual([]);
	});

	// ─── 3. Warunek kontrolny Sophii — ŚLAD zamiast cichego `return null` ──────
	it("brak celu po OBU stronach → ślad 'missing_career_goal' (defekt), nie cisza", async () => {
		const ostrzezenia = vi.spyOn(console, "warn").mockImplementation(() => {});
		const sessionId = await nowaSesja("h-d0-5", null);

		const wynik = await recordPlacementOnDiagnosisComplete(
			studentKrok4(""),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		expect(wynik).toBeNull();
		// W1 (Ryan): ładunek dziennika porównany DOKŁADNIE, nie `objectContaining` —
		// dopisanie `studentId` musi ten test przewrócić. Strumień logów Vercela
		// jest dostępny dla każdego z tokenem projektu (nagłówek `lib/log.ts`),
		// więc surowy identyfikator studenta jest tu GORSZY niż w `audit_log`.
		expect(ostrzezenia).toHaveBeenCalledWith("[curriculum.placement.skipped]", {
			reason: "missing_career_goal",
			goalSource: "none",
			sessionId,
		});
	});

	it("W1: dziennik NIE niesie identyfikatora studenta (żadnym polem, żadną wartością)", async () => {
		const ostrzezenia = vi.spyOn(console, "warn").mockImplementation(() => {});
		const sessionId = await nowaSesja("h-d0-5b", CEL_SPOZA_PILOTAZU);
		await recordPlacementOnDiagnosisComplete(
			studentKrok4(""),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);
		// Sprawdzamy WARTOŚĆ, nie nazwę pola: identyfikator przemycony pod inną
		// nazwą (`actor`, `uid`, cokolwiek) też ma ten test przewrócić.
		expect(JSON.stringify(ostrzezenia.mock.calls)).not.toContain(studentId);
	});

	it("cel SPOZA pilotażu → ślad 'unmapped_career_goal' — INNY powód niż defekt", async () => {
		const ostrzezenia = vi.spyOn(console, "warn").mockImplementation(() => {});
		const sessionId = await nowaSesja("h-d0-6", CEL_SPOZA_PILOTAZU);

		const wynik = await recordPlacementOnDiagnosisComplete(
			studentKrok4(""),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		expect(wynik).toBeNull();
		// SEDNO warunku kontrolnego: „nie znamy celu" (defekt) i „cel spoza
		// pilotażu DS" (poprawne zachowanie) to dwie różne rzeczy, a przed
		// poprawką obie były w danych tą samą ciszą. Kod powodu je rozdziela.
		expect(ostrzezenia).toHaveBeenCalledWith("[curriculum.placement.skipped]", {
			reason: "unmapped_career_goal",
			goalSource: "session",
			sessionId,
		});
	});

	// ─── 3a. W2/W3 — TRWAŁY ślad w `audit_log` (rozstrzygnięcie Ryana v0.1) ────
	it("W2: zdarzenie 'curriculum.placement.skipped' powstaje BEZ actor_id, z sesją jako celem", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const sessionId = await nowaSesja("h-d0-10", null);

		await recordPlacementOnDiagnosisComplete(
			studentKrok4(""),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		const zd = await zdarzeniaPominiecia(sessionId);
		expect(zd.length).toBe(1);
		expect(zd[0]).toMatchObject({
			actor_type: "student",
			actor_id: null,
			target_type: "assessment_session",
			target_id: sessionId,
		});
		// Wiązanie z osobą idzie WYŁĄCZNIE przez sesję, która kaskaduje przy
		// usunięciu konta — po skasowaniu wiersz zostaje sierotą (motyw 26 RODO).
		expect(JSON.stringify(zd[0])).not.toContain(studentId);
	});

	it("W3: `metadata` to DOKŁADNIE dwa kody — bez celu kariery i bez czegokolwiek o wyniku", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		// Sesja bez celu, wiersz z celem spoza pilotażu → źródło zapasowe wchodzi
		// i musi być widoczne w `goalSource` (inaczej nie wiadomo, skąd wzięliśmy cel).
		const sessionId = await nowaSesja("h-d0-11", null);

		await recordPlacementOnDiagnosisComplete(
			studentKrok4(CEL_SPOZA_PILOTAZU),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		const [zd] = await zdarzeniaPominiecia(sessionId);
		// Granica zgody Ryana jest o KSZTAŁCIE, nie o nazwie zdarzenia: „jeśli do
		// metadata miałby trafić napis celu kariery, actorId albo cokolwiek
		// o wyniku studenta — zgoda wygasa". Porównanie DOKŁADNE, nie podzbiór.
		expect(zd.metadata).toEqual({ reason: "unmapped_career_goal", goalSource: "student_row" });
		const wypisane = JSON.stringify(zd);
		expect(wypisane).not.toContain(CEL_SPOZA_PILOTAZU);
		expect(wypisane).not.toContain(studentId);
	});

	it("zdarzenie pominięcia NIE powstaje, gdy placement policzył się normalnie", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const sessionId = await nowaSesja("h-d0-12", CEL_DS);
		await recordPlacementOnDiagnosisComplete(
			studentKrok4(""),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);
		// Bez tego „ślad defektu" byłby stemplem na każdej diagnozie i przestałby
		// cokolwiek znaczyć dla miernika Sophii.
		expect(await zdarzeniaPominiecia(sessionId)).toEqual([]);
	});

	it("ślad NIE niesie celu kariery (dane osobowe zostają poza dziennikiem)", async () => {
		const ostrzezenia = vi.spyOn(console, "warn").mockImplementation(() => {});
		const sessionId = await nowaSesja("h-d0-7", CEL_SPOZA_PILOTAZU);
		await recordPlacementOnDiagnosisComplete(
			studentKrok4(CEL_DS),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);
		// `career_goal` jest w tym repo traktowany jak dane osobowe (nagłówek
		// `lib/log.ts`), a do rozróżnienia dwóch powodów wystarczy kod powodu.
		const wypisane = JSON.stringify(ostrzezenia.mock.calls);
		expect(wypisane).not.toContain(CEL_SPOZA_PILOTAZU);
		expect(wypisane).not.toContain(CEL_DS);
	});

	// ─── 3b. Granica najemcy na NOWYM odczycie (połączenie właściciela) ───────
	it("sesja CUDZEGO studenta nie jest źródłem celu — cel nie przecieka między kontami", async () => {
		const ostrzezenia = vi.spyOn(console, "warn").mockImplementation(() => {});
		// Sesja NALEŻY do studenta A (fixture), a hook wołamy dla studenta B.
		const cudzaSesja = await nowaSesja("h-d0-9", CEL_DS);

		const wynik = await recordPlacementOnDiagnosisComplete(
			{ id: OBCY_STUDENT_ID, tenantId, careerGoal: "" },
			cudzaSesja,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		// Hook czyta `assessment_sessions` POŁĄCZENIEM WŁAŚCICIELA — RLS go nie
		// ogranicza, więc zawężenie po `student_id` jest JEDYNĄ granicą. Bez niego
		// wystarczyłby jeden nowy wołający bez sprawdzenia własności sesji, żeby
		// placement policzył się z cudzego celu.
		expect(wynik).toBeNull();
		expect(ostrzezenia).toHaveBeenCalledWith(
			"[curriculum.placement.skipped]",
			expect.objectContaining({ reason: "missing_career_goal", goalSource: "none" }),
		);
	});

	// ─── 4. Zgodność wstecz — sesja sprzed 1E.7 nie ma celu na sesji ───────────
	it("sesja BEZ celu + wiersz z celem DS → wiersz studenta jako źródło ZAPASOWE", async () => {
		const ostrzezenia = vi.spyOn(console, "warn").mockImplementation(() => {});
		const sessionId = await nowaSesja("h-d0-8", null);

		const wynik = await recordPlacementOnDiagnosisComplete(
			studentKrok4(CEL_DS),
			sessionId,
			diagnoza({ [`${PREFIX}ds-python`]: 4 }),
		);

		// Kolumna `assessment_sessions.career_goal` jest NULL-owalna i sesje
		// sprzed 1E.7 celu nie mają — dla nich wiersz studenta jest jedynym,
		// co mamy. To ŹRÓDŁO ZAPASOWE, nie równorzędne: kolejność sesja → wiersz.
		expect(wynik?.written).toBe(1);
		expect(ostrzezenia).not.toHaveBeenCalled();
	});
});
