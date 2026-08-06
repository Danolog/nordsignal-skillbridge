// @vitest-environment node
//
// 1E.7 / D11 — ODCZYT MIERNIKA NA REALNEJ BAZIE (:5433 albo własny kontener,
// nigdy prod NEON).
//
// PODZIAŁ PRACY ZE STRAŻNIKIEM JEDNOSTKOWYM (`placement-metric-rule.test.ts`):
// tam dowodzimy REGUŁY (czysta funkcja, mutacja czerwieni, biegnie bez bazy);
// tutaj dowodzimy, że SQL FAKTYCZNIE DOSTARCZA REGULE PRAWDZIWE FAKTY — bo to
// jest ta część, w której atrapa świeciłaby zielono dokładnie tam, gdzie miernik
// pęka: złączenie tekstowego `audit_log.target_id` z uuid-em sesji, zachowanie
// przy skasowanym koncie (kaskada) i to, że zapytanie NIE filtruje po rejestrze.
//
// Cztery kształty z dziennika produkcji, odtworzone wiersz po wierszu:
//   1. uczestnik wpisany do rejestru        → obserwacja,
//   2. konto techniczne QA (domena .invalid) → odrzucone, spoza rejestru,
//   3. konto ZESPOŁOWE bez żadnego znacznika → odrzucone, spoza rejestru,
//   4. sierota po skasowanym koncie          → odrzucone, sierota.
//
// Kształt 3 jest tu z tego samego powodu co w strażniku jednostkowym: to jedyny
// przypadek, który przechodzi przez KAŻDY filtr oparty na wyglądzie konta.

import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { klasyfikujZdarzenie, zbierzMiernik, zWierszaSql } from "../placement-metric";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const PREFIX = "d11-";
const KOHORTA = `${PREFIX}kohorta-testowa`;

dBack("1E.7 D11 · odczyt miernika na realnej bazie", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduł ładowany dynamicznie po env.
	let db: any;
	let tenantId = "";
	const studenci: Record<string, string> = {};
	const sesje: Record<string, string> = {};
	let idSesjiSieroty = "";

	/** Wykonawca dla `zbierzMiernik` — realne zapytanie, realne parametry. */
	async function wykonaj(zapytanie: string, params: unknown[]) {
		const r = await db.execute(sql.raw(podstaw(zapytanie, params)));
		return r.rows as Record<string, unknown>[];
	}

	/**
	 * Drizzle `execute` nie przyjmuje pozycyjnych parametrów przy surowym SQL-u,
	 * więc podstawiamy je tutaj — w TEŚCIE, nigdy w kodzie produkcyjnym (tam
	 * parametry idą przez `pg`, patrz tools/report-placement-metric.ts).
	 */
	function podstaw(zapytanie: string, params: unknown[]): string {
		let wynik = zapytanie;
		params.forEach((p, i) => {
			const literal =
				p === null || p === undefined
					? "NULL"
					: Array.isArray(p)
						? `ARRAY[${p.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(",")}]`
						: `'${String(p).replace(/'/g, "''")}'`;
			wynik = wynik.split(`$${i + 1}`).join(literal);
		});
		return wynik;
	}

	async function zalozStudenta(klucz: string, email: string): Promise<string> {
		const userId = `${PREFIX}u-${klucz}`;
		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${userId}, ${klucz}, ${email}, true, now(), now())
			    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
		);
		const [s] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${userId}, ${tenantId}, 'Uczelnia D11', 'Informatyka', 3, 'Data Scientist')
				    ON CONFLICT (user_id) DO UPDATE SET semester = EXCLUDED.semester
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		return s.id;
	}

	async function zalozSesje(studentId: string, hash: string): Promise<string> {
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

	/** Zdarzenie miernika w kształcie 1:1 z `recordPlacementMetricEvent`. */
	async function zdarzenieMiernika(sesjaId: string, metadata: Record<string, unknown>) {
		await db.execute(
			sql`INSERT INTO audit_log (actor_type, action, target_type, target_id, metadata)
			    VALUES ('student', 'curriculum.placement.computed', 'assessment_session',
			            ${sesjaId}, ${JSON.stringify(metadata)}::jsonb)`,
		);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));

		// Sprzątanie po poprzednim przebiegu — test ma być powtarzalny.
		await db.execute(sql`DELETE FROM pilot_participants WHERE cohort = ${KOHORTA}`);
		await db.execute(sql`DELETE FROM students WHERE user_id LIKE ${`${PREFIX}u-%`}`);
		await db.execute(sql`DELETE FROM "user" WHERE id LIKE ${`${PREFIX}u-%`}`);

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES (${`${PREFIX}tenant`}, 'Tenant D11')
				    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;

		// 1. Uczestnik pilotażu — jedyny wpisany do rejestru.
		studenci.uczestnik = await zalozStudenta("uczestnik", `${PREFIX}uczestnik@example.com`);
		// 2. Konto techniczne QA — domena zarezerwowana RFC 6761.
		studenci.qa = await zalozStudenta("qa", `${PREFIX}qa@skillbridge.invalid`);
		// 3. Konto ZESPOŁOWE — adres najzwyklejszy pod słońcem, zero znaczników.
		studenci.zespol = await zalozStudenta("zespol", `${PREFIX}zespol@gmail.com`);
		// 4. Konto, które za chwilę skasujemy — źródło sieroty.
		studenci.doKasacji = await zalozStudenta("kasowany", `${PREFIX}kasowany@example.com`);

		sesje.uczestnik = await zalozSesje(studenci.uczestnik, `${PREFIX}h1`);
		sesje.qa = await zalozSesje(studenci.qa, `${PREFIX}h2`);
		sesje.zespol = await zalozSesje(studenci.zespol, `${PREFIX}h3`);
		idSesjiSieroty = await zalozSesje(studenci.doKasacji, `${PREFIX}h4`);

		await zdarzenieMiernika(sesje.uczestnik, {
			threshold: 3,
			unlockedCount: 1,
			alreadyCompletedCount: 0,
			blockingHoleSlug: "m-pandas",
			blockingHoleReason: "no_measurement",
			blockingHoleLevel: null,
		});
		await zdarzenieMiernika(sesje.qa, { threshold: 3, unlockedCount: 1 });
		await zdarzenieMiernika(sesje.zespol, { threshold: 3, unlockedCount: 4 });
		await zdarzenieMiernika(idSesjiSieroty, { threshold: 3, unlockedCount: 2 });

		// Rejestr: WYŁĄCZNIE uczestnik. Nikogo nie wykluczamy — po prostu nikogo
		// więcej nie wpisujemy. Na tym polega cała reguła.
		await db.execute(
			sql`INSERT INTO pilot_participants (student_id, tenant_id, cohort)
			    VALUES (${studenci.uczestnik}, ${tenantId}, ${KOHORTA})`,
		);

		// Kasujemy konto (art. 17): sesja znika kaskadą, zdarzenie zostaje sierotą.
		await db.execute(sql`DELETE FROM students WHERE id = ${studenci.doKasacji}`);
	});

	it("złączenie tekstowego target_id z uuid sesji DZIAŁA — uczestnik ma komplet pól werdyktu", async () => {
		const m = await zbierzMiernik(wykonaj, { kohorta: KOHORTA });
		expect(m.policzenia).toHaveLength(1);
		expect(m.policzenia[0]).toMatchObject({
			threshold: 3,
			unlockedCount: 1,
			alreadyCompletedCount: 0,
			blockingHoleSlug: "m-pandas",
			blockingHoleReason: "no_measurement",
		});
	});

	it("konto QA i konto ZESPOŁOWE odpadają jako spoza rejestru; skasowane jako sierota", async () => {
		const m = await zbierzMiernik(wykonaj, { kohorta: KOHORTA });
		expect(m.odrzucone.spozaRejestru).toBeGreaterThanOrEqual(2);
		expect(m.odrzucone.spozaRejestruTechniczne).toBeGreaterThanOrEqual(1);
		expect(m.odrzucone.sierota).toBeGreaterThanOrEqual(1);
		expect(m.uczestnicyWRejestrze).toBe(1);
		expect(m.rejestrPodejrzany).toBe(0);
	});

	it("kaskada po skasowaniu konta ZRYWA wiązanie — zdarzenie przestaje być obserwacją", async () => {
		// To jest dowód kierunku awarii, na którym stoi cały wybór projektowy:
		// gdyby reguła była WYKLUCZAJĄCA, ten wiersz wróciłby do licznika.
		const wiersze = await wykonaj(
			`SELECT a.id AS zdarzenie_id, a.action AS akcja, a.created_at AS utworzono,
			        s.id AS sesja_id, s.student_id AS student_id, NULL::text AS kohorta,
			        false AS konto_wyglada_technicznie, a.metadata AS metadata
			   FROM audit_log a
			   LEFT JOIN assessment_sessions s ON s.id::text = a.target_id
			  WHERE a.target_id = $1`,
			[idSesjiSieroty],
		);
		expect(wiersze).toHaveLength(1);
		const kandydat = zWierszaSql(wiersze[0]);
		expect(kandydat.sesjaId).toBeNull();
		expect(klasyfikujZdarzenie(kandydat)).toBe("sierota");
	});

	it("zapytanie kandydatów NIE filtruje — widzi też zdarzenia spoza rejestru", async () => {
		// Gdyby SQL filtrował po rejestrze, rozliczenie odrzuconych byłoby puste,
		// a liczba obserwacji nie do odróżnienia od pustego dziennika.
		const m = await zbierzMiernik(wykonaj, { kohorta: KOHORTA });
		const razem =
			m.policzenia.length +
			m.pominieciaLiczenia.length +
			m.odrzucone.sierota +
			m.odrzucone.spozaRejestru;
		expect(razem).toBeGreaterThanOrEqual(4);
	});

	it("kohorta nieistniejąca daje ZERO obserwacji, a nie wszystkie zdarzenia", async () => {
		const m = await zbierzMiernik(wykonaj, { kohorta: `${PREFIX}nie-ma-takiej` });
		expect(m.uczestnicyWRejestrze).toBe(0);
		expect(m.policzenia).toHaveLength(0);
		expect(m.odrzucone.spozaRejestru).toBeGreaterThanOrEqual(3);
	});
});
