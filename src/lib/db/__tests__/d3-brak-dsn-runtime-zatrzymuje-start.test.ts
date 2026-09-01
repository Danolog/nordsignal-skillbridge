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
 * Sprawdzana jest ROLA warunku (start pada / start przechodzi) w czterech
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
	// Owner DSN musi zostać — bez niego moduł i tak nie ma czego użyć jako
	// fallbacku, a testujemy zachowanie przy BRAKU dedykowanego DSN runtime.
	ustaw("DATABASE_URL", "postgresql://localhost:5432/test");
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
	it("na produkcji BEZ zmiennej: import modułu bazy PADA (nie ostrzega)", async () => {
		ustaw("NODE_ENV", "production");

		await expect(import(SCIEZKA_MODULU)).rejects.toThrow(/DATABASE_URL_RUNTIME/);
	});

	it("na produkcji BEZ zmiennej: komunikat nazywa ryzyko roli właściciela", async () => {
		ustaw("NODE_ENV", "production");

		// Treść bierzemy ze ŹRÓDŁA reguły, nie z literału w teście — dlatego
		// moduł ładujemy dwa razy: raz po komunikat (ze stanem, w którym się
		// nie wywraca), raz po zachowanie.
		ustaw("DATABASE_URL_RUNTIME", "postgresql://localhost:5432/test?application_name=app_runtime");
		const { KOMUNIKAT_BRAK_DSN_RUNTIME } = await import(SCIEZKA_MODULU);
		expect(KOMUNIKAT_BRAK_DSN_RUNTIME).toMatch(/WŁAŚCICIELA/);

		vi.resetModules();
		ustaw("DATABASE_URL_RUNTIME", undefined);
		await expect(import(SCIEZKA_MODULU)).rejects.toThrow(KOMUNIKAT_BRAK_DSN_RUNTIME);
	});

	it("na produkcji Z ustawioną zmienną: import przechodzi i oddaje klienta runtime", async () => {
		ustaw("NODE_ENV", "production");
		ustaw("DATABASE_URL_RUNTIME", "postgresql://localhost:5432/test?application_name=app_runtime");

		const modul = await import(SCIEZKA_MODULU);
		expect(modul.dbRuntime).toBeDefined();
	});

	it("w FAZIE BUDOWANIA (next build) BEZ zmiennej: import przechodzi — inaczej bramka `build` w CI byłaby czerwona", async () => {
		// Pomiar 2026-09-01 (`pnpm build` z env jobu `build` z pr.yml, sonda w
		// src/lib/db/index.ts, 14 wywołań): NODE_ENV=production,
		// NEXT_PHASE=phase-production-build, brak DATABASE_URL_RUNTIME.
		ustaw("NODE_ENV", "production");
		ustaw("NEXT_PHASE", "phase-production-build");

		const modul = await import(SCIEZKA_MODULU);
		expect(modul.dbRuntime).toBeDefined();
	});

	it("poza produkcją BEZ zmiennej: import przechodzi (Faza 1 to świadomy stan dev)", async () => {
		ustaw("NODE_ENV", "development");
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const modul = await import(SCIEZKA_MODULU);

		expect(modul.dbRuntime).toBeDefined();
		expect(warn).toHaveBeenCalledTimes(1);
	});
});
