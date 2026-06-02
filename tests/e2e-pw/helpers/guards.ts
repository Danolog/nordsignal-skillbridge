import { test as base } from "@playwright/test";

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
 * publiczny prod, test się WYWALA z jasnym komunikatem.
 */
const ALLOW_DB_WRITES = process.env.E2E_ALLOW_DB_WRITES === "1";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const PROD_HOST_FRAGMENTS = [
	"skill-bridge-ai.vercel.app",
	"skillbridge.nordsignal",
	"nordsignal.cc",
];

export const dbWriteTest = base.extend<{ _dbWriteGuard: void }>({
	_dbWriteGuard: [
		// biome-ignore lint/correctness/noEmptyPattern: idiom fixture Playwright — auto-fixture nie potrzebuje innych fixture.
		async ({}, use) => {
			// test.skip() w auto-fixture pomija bieżący test, gdy brak flagi.
			dbWriteTest.skip(
				!ALLOW_DB_WRITES,
				"Test zapisujący do bazy/wołający model pominięty: ustaw E2E_ALLOW_DB_WRITES=1 i wskaż bazę testową.",
			);
			const onProd = PROD_HOST_FRAGMENTS.some((frag) => BASE_URL.includes(frag));
			if (ALLOW_DB_WRITES && onProd) {
				throw new Error(
					`ODMOWA: E2E_ALLOW_DB_WRITES=1 przy URL produkcji (${BASE_URL}). ` +
						"Testy zapisujące wolno odpalać tylko na bazie testowej (lokalny dev / preview z testową bazą).",
				);
			}
			await use();
		},
		{ auto: true },
	],
});

export { base as test };
