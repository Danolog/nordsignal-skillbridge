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

	it("przywraca flagi środowiska (sprzątanie)", () => {
		for (const [k, v] of Object.entries(zapamietaneFlagi)) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
		expect(true).toBe(true);
	});
});
