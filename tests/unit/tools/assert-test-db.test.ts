import pg from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertTestDb, isDedicatedTestDbUrl, parseDbHost } from "../../../tools/assert-test-db";

// 0.14 — guard bezpieczeństwa bazy był NIETESTOWANY, a zależy od niego run-sql-file
// (i db-guard-*). Pokrywamy ścieżki decyzyjne obu polityk + parsowanie hosta.
//
// 2026-08-12 (Ryan/CRCO) — poprzednia wersja tego pliku była STRAŻNIKIEM-ATRAPĄ.
// Testowała warstwę „hard-deny" na DSN, który sama zmyśliła
// (`…ep-skill-bridge-ai-123.neon.tech…`), dobranym tak, żeby zawierał szukany
// fragment. Fragment `"skill-bridge-ai"` to nazwa projektu na Vercelu i w adresie
// naszej bazy produkcyjnej NIE WYSTĘPUJE — test świecił się na zielono, a warstwa
// nie broniła przed niczym, co nazywała. Test potwierdzał, że kod robi to, co
// napisano w kodzie; o rzeczywistości nie mówił nic.
//
// Dziś reguła nie zna żadnej nazwy produkcji: przechodzi WYŁĄCZNIE host lokalny.
// Host produkcyjny i host zmyślony leżą więc w tej samej klasie równoważności
// Z KONSTRUKCJI (oba są „nie-lokalne"), i przykład o produkcyjnym KSZTAŁCIE nie
// jest już zgadywaniem. Prawdziwy DSN produkcyjny sprawdzono osobno, sondą na
// żywym środowisku (odczyt `vercel env run -e production`, 2026-08-12): przed
// zmianą „PRZEPUSZCZONY", po zmianie „ZABLOKOWANY". Samego adresu produkcji
// celowo nie publikujemy w repo (repo jest publiczne) — reguła go nie potrzebuje.
//
// DSN-y bez poświadczeń (polityka sekretów) — guard patrzy na host, nie na hasło.

const LOCAL = "postgres://localhost:5432/app";
const LOCAL_IP = "postgres://127.0.0.1:5432/app";
const REMOTE = "postgres://db.example.com:5432/app";
// Kształt zgodny z produkcyjnym punktem dostępowym Neona (endpoint-pooler-region).
const ZDALNY_PUNKT = "ep-przyklad-123-pooler.c-3.eu-central-1.aws.neon.tech";
const PROD_SHAPE = `postgres://${ZDALNY_PUNKT}/neondb`;
/** Polityka B — narzędzie z udokumentowaną ceremonią produkcyjną. */
const CEREMONIA = { allowProduction: true } as const;

beforeEach(() => {
	// Domyślnie brak flag (nie dziedzicz z ambientu CI/dev).
	vi.stubEnv("CONFIRM_PROD_DB", "");
	vi.stubEnv("E2E_ALLOW_REMOTE", "");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

describe("parseDbHost", () => {
	it("parsuje host z DSN postgres/postgresql", () => {
		expect(parseDbHost("postgres://u:p@localhost:5432/db")).toBe("localhost");
		expect(parseDbHost("postgresql://u@db.example.com/db")).toBe("db.example.com");
	});
	it("normalizuje IPv6 (strip nawiasów)", () => {
		expect(parseDbHost("postgresql://u@[::1]:5432/db")).toBe("::1");
	});
	it("zwraca null dla nieparseowalnego DSN", () => {
		expect(parseDbHost("nie-dsn")).toBeNull();
		expect(parseDbHost("mysql://x")).toBeNull();
	});
});

// ── POLITYKA A (domyślna): „to narzędzie nigdy nie tyka produkcji" ──────────
// Sedno naprawy 2026-08-12: odmowy NIE wolno obejść zmienną środowiskową.
// Realny scenariusz, przed którym to broni: operator eksportuje CONFIRM_PROD_DB=1
// do legalnej ceremonii (migracja schemy), a potem w TEJ SAMEJ powłoce odpala
// narzędzie destrukcyjne (np. egzekucję retencji). Flaga jest dziedziczona i nie
// wie, co właśnie uruchomiono — więc to kod narzędzia, nie powłoka, musi decydować.
describe("assertTestDb — polityka domyślna (bez ceremonii produkcyjnej)", () => {
	it("host lokalny → przechodzi cicho (kontrola dodatnia: nie blokujemy pracy)", () => {
		expect(() => assertTestDb(LOCAL)).not.toThrow();
		expect(() => assertTestDb(LOCAL_IP)).not.toThrow();
	});

	it("host lokalny przechodzi TAKŻE przy ustawionych flagach (brak fałszywego alarmu)", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		vi.stubEnv("E2E_ALLOW_REMOTE", "1");
		expect(() => assertTestDb(LOCAL)).not.toThrow();
	});

	it("host zdalny + brak flagi → ODMOWA", () => {
		expect(() => assertTestDb(REMOTE)).toThrow(/ODMOWA/);
	});

	it("host o KSZTAŁCIE produkcyjnym → ODMOWA MIMO CONFIRM_PROD_DB=1", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb(PROD_SHAPE)).toThrow(/ODMOWA/);
	});

	it("host o KSZTAŁCIE produkcyjnym → ODMOWA MIMO E2E_ALLOW_REMOTE=1", () => {
		vi.stubEnv("E2E_ALLOW_REMOTE", "1");
		expect(() => assertTestDb(PROD_SHAPE)).toThrow(/ODMOWA/);
	});

	it("host o KSZTAŁCIE produkcyjnym → ODMOWA MIMO OBU flag naraz", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		vi.stubEnv("E2E_ALLOW_REMOTE", "1");
		expect(() => assertTestDb(PROD_SHAPE)).toThrow(/ODMOWA/);
	});

	it("dowolny inny dostawca zdalny → ODMOWA mimo flag (reguła nie starzeje się z nazwą)", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		// Gdyby produkcja przeniosła się poza Neona, reguła nadal obowiązuje —
		// bo nie zna żadnej nazwy dostawcy, tylko allowlistę hostów lokalnych.
		expect(() => assertTestDb("postgres://baza.inny-dostawca.example/neondb")).toThrow(/ODMOWA/);
		expect(() => assertTestDb("postgres://10.4.0.7:5432/neondb")).toThrow(/ODMOWA/);
	});

	it("komunikat odmowy mówi wprost, że flaga jej nie obchodzi", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb(PROD_SHAPE)).toThrow(/nie obchodzi żadna zmienna środowiskowa/i);
	});

	it("nieparseowalny DSN → ODMOWA nawet z flagą (nie rozumiem = nie przepuszczam)", () => {
		expect(() => assertTestDb("nie-dsn")).toThrow(/ODMOWA/);
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb("nie-dsn")).toThrow(/ODMOWA/);
	});

	it("brak DATABASE_URL → STOP", () => {
		expect(() => assertTestDb(undefined)).toThrow(/nie jest ustawiona/);
	});
});

// ── ROZJAZD WYROCZNI (znalezisko Leo, #298) ────────────────────────────────
// Bramka liczyła host przez `new URL().hostname`, a połączenie zestawiał `pg`.
// Adres z parametrem `?host=` rozjeżdżał te dwie odpowiedzi: bramka widziała
// „localhost", sterownik szedł na produkcję. Przechodziło CICHO — bez flagi,
// bez ostrzeżenia. Dlatego host liczy dziś ten, kto otwiera połączenie.
describe("assertTestDb — host liczy sterownik, nie adres URL", () => {
	// Kształt produkcyjny w parametrze `host=`; sam adres wygląda na lokalny.
	const PODSZYCIE = `postgres://localhost:5432/neondb?host=${ZDALNY_PUNKT}`;

	it("parseDbHost zwraca host, z którym POŁĄCZY SIĘ sterownik, nie ten z adresu", () => {
		expect(new URL(PODSZYCIE).hostname).toBe("localhost"); // co widział stary parser
		expect(parseDbHost(PODSZYCIE)).toBe(ZDALNY_PUNKT); // co widzi bramka dziś
	});

	it("adres lokalny z parametrem host= wskazującym host zdalny → ODMOWA", () => {
		expect(() => assertTestDb(PODSZYCIE)).toThrow(/ODMOWA/);
	});

	it("…także przy obu flagach naraz (polityka domyślna nie ma furtki)", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		vi.stubEnv("E2E_ALLOW_REMOTE", "1");
		expect(() => assertTestDb(PODSZYCIE)).toThrow(/ODMOWA/);
	});

	it("…a w ceremonii wymaga flagi jak każdy inny host zdalny", () => {
		expect(() => assertTestDb(PODSZYCIE, "DATABASE_URL", CEREMONIA)).toThrow(/ABORT/);
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb(PODSZYCIE, "DATABASE_URL", CEREMONIA)).not.toThrow();
	});

	it("kontrola dodatnia: czysty DSN bazy testowej nadal przechodzi", () => {
		expect(() => assertTestDb("postgres://localhost:5433/skillbridge_test")).not.toThrow();
		expect(isDedicatedTestDbUrl("postgres://localhost:5433/skillbridge_test")).toBe(true);
	});

	it("kontrola dodatnia: host= wskazujący z powrotem na localhost NIE jest blokowany", () => {
		// Połączenie faktycznie idzie na localhost, więc odmowa byłaby fałszywym alarmem.
		expect(() => assertTestDb("postgres://example.invalid:5432/app?host=localhost")).not.toThrow();
	});

	it("NAZWA bazy nie ma dziś rozjazdu wyroczni — i to jest pilnowane, nie założone", () => {
		// `isDedicatedTestDbUrl` czyta nazwę bazy ze ścieżki adresu, nie ze sterownika.
		// Zmierzone (pg@8.22): `?dbname=` NIE nadpisuje bazy, więc rozjazdu nie ma.
		// Celowo NIE przechodzimy tu na `Client.database`: przy pustej ścieżce
		// sterownik podstawia nazwę konta systemowego, co uzależniłoby predykat od
		// maszyny. Ta asercja czerwieni się, gdyby sterownik zaczął honorować
		// `?dbname=` — wtedy trzeba wrócić do tej decyzji.
		const podszycie = "postgres://localhost:5433/skillbridge_test?dbname=neondb";
		expect(new pg.Client({ connectionString: podszycie }).database).toBe("skillbridge_test");
		expect(isDedicatedTestDbUrl(podszycie)).toBe(true);
	});

	it("predykat bazy testowej też nie daje się podszyć", () => {
		expect(
			isDedicatedTestDbUrl(`postgres://localhost:5433/skillbridge_test?host=${ZDALNY_PUNKT}`),
		).toBe(false);
	});
});

// ── POLITYKA B (ceremonia): migracja schemy, zaciąg treści, remediacja ──────
// Zachowanie z v0.14 zostaje bez zmian — te narzędzia MAJĄ udokumentowaną
// ceremonię produkcyjną (delegacja v1.12, CLAUDE.md §5). Zmieniło się tylko to,
// że wejście do tej polityki jest deklaracją w kodzie, a nie domyślnym stanem.
describe("assertTestDb — polityka ceremonii produkcyjnej", () => {
	it("host lokalny → przechodzi cicho", () => {
		expect(() => assertTestDb(LOCAL, "DATABASE_URL", CEREMONIA)).not.toThrow();
	});

	it("host zdalny + brak flagi → ABORT z instrukcją", () => {
		expect(() => assertTestDb(REMOTE, "DATABASE_URL", CEREMONIA)).toThrow(/ABORT/);
	});

	it("host zdalny + CONFIRM_PROD_DB=1 → przechodzi (ceremonia Ethana nie jest zepsuta)", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb(REMOTE, "DATABASE_URL", CEREMONIA)).not.toThrow();
		expect(() => assertTestDb(PROD_SHAPE, "DATABASE_URL", CEREMONIA)).not.toThrow();
	});

	// C1 (przegląd Leo, 2026-08-13) — ceremonię otwiera JEDNA flaga, nie dwie.
	// Wcześniej wystarczył `E2E_ALLOW_REMOTE=1`, o którym runbook ceremonii nie
	// wspominał ani słowem: operator czytał dokument mówiący o `CONFIRM_PROD_DB`,
	// a produkcję otwierała mu też flaga odziedziczona w powłoce po testach
	// przeglądarkowych. Druga wyrocznia dla tego samego pytania — usunięta.
	it("E2E_ALLOW_REMOTE=1 NIE otwiera już ceremonii (usunięta druga wyrocznia)", () => {
		vi.stubEnv("E2E_ALLOW_REMOTE", "1");
		expect(() => assertTestDb(REMOTE, "DATABASE_URL", CEREMONIA)).toThrow(/ABORT/);
		expect(() => assertTestDb(PROD_SHAPE, "DATABASE_URL", CEREMONIA)).toThrow(/ABORT/);
	});

	it("…a razem z CONFIRM_PROD_DB=1 decyduje wyłącznie ta druga", () => {
		// Kontrola dodatnia: obecność martwej flagi niczego nie psuje ceremonii.
		vi.stubEnv("E2E_ALLOW_REMOTE", "1");
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb(REMOTE, "DATABASE_URL", CEREMONIA)).not.toThrow();
	});

	it("allowProduction: false jest równoważne polityce domyślnej", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb(PROD_SHAPE, "DATABASE_URL", { allowProduction: false })).toThrow(
			/ODMOWA/,
		);
	});
});

// 1E.7 L2 (dług C1 Leo) — predykat dla bramek pomijania testów integracyjnych.
// Sedno: „lokalny host" NIE wystarcza, bo baza deweloperska też jest lokalna.
// DSN-y bez poświadczeń (polityka sekretów) — predykat patrzy na host i nazwę bazy.
describe("isDedicatedTestDbUrl", () => {
	it("przepuszcza dedykowaną bazę testową (compose :5433 i usługa CI :5432)", () => {
		expect(isDedicatedTestDbUrl("postgresql://localhost:5433/skillbridge_test")).toBe(true);
		expect(isDedicatedTestDbUrl("postgresql://localhost:5432/skillbridge_test")).toBe(true);
		expect(isDedicatedTestDbUrl("postgres://127.0.0.1:5432/test")).toBe(true);
	});

	it("ODRZUCA bazę deweloperską na lokalnym porcie (istota długu C1)", () => {
		expect(isDedicatedTestDbUrl("postgresql://localhost:5432/skillbridge")).toBe(false);
		expect(isDedicatedTestDbUrl("postgres://localhost:5432/app")).toBe(false);
	});

	it("odrzuca host zdalny nawet z nazwą bazy `_test` i pusty/nieparseowalny DSN", () => {
		expect(isDedicatedTestDbUrl("postgres://db.example.com:5432/skillbridge_test")).toBe(false);
		expect(isDedicatedTestDbUrl("nie-dsn")).toBe(false);
		expect(isDedicatedTestDbUrl(undefined)).toBe(false);
		expect(isDedicatedTestDbUrl("")).toBe(false);
	});
});
