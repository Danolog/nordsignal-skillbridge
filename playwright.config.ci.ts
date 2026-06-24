import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * Konfiguracja Playwright DLA CI — wariant joba `e2e-llm` (.github/workflows/pr.yml).
 *
 * Różni się od bazowej (playwright.config.ts) JEDNYM, świadomym punktem: tutaj
 * Playwright SAM podnosi serwer aplikacji (`webServer`), bo runner CI ma już
 * bezpieczną bazę TESTOWĄ (usługa Postgres w jobie, nie prod-Neon). Bazowy config
 * trzyma `webServer` wyłączony — to lokalny bezpiecznik (lokalny `.env.local`
 * celuje w prod, więc lokalnie serwer podnosisz świadomie sam). Tego bezpiecznika
 * NIE ruszamy; CI to osobny, jawny tor.
 *
 * Topologia serwera = `next start` na artefakcie `next build` (decyzja Ethana Z6 §3,
 * ryzyko R2): NIE `next dev`/turbopack. Powód: `next dev` cold-kompiluje pierwszy
 * uwierzytelniony hit (~10 s) i łamie `waitForURL` (niedeterminizm, nie flak do
 * retry). `next start` serwuje gotowy artefakt produkcyjny — deterministycznie.
 *
 * Bezpiecznik bazy zostaje podwójny:
 *  - `helpers/guards.ts` (dbWriteTest) wywala test, gdy PLAYWRIGHT_BASE_URL to host prod;
 *  - serwer w jobie startuje z DATABASE_URL usługi testowej (localhost), nigdy prod.
 *
 * Aktywny TYLKO pod CI (job ustawia env). Lokalnie nie używaj tego configu —
 * używaj bazowego (playwright.config.ts) wg tests/e2e-pw/README.md.
 */

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
	...base,
	use: {
		...base.use,
		baseURL,
	},
	// Playwright buduje i startuje aplikację, czeka aż odpowie, dopiero potem testy.
	// `next build` już zrobiony w kroku joba (cache artefaktu .next) — tutaj tylko start.
	webServer: {
		command: "pnpm start",
		url: baseURL,
		reuseExistingServer: false,
		// `next start` na zimnym artefakcie wstaje szybko, ale dajemy zapas na CI.
		timeout: 120_000,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			PORT: String(PORT),
		},
	},
});
