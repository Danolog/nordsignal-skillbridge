import { test as base } from "@playwright/test";
import { sprawdzAdresDlaZapisow, ZMIENNA_ZDALNEGO_HOSTA } from "./base-url-policy";

/**
 * Zawory bezpieczeństwa dla pakietu E2E.
 *
 * `dbWriteTest` — osobny wariant test() (base.extend z auto-fixture) dla
 * przepływów, które ZAPISUJĄ dane studenta albo wołają model (koszt LLM).
 * Pomija się sam, dopóki nie ustawisz E2E_ALLOW_DB_WRITES=1. To celowy
 * „bezpiecznik": bez jawnej flagi żaden test zapisujący nie ruszy, więc nie da
 * się przypadkiem zapisać do prod-bazy Neon (na którą celuje .env.local).
 *
 * Auto-fixture (zamiast globalnego beforeEach) gwarantuje, że skip dotyczy
 * WYŁĄCZNIE testów importujących dbWriteTest — nie zanieczyszcza globalnego
 * test() (np. grupy @safe). Skip odpala ZANIM ciało testu zaloguje się do bazy.
 *
 * Dodatkowo: jeśli E2E_ALLOW_DB_WRITES=1, ale PLAYWRIGHT_BASE_URL wskazuje
 * cokolwiek spoza środowiska lokalnego, test się WYWALA z jasnym komunikatem.
 *
 * Reguła adresu ma JEDEN nośnik — `./base-url-policy.ts`. Tutaj jest tylko jej
 * wywołanie. Poprzednia wersja trzymała w tym pliku listę zakazanych fragmentów
 * adresu produkcji, która w prawdziwy adres produkcji nie trafiała ani razu
 * (pomiar Ryan/CRCO 2026-08-12 — szczegóły w nośniku reguły).
 */
const ALLOW_DB_WRITES = process.env.E2E_ALLOW_DB_WRITES === "1";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// biome-ignore lint/suspicious/noConfusingVoidType: idiom fixture Playwright — void jest wymagany przez base.extend<T> gdy fixture nie zwraca wartości.
export const dbWriteTest = base.extend<{ _dbWriteGuard: void }>({
	_dbWriteGuard: [
		// biome-ignore lint/correctness/noEmptyPattern: idiom fixture Playwright — auto-fixture nie potrzebuje innych fixture.
		async ({}, use) => {
			// test.skip() w auto-fixture pomija bieżący test, gdy brak flagi.
			dbWriteTest.skip(
				!ALLOW_DB_WRITES,
				"Test zapisujący do bazy/wołający model pominięty: ustaw E2E_ALLOW_DB_WRITES=1 i wskaż bazę testową.",
			);
			if (ALLOW_DB_WRITES) {
				sprawdzAdresDlaZapisow(BASE_URL, process.env[ZMIENNA_ZDALNEGO_HOSTA]);
			}
			await use();
		},
		{ auto: true },
	],
});

export { base as test };
