import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ocenAktywacjeRuntime } from "../k3-validate";

/**
 * D1 (fala 1) — strażnik kontroli #9d w `tools/k3-validate.ts`:
 * `app_runtime.rolcanlogin = true` ORAZ `app_runtime.rolpassword IS NOT NULL`.
 *
 * JEDEN NOŚNIK. Reguła mieszka w `ocenAktywacjeRuntime` (k3-validate.ts) i jest
 * tu WOŁANA, nie przepisana. Gdyby ten plik trzymał własną kopię koniunkcji,
 * mutacja w kodzie produkcyjnym zostawiłaby go zielonym.
 *
 * DLACZEGO TEN PLIK JEST INTEGRACYJNY, SKORO POŁOWA TESTÓW NIE TYKA BAZY
 * ---------------------------------------------------------------------
 * Projekt `unit` w `vitest.config.mts` zbiera wyłącznie `src/**` i
 * `tests/unit/**`. Plik w `tools/__tests__/` bez sufiksu `.integration`
 * nie trafiłby do ŻADNEGO projektu — byłby strażnikiem, którego nikt nigdy
 * nie uruchamia. Sufiks `.integration` wpina go do projektu, który w CI
 * faktycznie biegnie (job `integration`, pr.yml).
 *
 * CZY CI BYWA W STANIE, KTÓREGO TEN STRAŻNIK PILNUJE — ODPOWIEDŹ ZMIERZONA
 * -----------------------------------------------------------------------
 * NIE, i to nie jest bariera, tylko rzecz, którą test musi WYTWORZYĆ.
 * Pomiar 2026-09-01 (postgres:16 w kontenerze, po samym `pnpm db:migrate`):
 *   SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname='app_runtime';
 *   → app_runtime | f
 * Migracja 0011 tworzy rolę jako NOLOGIN; LOGIN i hasło nadaje się RĘCZNIE
 * (krok 4 runbooka k3-prod-migration-phase2.md). CI stoi więc w stanie
 * PRZECIWNYM do pilnowanego. Test wytwarza oba stany `ALTER ROLE` wewnątrz
 * transakcji i cofa je `ROLLBACK` — pokrycie jest realne, nie deklarowane.
 */

// Bramka bazy — POWIELONY NOŚNIK, świadomy i pilnowany. Trzy linie poniżej są
// DOSŁOWNĄ kopią wzorca z każdego pliku `*.integration.test.*`; strażnik
// `src/test/__tests__/bramki-powielone-spis.test.ts` czerwieni się, gdy kopie
// się rozjadą, i to on jest progiem konsolidacji (właściciel: Quinn).
// W praktyce ta bramka nie pomija już niczego — warunek wstępny projektu
// (`src/test/integration-db-guard.ts`) przerywa przebieg wcześniej i ostrzej.
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

describe("D1 — reguła aktywacji roli app_runtime (ocenAktywacjeRuntime)", () => {
	it("uznaje rolę za aktywną tylko gdy OBA człony spełnione", () => {
		expect(ocenAktywacjeRuntime({ mozeSieLogowac: true, maHaslo: true })).toEqual({
			ok: true,
			braki: [],
		});
	});

	it("CZŁON 1 — brak LOGIN wywraca ocenę i nazywa rolcanlogin", () => {
		const wynik = ocenAktywacjeRuntime({ mozeSieLogowac: false, maHaslo: true });

		expect(wynik.ok).toBe(false);
		expect(wynik.braki).toHaveLength(1);
		expect(wynik.braki[0]).toMatch(/rolcanlogin/);
	});

	it("CZŁON 2 — brak hasła wywraca ocenę i nazywa rolpassword", () => {
		const wynik = ocenAktywacjeRuntime({ mozeSieLogowac: true, maHaslo: false });

		expect(wynik.ok).toBe(false);
		expect(wynik.braki).toHaveLength(1);
		expect(wynik.braki[0]).toMatch(/rolpassword/);
	});

	it("stan hasła nieodczytany (null) NIE jest zielony — brak dowodu to brak, nie PASS", () => {
		const wynik = ocenAktywacjeRuntime({ mozeSieLogowac: true, maHaslo: null });

		expect(wynik.ok).toBe(false);
		expect(wynik.braki[0]).toMatch(/NIESPRAWDZALNY/);
	});

	it("oba człony złamane naraz — oba braki nazwane, nie tylko pierwszy", () => {
		const wynik = ocenAktywacjeRuntime({ mozeSieLogowac: false, maHaslo: false });

		expect(wynik.braki).toHaveLength(2);
	});
});

dBack("D1 — źródło stanu hasła w katalogu Postgresa", () => {
	let pool: Pool;

	beforeAll(() => {
		pool = new Pool({ connectionString: DATABASE_URL });
	});

	afterAll(async () => {
		await pool?.end();
	});

	it("pg_roles.rolpassword NIE odróżnia roli z hasłem od roli bez hasła — dlatego czytamy pg_authid", async () => {
		// To jest uzasadnienie wyboru źródła, postawione jako pomiar, nie jako
		// zdanie w komentarzu. Gdyby kontrola #9d czytała `pg_roles.rolpassword`,
		// asercja `IS NOT NULL` nie mogłaby paść NIGDY — strażnik-atrapa.
		const przywilej = await pool.query(
			"SELECT has_table_privilege(current_user, 'pg_authid', 'SELECT') AS widac",
		);
		expect(
			przywilej.rows[0].widac,
			"pg_authid nieczytelny z tego połączenia — bez niego stanu hasła nie da się stwierdzić",
		).toBe(true);

		const wiersze = await pool.query(
			`SELECT r.rolname, r.rolpassword AS z_pg_roles, (a.rolpassword IS NOT NULL) AS ma_haslo
			   FROM pg_roles r JOIN pg_authid a USING (rolname)
			  WHERE r.rolname IN ('app_runtime', current_user)`,
		);
		// KONTROLA LICZNOŚCI — pomiar, do którego nic nie dotarło, nie może
		// zameldować sukcesu.
		expect(wiersze.rowCount).toBe(2);

		const zPgRoles = new Set(wiersze.rows.map((r) => r.z_pg_roles));
		expect(
			zPgRoles.size,
			"pg_roles.rolpassword okazało się rozróżniające — zweryfikuj wybór źródła",
		).toBe(1);
	});

	it("wytwarza oba stany roli i sprawdza, że reguła je rozróżnia (ALTER ROLE w transakcji, ROLLBACK)", async () => {
		const klient = await pool.connect();
		// Hasło generowane losowo — żaden literał poświadczenia nie ląduje
		// w repozytorium ani w dzienniku przebiegu.
		const sekret = randomBytes(24).toString("base64url");
		const odczytaj = async () => {
			const r = await klient.query(
				`SELECT r.rolcanlogin, (a.rolpassword IS NOT NULL) AS ma_haslo
				   FROM pg_roles r JOIN pg_authid a USING (rolname)
				  WHERE r.rolname = 'app_runtime'`,
			);
			expect(r.rowCount).toBe(1);
			return ocenAktywacjeRuntime({
				mozeSieLogowac: r.rows[0].rolcanlogin === true,
				maHaslo: r.rows[0].ma_haslo === true,
			});
		};
		try {
			await klient.query("BEGIN");

			await klient.query(`ALTER ROLE app_runtime LOGIN PASSWORD '${sekret}'`);
			expect((await odczytaj()).ok, "stan aktywny powinien przechodzić").toBe(true);

			await klient.query("ALTER ROLE app_runtime NOLOGIN");
			const bezLogin = await odczytaj();
			expect(bezLogin.ok).toBe(false);
			expect(bezLogin.braki.join(" ")).toMatch(/rolcanlogin/);

			await klient.query("ALTER ROLE app_runtime LOGIN PASSWORD NULL");
			const bezHasla = await odczytaj();
			expect(bezHasla.ok).toBe(false);
			expect(bezHasla.braki.join(" ")).toMatch(/rolpassword/);
		} finally {
			await klient.query("ROLLBACK");
			klient.release();
		}

		// Dowód, że test po sobie posprzątał — ALTER ROLE jest transakcyjny,
		// ale to twierdzenie o stanie faktycznym, więc je mierzymy.
		const po = await pool.query("SELECT rolcanlogin FROM pg_roles WHERE rolname = 'app_runtime'");
		expect(po.rowCount).toBe(1);
	});
});
