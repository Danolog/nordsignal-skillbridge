import { defineConfig, devices } from "@playwright/test";

/**
 * Konfiguracja Playwright dla pakietu smoke CareerEDGE (Beta).
 *
 * BEZPIECZEŃSTWO — czytaj zanim uruchomisz:
 *  - `.env.local` w tym repo celuje w PRODUKCYJNĄ bazę Neon. Pakiet ma dwie
 *    grupy testów oznaczone tagami:
 *      @safe   — publiczne, read-only, BEZ zapisu do bazy i BEZ kosztu LLM
 *                (landing, /login, /signup, panel wykładowcy, bramka auth).
 *      @dbwrite — przepływy które TWORZĄ/ZMIENIAJĄ dane studenta albo wołają
 *                model (B0 czat+podsumowanie, B1 paszport, B4 samoocena,
 *                dashboard). Wymagają osobnej bazy testowej.
 *  - Grupa @dbwrite jest pomijana, DOPÓKI nie ustawisz E2E_ALLOW_DB_WRITES=1.
 *    To zawór bezpieczeństwa — bez niego testy zapisujące nie wystartują, więc
 *    przypadkowe odpalenie nie dotknie produkcji.
 *
 * URL aplikacji: PLAYWRIGHT_BASE_URL (domyślnie http://localhost:3000).
 *  - Domyślnie NIE startujemy serwera (webServer wyłączony), bo lokalny `pnpm dev`
 *    bierze `.env.local` = prod. Serwer podnosisz świadomie sam, wskazując bazę
 *    testową (instrukcja w tests/e2e-pw/README.md).
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
	testDir: "./tests/e2e-pw",
	// Smoke = szybko i deterministycznie. Sekwencyjnie, by uniknąć kolizji danych
	// w jednej bazie i flaków przy współdzielonym serwerze dev.
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
	timeout: 30_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "off",
		locale: "pl-PL",
	},
	projects: [
		{
			name: "chromium",
			// PLAYWRIGHT_CHANNEL=chrome → systemowa przeglądarka zamiast pobieranej
			// (Playwright 1.60 nie publikuje chromium dla ubuntu 26.04 — WSL Darka).
			// Bez env zachowanie bez zmian (CI pobiera chromium jak dotąd).
			use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
		},
	],
});
