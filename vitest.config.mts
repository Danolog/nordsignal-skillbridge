import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Wzorzec testów integracyjnych — wymagają zmigrowanej bazy testowej (kontener postgres:16).
// Wydzielone do osobnego projektu, żeby job `test` (unit, bez Postgresa) ich NIE odpalał:
// placeholder DATABASE_URL=...@localhost:5432/test trafiałby w strażnik isLocalTestDb i
// próbował połączyć się z nieistniejącą bazą.
const INTEGRATION_GLOB = "**/*.integration.test.{ts,tsx}";

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		// Wspólna konfiguracja dla wszystkich projektów.
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		css: true,
		projects: [
			{
				// Projekt UNIT — domyślny dla `pnpm test` / `pnpm test:run` (job `test` w CI).
				// Integracja WYKLUCZONA: nie dotyka bazy, działa bez Postgresa.
				plugins: [tsconfigPaths(), react()],
				test: {
					name: "unit",
					environment: "node",
					globals: true,
					setupFiles: ["./src/test/setup.ts"],
					css: true,
					include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/unit/**/*.{test,spec}.{ts,tsx}"],
					exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**", INTEGRATION_GLOB],
				},
			},
			{
				// Projekt EVALS (AG.0) — harness ewaluacyjny gap detection. Uruchamiany
				// WYŁĄCZNIE ręcznie/`pnpm test:evals` (poza test:run i CI), bo suity LLM
				// kosztują wywołania API. Bez ANTHROPIC_API_KEY suity LLM jawnie się
				// pomijają; część deterministyczna biegnie zawsze. Setup dołącza dotenv
				// (vitest sam nie czyta .env).
				plugins: [tsconfigPaths(), react()],
				test: {
					name: "evals",
					environment: "node",
					globals: true,
					setupFiles: ["./src/test/setup.ts", "./tests/evals/setup.ts"],
					css: true,
					include: ["tests/evals/**/*.eval.test.{ts,tsx}"],
					exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**"],
					// Wywołania LLM (45 s timeout per call) + fan-out w beforeAll.
					testTimeout: 60_000,
					hookTimeout: 300_000,
				},
			},
			{
				// Projekt INTEGRATION — uruchamiany w jobie `integration` (ma Postgres
				// + db:migrate + db:seed). Komenda: `pnpm test:integration`.
				//
				// TWARDY WARUNEK WSTĘPNY (2026-08-06). Bez bazy testowej przebieg PADA
				// — nie pomija się. Do 2026-08-06 brak DATABASE_URL dawał przebieg
				// zakończony kodem 0 z podsumowaniem „388 skipped", które wyglądało jak
				// sukces; to była przyczyna, dla której trzy atrapy-strażniki przeżyły
				// w kodzie do 2026-08-01. Warunek sprawdza się RAZ, przed zebraniem
				// plików, i wypisuje instrukcję postawienia bazy.
				// Bramki `describe.skip` w samych plikach zostają jako martwa druga
				// warstwa — strażnik jest od nich ostrzejszy, więc już nie zadziałają.
				plugins: [tsconfigPaths(), react()],
				test: {
					name: "integration",
					environment: "node",
					globalSetup: ["./src/test/integration-db-guard.ts"],
					// Pliki sekwencyjnie: testy współdzielą jedną bazę :5433 i te same
					// tabele (np. market-refresh: ingest + decision piszą staging/runy) —
					// równoległość plików = wzajemne kasowanie stanu w beforeEach.
					fileParallelism: false,
					globals: true,
					setupFiles: ["./src/test/setup.ts"],
					css: true,
					include: [INTEGRATION_GLOB],
					exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**"],
				},
			},
		],
	},
});
