// @vitest-environment node
//
// 1E.7 (SLICE L4) — DRABINA HONORUJE PLACEMENT, na realnej bazie (:5433).
//
// Sedno slice'a: moduł z wierszem w `curriculum_placements` jest odblokowany bez
// zaliczonych prerekwizytów. Test dowodzi czterech rzeczy, z których każda ma
// swoją awarię produkcyjną:
//
//  1. FLAGA OFF = ZERO ZMIAN I ZERO DODATKOWEGO RUCHU DO BAZY. Wiersze
//     placementu mogą już istnieć (L3 jest na prodzie), więc „off" musi znaczyć
//     „derywacja jak przed L4", a nie „przypadkiem to samo".
//  2. PARYTET UI ↔ API. `getLadder` (ekran) i `isModuleUnlocked` (403 na trasie)
//     odpowiadają na to samo pytanie w dwóch miejscach. Rozjazd = moduł otwarty
//     na ekranie i 403 przy kliknięciu — najgorszy możliwy pierwszy kontakt
//     z funkcją, która ma studenta ZACHĘCIĆ.
//  3. PREFIKS NIE WYCIEKA O MODUŁ. Moduł na pozycji k+1 ma prerekwizyt OTWARTY
//     placementem (nie zaliczony) i MUSI zostać zablokowany. Naiwne „prereq
//     spełniony, bo poprzedni jest otwarty" przesuwa granicę o moduł i psuje
//     ochronę prefiksową — jedyny mechanizm, który w 1E.7 broni przed głębokim
//     przeskokiem (DECYZJA 5).
//  4. KORZEŃ NIE BLOKUJE DNA. `l0-start` z mocy DECYZJI 3 nigdy nie dostaje
//     wiersza placementu; gdyby prerekwizyt musiał być „zaliczony albo otwarty",
//     pierwszy moduł nie otworzyłby się NIKOMU i funkcja byłaby martwa.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracje 0044/0045).

import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-1e7-l4-drabina";
const PREFIX = "l4d-";
// Fałszywy alarm `generic-api-key` (nazwa stałej z KEY + napis o dużej entropii):
// to slug ścieżki curriculum, rekwizyt testu, nie sekret. Wyciszenie zakresu linii.
const PATH_KEY = "l4d-sciezka-testowa"; // gitleaks:allow

/** Drabina: korzeń → f1 → f2 → pandas → eda, prereq zawsze „poprzedni moduł". */
const DRABINA = [
	`${PREFIX}l0-start`,
	`${PREFIX}f1`,
	`${PREFIX}f2`,
	`${PREFIX}pandas`,
	`${PREFIX}eda`,
] as const;

/** Prefiks otwarty placementem (pozycje 2…4) — `eda` to dokładnie moduł k+1. */
const OTWARTE_PLACEMENTEM = [`${PREFIX}f1`, `${PREFIX}f2`, `${PREFIX}pandas`];

dBack("1E.7 L4 · drabina honoruje placement (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let getLadder: typeof import("../ladder").getLadder;
	let isModuleUnlocked: typeof import("../ladder").isModuleUnlocked;

	let tenantId = "";
	let studentId = "";
	let sessionId = "";
	const moduleIds: Record<string, string> = {};

	const zapamietaneFlagi: Record<string, string | undefined> = {};
	function ustawFlagi(placement: boolean, mastery = true) {
		process.env.FLAG_PLACEMENT_DIAGNOSTIC = placement ? "1" : "0";
		process.env.FLAG_MASTERY_GATE = mastery ? "1" : "0";
	}

	/** Wstawia wiersz odblokowania dokładnie w kształcie, jaki produkuje L3. */
	async function wstawPlacement(slug: string, reason: "qualified" | "carried_untagged") {
		await db.execute(
			reason === "qualified"
				? sql`INSERT INTO curriculum_placements
				        (student_id, tenant_id, module_id, assessment_session_id, concept_slug,
				         level, threshold, reason, support_mode)
				      VALUES (${studentId}, ${tenantId}, ${moduleIds[slug]}, ${sessionId},
				              ${`${PREFIX}koncept`}, 4, 3, 'qualified', 'fading')
				      ON CONFLICT DO NOTHING`
				: sql`INSERT INTO curriculum_placements
				        (student_id, tenant_id, module_id, assessment_session_id, concept_slug,
				         level, threshold, reason, support_mode)
				      VALUES (${studentId}, ${tenantId}, ${moduleIds[slug]}, ${sessionId},
				              NULL, NULL, 3, 'carried_untagged', 'full')
				      ON CONFLICT DO NOTHING`,
		);
	}

	/** Status modułu z derywacji UI (`getLadder`). */
	async function statusUI(slug: string): Promise<string> {
		const ladder = await getLadder(studentId, PATH_KEY);
		const m = ladder.find((x) => x.slug === slug);
		if (!m) throw new Error(`Moduł ${slug} nie ma go w drabinie testowej`);
		return m.status;
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		({ getLadder, isModuleUnlocked } = await import("../ladder"));
		for (const k of ["FLAG_PLACEMENT_DIAGNOSTIC", "FLAG_MASTERY_GATE"]) {
			zapamietaneFlagi[k] = process.env[k];
		}

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e7-l4', 'Tenant 1E.7 L4')
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

		const [s] = await db
			.execute(
				sql`INSERT INTO assessment_sessions
				      (student_id, tenant_id, kind, input_hash, status, plan_json, result_json, completed_at)
				    VALUES (${studentId}, ${tenantId}, 'diagnostic', 'h-l4', 'completed',
				            '{"schemaVersion":1,"kind":"diagnostic","competencies":[],"uncovered":[]}'::jsonb,
				            '{"competencies":{},"concepts":{},"uncovered":[]}'::jsonb, now())
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		sessionId = s.id;

		// Drabina: moduły + JEDNA pozycja każdy (bez pozycji status byłby
		// 'coming_soon' i test mierzyłby co innego) + prereq „poprzedni moduł".
		await db.execute(sql`DELETE FROM curriculum_path_modules WHERE path_key = ${PATH_KEY}`);
		for (const [i, slug] of DRABINA.entries()) {
			const [row] = await db
				.execute(
					sql`INSERT INTO curriculum_modules (slug, title)
					    VALUES (${slug}, ${slug})
					    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
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
				    VALUES (${row.id}, ${`${slug}-poz-1`}, 1, 'theory', ${`${slug}-poz-1`})
				    ON CONFLICT DO NOTHING`,
			);
		}
		for (const id of Object.values(moduleIds)) {
			await db.execute(sql`DELETE FROM curriculum_module_prereqs WHERE module_id = ${id}`);
		}
		for (let i = 1; i < DRABINA.length; i++) {
			await db.execute(
				sql`INSERT INTO curriculum_module_prereqs (module_id, requires_module_id)
				    VALUES (${moduleIds[DRABINA[i]]}, ${moduleIds[DRABINA[i - 1]]})
				    ON CONFLICT DO NOTHING`,
			);
		}
	});

	beforeEach(async () => {
		await db.execute(sql`DELETE FROM curriculum_placements WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM curriculum_module_progress WHERE student_id = ${studentId}`);
		ustawFlagi(true);
		for (const slug of OTWARTE_PLACEMENTEM) {
			await wstawPlacement(slug, slug === `${PREFIX}f2` ? "carried_untagged" : "qualified");
		}
	});

	// ─── 1. Inwariant flagi ────────────────────────────────────────────────────
	it("FLAGA OFF: wiersze placementu istnieją, a drabina ich NIE WIDZI (derywacja jak przed L4)", async () => {
		ustawFlagi(false);
		// f1 ma wiersz odblokowania, ale jego prerekwizyt (korzeń) nie jest zaliczony.
		expect(await statusUI(`${PREFIX}f1`)).toBe("locked");
		expect(await isModuleUnlocked(studentId, moduleIds[`${PREFIX}f1`])).toBe(false);
		// Korzeń bez prerekwizytów jest dostępny zawsze — to zachowanie sprzed L4.
		expect(await statusUI(`${PREFIX}l0-start`)).toBe("available");
	});

	it("FLAGA OFF: ZERO dodatkowych zapytań (bramka zwiera PRZED odczytem placementu)", async () => {
		// Liczymy wywołania `db.select` — L4 dokłada dokładnie jedno i tylko przy ON.
		const szpieg = vi.spyOn(db, "select");
		ustawFlagi(false);
		szpieg.mockClear();
		await getLadder(studentId, PATH_KEY);
		const przyOff = szpieg.mock.calls.length;

		ustawFlagi(true);
		szpieg.mockClear();
		await getLadder(studentId, PATH_KEY);
		const przyOn = szpieg.mock.calls.length;
		szpieg.mockRestore();

		expect(przyOn).toBe(przyOff + 1);
	});

	it("FLAGA OFF: ZERO dodatkowych zapytań także w isModuleUnlocked (ścieżka GORĘTSZA)", async () => {
		// Nota N1 Leo: `getLadder` to jedno wejście na ekran, ale `isModuleUnlocked`
		// woła KAŻDY answer / hint / complete i strona modułu (6 miejsc wywołania).
		// Inwariant flag-OFF ma być pinowany na obu, a mierzony był tylko na chłodniejszej.
		//
		// ⚠ NIE porównujemy ON z OFF przez „+1", jak w teście `getLadder`: tam przepływ
		// jest liniowy, a tu zapalona flaga ZMIENIA STEROWANIE — zapytanie o placement
		// leci równolegle z dwoma innymi, po czym trafienie w `placementUnlocked` powoduje
		// WCZEŚNIEJSZY POWRÓT, który pomija zapytanie o zaliczenia prerekwizytów. Liczby
		// wychodzą równe (3 = 3) z dwóch różnych powodów, więc „+1" byłoby nieprawdą.
		//
		// Pinujemy właściwy niezmiennik: przy OFF liczba zapytań jest DOKŁADNIE taka jak
		// przed L4 (2 równoległe: prereqi + własny postęp, plus 1 na zaliczenia prereqów).
		// Przeniesienie bramki flagi ZA zapytanie podniesie OFF do 4 → czerwone.
		const szpieg = vi.spyOn(db, "select");
		const modulZaPrereq = moduleIds[`${PREFIX}f1`];

		ustawFlagi(false);
		szpieg.mockClear();
		await isModuleUnlocked(studentId, modulZaPrereq);
		const przyOff = szpieg.mock.calls.length;

		ustawFlagi(true);
		szpieg.mockClear();
		await isModuleUnlocked(studentId, modulZaPrereq);
		const przyOn = szpieg.mock.calls.length;
		szpieg.mockRestore();

		expect(przyOff).toBe(3);
		// Przy ON: 3 równoległe (w tym placement) i wczesny powrót — bez zapytania
		// o zaliczenia prereqów. Zdjęcie wczesnego powrotu podniesie tę liczbę do 4.
		expect(przyOn).toBe(3);
	});

	it("FLAGA OFF: ŻADEN SQL NIE NAZYWA `curriculum_placements` (podsłuch na sterowniku pg)", async () => {
		// Nota (b) Ethana — dowód przeniesiony z sondy w sesji do repo.
		//
		// Dlaczego nie wystarczają dwa testy wyżej: one liczą WYWOŁANIA `db.select`.
		// Mutacja przenosząca odczyt placementu do `db.execute` (albo do transakcji,
		// albo do `db.query.*`) przeszłaby je na zielono, bo licznik `db.select` by
		// się nie ruszył — a zapytanie do bazy POLECIAŁOBY. Pinujemy więc właściwość
		// o poziom niżej: na `Client.prototype.query` sterownika `pg`, przez który
		// przechodzi KAŻDE zapytanie (pool.query, transakcja, surowy SQL). Klasę
		// bierzemy z ŻYWEJ puli (`db.$client.Client`), nie z importu — identyczność
		// modułu jest wtedy faktem, a nie założeniem o rozwiązywaniu ścieżek.
		//
		// KONTROLA NEGATYWNA JEST TU OBOWIĄZKOWA: ślepy podsłuch (zła klasa, zły
		// moment instalacji, literówka w filtrze) też pokaże „zero" przy OFF i dowód
		// byłby bezwartościowy. Dlatego ten sam podsłuch, ten sam filtr i te same
		// dwa wywołania przy ON MUSZĄ zobaczyć zapytanie nazywające tabelę.
		const pula = (db as { $client: { Client: { prototype: { query: unknown } } } }).$client;
		const prototypKlienta = pula.Client.prototype as { query: (...a: unknown[]) => unknown };
		const oryginalnaQuery = prototypKlienta.query;
		const zebrane: string[] = [];
		prototypKlienta.query = function (this: unknown, ...args: unknown[]) {
			const pierwszy = args[0] as string | { text?: string } | undefined;
			zebrane.push(typeof pierwszy === "string" ? pierwszy : (pierwszy?.text ?? ""));
			return (oryginalnaQuery as (...a: unknown[]) => unknown).apply(this, args);
		};
		/** Zapytania nazywające tabelę — po nazwie SQL, nie po nazwie funkcji w TS. */
		const nazywajaceTabele = () => zebrane.filter((q) => /curriculum_placements/i.test(q));

		try {
			// Wywołujemy OBIE derywacje (ekran + trasa) — bramka flagi stoi w obu.
			ustawFlagi(false);
			zebrane.length = 0;
			await getLadder(studentId, PATH_KEY);
			await isModuleUnlocked(studentId, moduleIds[`${PREFIX}f1`]);
			const przyOff = nazywajaceTabele();

			ustawFlagi(true);
			zebrane.length = 0;
			await getLadder(studentId, PATH_KEY);
			await isModuleUnlocked(studentId, moduleIds[`${PREFIX}f1`]);
			const przyOn = nazywajaceTabele();

			expect(
				przyOff,
				"Przy zgaszonej fladze poleciało zapytanie do curriculum_placements — " +
					"bramka przestała zwierać PRZED odczytem (deploy ≠ release).",
			).toEqual([]);
			expect(
				przyOn.length,
				"Kontrola negatywna: przy ZAPALONEJ fladze podsłuch nie zobaczył ani jednego " +
					"zapytania o curriculum_placements. To znaczy, że sonda jest ślepa, " +
					"a zero przy OFF nic nie dowodzi.",
			).toBeGreaterThan(0);
			// ⚠ USUNIĘTA ASERCJA (nota Leo, review L5): stała tu kontrola
			// `zebrane.length >= przyOn.length`, gdzie `przyOn` to filtr z `zebrane` —
			// czyli warunek, który NIE MOŻE zaświecić na czerwono w żadnych
			// okolicznościach. Jej komentarz obiecywał dowód „stoimy poniżej warstwy
			// ORM (begin/commit)", którego nie dostarczała: ani `getLadder`, ani
			// `isModuleUnlocked` nie otwierają transakcji, więc `begin`/`commit`
			// w `zebrane` nigdy się nie pojawią. Dowód niosą dwie asercje wyżej
			// (zero przy OFF + kontrola negatywna przy ON) i są wystarczające.
			// Pusta asercja z obietnicą w komentarzu jest gorsza niż jej brak.
		} finally {
			prototypKlienta.query = oryginalnaQuery;
			ustawFlagi(true);
		}
	});

	it("BRAMKA SPRZĘŻENIA: placement ON + masteryGate OFF → drabina jak przed L4", async () => {
		// Ten sam skutek co flaga zgaszona, ale z innego powodu: bez „test out"
		// nie ma taniej drogi naprawy błędu w dół (warunek nośny A22-2 art. 22 RODO).
		ustawFlagi(true, false);
		expect(await statusUI(`${PREFIX}f1`)).toBe("locked");
		expect(await isModuleUnlocked(studentId, moduleIds[`${PREFIX}f1`])).toBe(false);
	});

	// ─── 2. Rdzeń L4 ───────────────────────────────────────────────────────────
	it("FLAGA ON: moduł z wierszem placementu jest DOSTĘPNY mimo niezaliczonego prerekwizytu", async () => {
		for (const slug of OTWARTE_PLACEMENTEM) {
			expect(await statusUI(slug), slug).toBe("available");
			expect(await isModuleUnlocked(studentId, moduleIds[slug]), slug).toBe(true);
		}
		// Zaliczenia NIE ma — placement otwiera, nie zalicza (rama hybrydowa).
		const progress = await db
			.execute(sql`SELECT count(*)::int AS c FROM curriculum_module_progress
			             WHERE student_id = ${studentId}`)
			.then((r: { rows: { c: number }[] }) => r.rows[0].c);
		expect(progress).toBe(0);
	});

	it("KORZEŃ: `l0-start` nigdy nie ma wiersza, a f1 i tak się otwiera (DECYZJA 3)", async () => {
		const wiersze = await db
			.execute(sql`SELECT module_id FROM curriculum_placements WHERE student_id = ${studentId}`)
			.then((r: { rows: { module_id: string }[] }) => r.rows.map((x) => x.module_id));
		expect(wiersze).not.toContain(moduleIds[`${PREFIX}l0-start`]);
		// Gdyby prerekwizyt musiał być „zaliczony ALBO otwarty placementem", f1
		// byłby zablokowany na zawsze — korzeń nie dostaje wiersza z mocy DECYZJI 3.
		expect(await isModuleUnlocked(studentId, moduleIds[`${PREFIX}f1`])).toBe(true);
	});

	it("PREFIKS NIE WYCIEKA: moduł k+1 zostaje ZABLOKOWANY, choć jego prereq jest otwarty", async () => {
		// `eda` nie ma wiersza; jego prerekwizyt `pandas` jest OTWARTY, ale nie
		// zaliczony. To jest ta jedna pozycja, na której naiwne brzmienie reguły
		// („prereq spełniony, bo poprzedni otwarty") rozjeżdża się z regułą L2.
		expect(await statusUI(`${PREFIX}eda`)).toBe("locked");
		expect(await isModuleUnlocked(studentId, moduleIds[`${PREFIX}eda`])).toBe(false);
	});

	it("normalna droga wciąż działa: zaliczenie `pandas` otwiera `eda` bez placementu", async () => {
		await db.execute(
			sql`INSERT INTO curriculum_module_progress (student_id, tenant_id, module_id, status)
			    VALUES (${studentId}, ${tenantId}, ${moduleIds[`${PREFIX}pandas`]}, 'completed')`,
		);
		expect(await isModuleUnlocked(studentId, moduleIds[`${PREFIX}eda`])).toBe(true);
		expect(await statusUI(`${PREFIX}eda`)).toBe("available");
	});

	// ─── 3. Parytet UI ↔ API ───────────────────────────────────────────────────
	it("PARYTET: dla KAŻDEGO modułu status z `getLadder` zgadza się z `isModuleUnlocked`", async () => {
		// Rozjazd tych dwóch derywacji jest niewidoczny w kodzie (dwie funkcje
		// w jednym pliku), a dla studenta znaczy „widzę otwarte, dostaję 403".
		for (const flaga of [true, false]) {
			ustawFlagi(flaga);
			const ladder = await getLadder(studentId, PATH_KEY);
			for (const m of ladder) {
				const api = await isModuleUnlocked(studentId, m.id);
				expect(m.status !== "locked", `${m.slug} (flaga=${flaga})`).toBe(api);
			}
		}
	});

	it("PARYTET trzyma się także po zaliczeniu modułu w środku drabiny", async () => {
		await db.execute(
			sql`INSERT INTO curriculum_module_progress (student_id, tenant_id, module_id, status)
			    VALUES (${studentId}, ${tenantId}, ${moduleIds[`${PREFIX}f2`]}, 'completed')`,
		);
		const ladder = await getLadder(studentId, PATH_KEY);
		for (const m of ladder) {
			expect(m.status !== "locked", m.slug).toBe(await isModuleUnlocked(studentId, m.id));
		}
		expect(ladder.find((m) => m.slug === `${PREFIX}f2`)?.status).toBe("completed");
	});

	it("cudzy placement nie otwiera niczego (odczyt jest zawężony do studenta)", async () => {
		const OBCY = `${USER}-obcy`;
		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${OBCY}, ${OBCY}, ${`${OBCY}@test.local`}, true, now(), now())
			    ON CONFLICT (id) DO NOTHING`,
		);
		const [obcy] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${OBCY}, ${tenantId}, 'Test U', 'Informatyka', 3, 'Data Scientist')
				    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		// Student obcy NIE ma ani jednego wiersza placementu — cały prefiks
		// należy do `studentId`. Jego drabina musi zaczynać się od korzenia.
		const ladder = await getLadder(obcy.id, PATH_KEY);
		expect(ladder.find((m) => m.slug === `${PREFIX}f1`)?.status).toBe("locked");
		expect(await isModuleUnlocked(obcy.id, moduleIds[`${PREFIX}f1`])).toBe(false);
		await db.execute(sql`DELETE FROM students WHERE id = ${obcy.id}`);
	});

	// ─── 4. Carry-forward C2 (Leo) — SPÓJNOŚĆ DRABINY PO ZNIKNIĘCIU POSTĘPU ────
	//
	// Skąd ta dziura. W-6 mówi: moduł ZALICZONY wewnątrz prefiksu NIE dostaje
	// wiersza w `curriculum_placements` (po co otwierać coś, co student ma zrobione).
	// Jego „otwartość" na drabinie stoi wtedy na jednej nodze — na wierszu POSTĘPU
	// (`status='completed'`). Gdyby ten wiersz zniknął, moduł nie ma ani placementu,
	// ani zaliczenia, a jego prerekwizyt nadal nie jest zaliczony ⇒ `locked`, mimo że
	// moduły po OBU jego stronach są otwarte. Dla studenta: dziura w środku drabiny,
	// której nie da się otworzyć niczym poza cofnięciem się przed prefiks.
	//
	// Dziś nieosiągalne: w kodzie produkcyjnym NIE MA kasowania
	// `curriculum_module_progress` (jedyni pisarze to upsert kaskady completeItem
	// i upsert trasy egzaminu). L5 dokłada trzeci powód, żeby ten wiersz ruszać
	// (dowód 'test_out'), więc pierwsza ścieżka „reset modułu / powtórka od zera"
	// to zapali. Ten test jest tu po to, żeby zapaliło się W CI, a nie u studenta.
	/** Slugi modułów `locked`, które mają moduł otwarty i przed sobą, i po sobie. */
	async function wyspyLocked(): Promise<string[]> {
		const drabina = await getLadder(studentId, PATH_KEY);
		const posortowana = [...drabina].sort((a, b) => a.position - b.position);
		return posortowana
			.filter(
				(m, i) =>
					m.status === "locked" &&
					posortowana.slice(0, i).some((x) => x.status !== "locked") &&
					posortowana.slice(i + 1).some((x) => x.status !== "locked"),
			)
			.map((m) => m.slug);
	}

	it("C2 — stan wyjściowy W-6 (moduł zaliczony w prefiksie, BEZ wiersza placementu) jest spójny", async () => {
		// Kontrola pozytywna: zanim zaczniemy kasować, drabina wyspy NIE ma. Bez tego
		// czerwień w teście niżej mogłaby pochodzić z samych rekwizytów, nie z kasowania.
		await db.execute(
			sql`DELETE FROM curriculum_placements
			    WHERE student_id = ${studentId} AND module_id = ${moduleIds[`${PREFIX}f2`]}`,
		);
		await db.execute(
			sql`INSERT INTO curriculum_module_progress (student_id, tenant_id, module_id, status)
			    VALUES (${studentId}, ${tenantId}, ${moduleIds[`${PREFIX}f2`]}, 'completed')`,
		);
		expect(await statusUI(`${PREFIX}f2`)).toBe("completed");
		expect(await wyspyLocked()).toEqual([]);
	});

	// ⚠⚠ TO NIE JEST KONTRAKT — TO UDOKUMENTOWANY DEFEKT.
	// ✅ ROZSTRZYGNIĘTY: docs/product/decyzje-1e7-placement-v0.1.md **§6e** (Sophia
	// v0.6). PRZECZYTAJ §6e, ZANIM cokolwiek tu zmienisz — rozstrzygnięcie odrzuca
	// obie oczywiste naprawy (przeliczanie placementu łamie niezmiennik miernika;
	// „świadoma dziura z komunikatem" obiecuje studentowi czynność, której produkt
	// nie pozwala wykonać) i daje trzecią regułę wiążącą:
	// **RESET ZERUJE ZALICZENIE, NIGDY DOSTĘPNOŚĆ** — reset ma zmieniać status
	// wiersza postępu (`completed` → `available`), a nie kasować wiersz. Wtedy
	// wyspa nie powstaje, placement nie jest przeliczany, miernik zostaje nietknięty.
	// Jeśli wiersz technicznie MUSI zniknąć, ratunkowe dopisanie wiersza placementu
	// wymaga sign-offu Sophii PRZED implementacją, nie po.
	// Zmierzony w L5 (2026-07-30, Max): niezmiennik „brak wyspy `locked`" JEST
	// ZŁAMANY. Test pinuje stan FAKTYCZNY, nie pożądany, z dwóch powodów: (1) L5
	// nie ma mandatu naprawiać reguły placementu — to decyzja produktowa (Sophia),
	// nie plasterek backendu; (2) niezapisany defekt zniknąłby z pola widzenia po
	// release'ie. Test zaświeci na CZERWONO w chwili, gdy ktokolwiek to naprawi —
	// i to jest zamierzone: wtedy trzeba go przepisać na asercję niezmiennika
	// (`expect(await wyspyLocked()).toEqual([])`), którą zostawiam gotową wyżej.
	// DECYZJA DO PODJĘCIA: albo reset/powtórka modułu przelicza placement (dopisuje
	// wiersz W-6, który reguła świadomie pominęła), albo akceptujemy dziurę i UI
	// mówi o niej wprost. Do czasu decyzji ŻADNA ścieżka produkcyjna nie ma prawa
	// kasować `curriculum_module_progress` — dziś nie kasuje żadna.
	it("C2 · DEFEKT: skasowanie postępu modułu wewnątrz prefiksu ROBI wyspę `locked` między otwartymi", async () => {
		await db.execute(
			sql`DELETE FROM curriculum_placements
			    WHERE student_id = ${studentId} AND module_id = ${moduleIds[`${PREFIX}f2`]}`,
		);
		await db.execute(
			sql`INSERT INTO curriculum_module_progress (student_id, tenant_id, module_id, status)
			    VALUES (${studentId}, ${tenantId}, ${moduleIds[`${PREFIX}f2`]}, 'completed')`,
		);
		// Stan wyjściowy jest spójny (kontrola pozytywna ma własny przypadek wyżej).
		expect(await wyspyLocked()).toEqual([]);

		// „Reset / powtórka modułu" — jedyne zdarzenie, które kasuje wiersz postępu.
		// L5 dokłada powód, żeby taką ścieżkę w ogóle napisać (dowód 'test_out').
		await db.execute(
			sql`DELETE FROM curriculum_module_progress
			    WHERE student_id = ${studentId} AND module_id = ${moduleIds[`${PREFIX}f2`]}`,
		);

		const drabina = (await getLadder(studentId, PATH_KEY)).sort((a, b) => a.position - b.position);
		// Cały kształt drabiny w asercji — dowód, że to naprawdę WYSPA (otwarte po
		// obu stronach), a nie po prostu „zablokowany ogon" jak `eda`.
		expect(drabina.map((m) => `${m.slug}=${m.status}`)).toEqual([
			`${PREFIX}l0-start=available`,
			`${PREFIX}f1=available`,
			`${PREFIX}f2=locked`, // ⟵ DZIURA: bez placementu (W-6) i bez zaliczenia
			`${PREFIX}pandas=available`,
			`${PREFIX}eda=locked`, // ogon poza prefiksem — to jest poprawne (DECYZJA 5)
		]);
		expect(await wyspyLocked()).toEqual([`${PREFIX}f2`]);
	});

	it("przywraca flagi środowiska (sprzątanie)", () => {
		for (const [k, v] of Object.entries(zapamietaneFlagi)) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
		expect(true).toBe(true);
	});
});
