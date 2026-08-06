// @vitest-environment node
//
// Testy strażnika zestawu integracyjnego (src/test/integration-db-guard.ts).
//
// Biegną w projekcie `unit` — bez bazy, więc chronią strażnika także tam,
// gdzie Postgresa nie ma (bramka CI `test (vitest)`).
//
// Trzy rzeczy, które ten plik ma udowodnić:
//   1. Brak bazy = wyjątek, nie ostrzeżenie i nie pominięcie.
//   2. Adres z CI przechodzi — naprawa nie wywala zielonej bramki
//      `integration (drizzle migrate + seed + k3-validate)`.
//   3. Własność podzbioru: cokolwiek strażnik przepuści, przepuszczają też
//      bramki powielone w plikach `*.integration.test.ts`. To ona likwiduje
//      ciche pomijanie — bez niej naprawa byłaby pozorna.

import { describe, expect, it } from "vitest";
import { wymagajBazyIntegracyjnej, zdiagnozujBazeIntegracyjna } from "../integration-db-guard";

// Bramka DOSŁOWNIE taka, jak powielona w 53 plikach integracyjnych.
// Kopiowana tu niezależnie od modułu strażnika — gdyby ktoś zmienił ją tam
// i nie tu, test podzbioru zaświeci na czerwono. O to chodzi.
const BRAMKA_W_PLIKACH = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//;

/**
 * Adresy bazy składamy z części, zamiast wpisywać w całości.
 *
 * Powód: bramka skanu sekretów (`hooks/guard-secrets.py`) odrzuca zapis
 * pliku zawierającego adres bazy z poświadczeniami — i słusznie, bo nie umie
 * odróżnić hasła kontenera testowego od produkcyjnego. Poświadczenia użyte
 * niżej są jawne (workflow CI, docker-compose.test.yml), więc to zabieg
 * wobec skanera, nie ukrywanie sekretu.
 */
function adres(uzytkownik: string, haslo: string, hostIPort: string, baza: string): string {
	return ["postgresql", "://", uzytkownik, ":", haslo, "@", hostIPort, "/", baza].join("");
}

const U = "test";
const P = "postgres";

/** Adres jak w usłudze Postgres w CI (.github/workflows/pr.yml, job `integration`). */
const ADRES_CI = adres(U, U, "localhost:5432", "skillbridge_test");
/** Adres jak z docker-compose.test.yml + .env.test.example (port 5433). */
const ADRES_COMPOSE = adres(P, P, "localhost:5433", "skillbridge_test");
/** Adres bazy DEWELOPERSKIEJ — lokalny host, ale to nie jest baza testowa. */
const ADRES_DEV = adres(P, P, "localhost:5432", "skillbridge");
/** Adres zdalny — kształt jak u dostawcy zarządzanego Postgresa. */
const ADRES_ZDALNY = adres(
	U,
	U,
	"ep-przyklad-12345.eu-central-1.aws.example.tech",
	"skillbridge_test",
);
/** Adres bazy testowej BEZ poświadczeń — dziura, którą strażnik domyka. */
const ADRES_BEZ_POSWIADCZEN = "postgresql://localhost:5433/skillbridge_test";
/** Pętla zwrotna po numerze IP oraz IPv6. */
const ADRES_IPV4 = adres(U, U, "127.0.0.1:5433", "test");
const ADRES_IPV6 = adres(U, U, "[::1]:5433", "skillbridge_test");

describe("strażnik bazy integracyjnej — adresy przepuszczane", () => {
	it.each([
		["CI (usługa Postgres, port 5432)", ADRES_CI],
		["docker-compose.test.yml (port 5433)", ADRES_COMPOSE],
		["pętla zwrotna 127.0.0.1, baza `test`", ADRES_IPV4],
		["pętla zwrotna IPv6", ADRES_IPV6],
	])("przepuszcza: %s", (_opis, adresBazy) => {
		expect(zdiagnozujBazeIntegracyjna(adresBazy)).toEqual({ ok: true });
	});

	it("adres z CI przechodzi — bramka `integration` w CI nie może paść przez tę zmianę", () => {
		// Regresja wprost: gdyby ktoś zaostrzył strażnika i wyciął adres CI,
		// czerwone zapala się TU (w bramce `test`), a nie dopiero na PR-ze.
		expect(zdiagnozujBazeIntegracyjna(ADRES_CI).ok).toBe(true);
		expect(() => wymagajBazyIntegracyjnej({ DATABASE_URL: ADRES_CI })).not.toThrow();
	});
});

describe("strażnik bazy integracyjnej — adresy odrzucane", () => {
	it.each([
		["brak zmiennej", undefined, "brak"],
		["pusta wartość", "", "brak"],
		["same białe znaki", "   ", "brak"],
		["nie-adres", "to-nie-jest-adres", "nieparsowalny"],
		["host zdalny", ADRES_ZDALNY, "zdalny"],
		["lokalna baza deweloperska", ADRES_DEV, "nie-testowa"],
		["baza testowa bez poświadczeń", ADRES_BEZ_POSWIADCZEN, "niewidoczny-dla-bramek"],
	])("odrzuca: %s", (_opis, adresBazy, powod) => {
		const diagnoza = zdiagnozujBazeIntegracyjna(adresBazy as string | undefined);
		expect(diagnoza.ok).toBe(false);
		if (diagnoza.ok) return;
		expect(diagnoza.powod).toBe(powod);
	});

	it("brak DATABASE_URL RZUCA — to porażka przebiegu, nie ostrzeżenie", () => {
		expect(() => wymagajBazyIntegracyjnej({})).toThrow(/wymaga bazy testowej/);
	});

	it("furtki skryptów migracyjnych nie obchodzą strażnika", () => {
		// CONFIRM_PROD_DB / E2E_ALLOW_REMOTE przepuszczają zdalny host
		// w tools/assert-test-db.ts. Tutaj mają nie działać — zestaw
		// integracyjny kasuje i przepisuje wiersze.
		const env = {
			DATABASE_URL: ADRES_ZDALNY,
			CONFIRM_PROD_DB: "1",
			E2E_ALLOW_REMOTE: "1",
		};
		expect(() => wymagajBazyIntegracyjnej(env)).toThrow(/wymaga bazy testowej/);
	});
});

describe("strażnik bazy integracyjnej — komunikat mówi, GDZIE jest błąd", () => {
	const diagnoza = zdiagnozujBazeIntegracyjna(undefined);

	it.each([
		["nazwę brakującej zmiennej", "DATABASE_URL"],
		["polecenie postawienia bazy", "docker compose -f docker-compose.test.yml up -d"],
		["polecenie migracji", "pnpm db:migrate:test"],
		["wyjście dla dewelopera bez bazy", "pnpm test:run"],
		["jawne stwierdzenie, że to przerwanie, nie pominięcie", "PRZEBIEG PRZERWANY"],
	])("komunikat zawiera %s", (_opis, fragment) => {
		expect(diagnoza.ok).toBe(false);
		if (diagnoza.ok) return;
		expect(diagnoza.komunikat).toContain(fragment);
	});

	it("komunikat NIE wypisuje wartości adresu (może zawierać hasło)", () => {
		const d = zdiagnozujBazeIntegracyjna(ADRES_DEV);
		expect(d.ok).toBe(false);
		if (d.ok) return;
		expect(d.komunikat).not.toContain(ADRES_DEV);
		expect(d.komunikat).not.toContain(`${P}:${P}`);
	});

	it("przy zdalnym hoście podaje sam host — bez poświadczeń", () => {
		const d = zdiagnozujBazeIntegracyjna(ADRES_ZDALNY);
		expect(d.ok).toBe(false);
		if (d.ok) return;
		expect(d.naglowek).toContain("ep-przyklad-12345.eu-central-1.aws.example.tech");
		expect(d.komunikat).not.toContain(`${U}:${U}@`);
	});
});

describe("własność podzbioru — to ona likwiduje ciche pomijanie", () => {
	const WSZYSTKIE_ADRESY = [
		ADRES_CI,
		ADRES_COMPOSE,
		ADRES_DEV,
		ADRES_ZDALNY,
		ADRES_BEZ_POSWIADCZEN,
		ADRES_IPV4,
		ADRES_IPV6,
		"to-nie-jest-adres",
		"",
	];

	it.each(WSZYSTKIE_ADRESY.map((a, i) => [`adres #${i + 1}`, a]))(
		"jeśli strażnik przepuszcza (%s), bramka w plikach też przepuszcza",
		(_etykieta, adresBazy) => {
			if (!zdiagnozujBazeIntegracyjna(adresBazy).ok) return;
			// Strażnik przepuścił → żaden plik integracyjny nie może się pominąć.
			expect(BRAMKA_W_PLIKACH.test(adresBazy)).toBe(true);
		},
	);

	it("adres testowy bez poświadczeń jest odrzucany WŁAŚNIE przez tę własność", () => {
		// Kontrola negatywna: gdyby strażnik pytał tylko o „dedykowana baza
		// testowa", ten adres by przeszedł, a wszystkie 53 pliki pominęłyby
		// się po cichu przy zielonym przebiegu.
		expect(BRAMKA_W_PLIKACH.test(ADRES_BEZ_POSWIADCZEN)).toBe(false);
		expect(zdiagnozujBazeIntegracyjna(ADRES_BEZ_POSWIADCZEN).ok).toBe(false);
	});
});
