import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D3 (fala 1) — strażnik reguły: BRAK `DATABASE_URL_RUNTIME` ZATRZYMUJE START
 * NA PRODUKCJI.
 *
 * Reguła ma JEDEN nośnik — `src/lib/db/index.ts` (blok pod `runtimeUrl`).
 * Ten plik jej nie powtarza, tylko ją woła: importuje moduł i sprawdza, czy
 * import się wywraca. Nie asercjonuje treści komunikatu literałem — komunikat
 * jest eksportowany ze źródła (`KOMUNIKAT_BRAK_DSN_RUNTIME`), więc test nie da
 * się zazielenić przez przepisanie zdania w innym miejscu.
 *
 * DLACZEGO TO NIE JEST TEST NA OBECNOŚĆ NAPISU
 * --------------------------------------------
 * Sprawdzana jest ROLA warunku (start pada / start przechodzi) w siedmiu
 * różnych stanach środowiska, a nie to, czy w pliku stoi słowo „throw".
 * Mutacja, która osłabia warunek, przewraca dokładnie nazwany test niżej —
 * dowód mutacyjny w zgłoszeniu.
 *
 * KONTROLA LICZNOŚCI
 * ------------------
 * Test „import przechodzi" jest wart tyle, ile dowód, że coś do niego dotarło.
 * Dlatego przypadki pozytywne sprawdzają dodatkowo, że moduł faktycznie
 * wyeksportował `dbRuntime` — nie samo „brak wyjątku".
 */

const SCIEZKA_MODULU = "@/lib/db";

/** Stan zmiennych, które ten strażnik przestawia — przywracany po każdym teście. */
const KLUCZE = ["NODE_ENV", "NEXT_PHASE", "DATABASE_URL_RUNTIME", "DATABASE_URL"] as const;
let kopia: Partial<Record<(typeof KLUCZE)[number], string | undefined>> = {};

// `process.env.NODE_ENV` jest w typach tylko do odczytu — a ten strażnik musi
// je przestawiać, bo cała reguła D3 jest o zachowaniu przy NODE_ENV=production.
const env = process.env as Record<string, string | undefined>;

function ustaw(klucz: (typeof KLUCZE)[number], wartosc: string | undefined) {
	if (wartosc === undefined) {
		delete env[klucz];
	} else {
		env[klucz] = wartosc;
	}
}

beforeEach(() => {
	kopia = Object.fromEntries(KLUCZE.map((k) => [k, env[k]]));
	vi.resetModules();
	// Stan bazowy: DSN awaryjny wskazuje bazę ZDALNĄ (host spoza allowlisty
	// lokalnej) — czyli sytuację produkcyjną. Testy, które badają drugi człon,
	// nadpisują to własnym DSN.
	ustaw("DATABASE_URL", "postgresql://db.przyklad.invalid:5432/skillbridge");
	ustaw("DATABASE_URL_RUNTIME", undefined);
	ustaw("NEXT_PHASE", undefined);
});

afterEach(() => {
	for (const k of KLUCZE) ustaw(k, kopia[k]);
	vi.resetModules();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe("D3 — DATABASE_URL_RUNTIME jako warunek startu", () => {
	it("CZŁON 1 — na produkcji, na bazie zdalnej, BEZ zmiennej: import modułu bazy PADA (nie ostrzega)", async () => {
		ustaw("NODE_ENV", "production");

		await expect(import(SCIEZKA_MODULU)).rejects.toThrow(/DATABASE_URL_RUNTIME/);
	});

	it("na produkcji BEZ zmiennej: komunikat nazywa ryzyko roli właściciela", async () => {
		ustaw("NODE_ENV", "production");

		// Treść bierzemy ze ŹRÓDŁA reguły, nie z literału w teście — dlatego
		// moduł ładujemy dwa razy: raz po komunikat (ze stanem, w którym się
		// nie wywraca), raz po zachowanie.
		ustaw("DATABASE_URL_RUNTIME", "postgresql://db.przyklad.invalid:5432/skillbridge");
		const { KOMUNIKAT_BRAK_DSN_RUNTIME } = await import(SCIEZKA_MODULU);
		expect(KOMUNIKAT_BRAK_DSN_RUNTIME).toMatch(/WŁAŚCICIELA/);

		vi.resetModules();
		ustaw("DATABASE_URL_RUNTIME", undefined);
		await expect(import(SCIEZKA_MODULU)).rejects.toThrow(KOMUNIKAT_BRAK_DSN_RUNTIME);
	});

	it("na produkcji Z ustawioną zmienną: import przechodzi i oddaje klienta runtime", async () => {
		ustaw("NODE_ENV", "production");
		ustaw("DATABASE_URL_RUNTIME", "postgresql://db.przyklad.invalid:5432/skillbridge");

		const modul = await import(SCIEZKA_MODULU);
		expect(modul.dbRuntime).toBeDefined();
	});

	it("CZŁON 2 — na produkcji, ale na DEDYKOWANEJ LOKALNEJ bazie testowej: import przechodzi", async () => {
		// To jest stan sześciu jobów przeglądarkowych CI: serwują artefakt
		// produkcyjny (`pnpm start` = `next start`, czyli NODE_ENV=production)
		// przeciwko bazie testowej na pętli zwrotnej, bez DATABASE_URL_RUNTIME.
		// Wersja tej zmiany bez tego członu położyła je wszystkie — odczyt
		// z dziennika zgłoszenia #357 z 2026-09-01, job a11y-exam:
		//   [WebServer] ⨯ Error: [db] DATABASE_URL_RUNTIME nieustawione…
		ustaw("NODE_ENV", "production");
		ustaw("DATABASE_URL", "postgresql://localhost:5432/skillbridge_test");

		const modul = await import(SCIEZKA_MODULU);
		expect(modul.dbRuntime).toBeDefined();
	});

	it("na produkcji z DSN NIEPARSEOWALNYM: import PADA (fail-closed — brak wiedzy nie otwiera furtki)", async () => {
		ustaw("NODE_ENV", "production");
		ustaw("DATABASE_URL", "to-nie-jest-dsn");

		await expect(import(SCIEZKA_MODULU)).rejects.toThrow(/DATABASE_URL_RUNTIME/);
	});

	it("na produkcji, na LOKALNYM hoście, ale NIE-testowej bazie: import PADA (nazwa bazy też się liczy)", async () => {
		ustaw("NODE_ENV", "production");
		ustaw("DATABASE_URL", "postgresql://localhost:5432/skillbridge");

		await expect(import(SCIEZKA_MODULU)).rejects.toThrow(/DATABASE_URL_RUNTIME/);
	});

	it("CZŁON 1 — poza produkcją BEZ zmiennej: import przechodzi (Faza 1 to świadomy stan dev)", async () => {
		ustaw("NODE_ENV", "development");
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const modul = await import(SCIEZKA_MODULU);

		expect(modul.dbRuntime).toBeDefined();
		expect(warn).toHaveBeenCalledTimes(1);
	});
});
