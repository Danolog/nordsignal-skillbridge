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
					exclude: ["**/node_modules/**", "**/dist/**", INTEGRATION_GLOB],
				},
			},
			{
				// Projekt INTEGRATION — uruchamiany TYLKO w jobie `integration` (ma Postgres
				// + db:migrate + db:seed). Komenda: `pnpm exec vitest run --project integration`
				// (skrypt `test:integration`). Bez zmigrowanej bazy testy się POMIJAJĄ
				// (strażnik isLocalTestDb w samym pliku — druga linia obrony).
				plugins: [tsconfigPaths(), react()],
				test: {
					name: "integration",
					environment: "node",
					globals: true,
					setupFiles: ["./src/test/setup.ts"],
					css: true,
					include: [INTEGRATION_GLOB],
					exclude: ["**/node_modules/**", "**/dist/**"],
				},
			},
		],
	},
});
