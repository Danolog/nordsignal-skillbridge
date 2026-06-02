/**
 * migrate-test — migracja schematu na BAZIE TESTOWEJ z guardem allowlisty.
 *
 * Uruchom przez: pnpm db:migrate:test
 *
 * Ładuje .env.test (connection string kontenera testowego), następnie uruchamia
 * guard assertTestDb (allowlista localhost/127.0.0.1/::1). Jeśli DATABASE_URL
 * wskazuje na cokolwiek spoza allowlisty — przerywa z czytelnym błędem, zanim
 * dotknie bazy.
 *
 * Produkcyjna ścieżka db:migrate (drizzle.config.ts + .env.local) jest NIEZMIENIONA.
 *
 * PowerShell (nie bash):
 *   $env:DATABASE_URL="postgres://user:pass@localhost:5432/skillbridge_test"
 *   pnpm db:migrate:test
 *   — lub bez ręcznego ustawiania, jeśli .env.test zawiera DATABASE_URL.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { assertTestDb } from "./assert-test-db";

// Załaduj .env.test (jeśli istnieje) — NIE nadpisuje zmiennych już ustawionych
// w procesie (np. $env:DATABASE_URL ustawionego ręcznie w PowerShell).
const ENV_TEST_PATH = ".env.test";
if (existsSync(ENV_TEST_PATH)) {
	config({ path: ENV_TEST_PATH });
} else {
	console.warn("[migrate-test] Brak .env.test — używam DATABASE_URL z procesu (jeśli ustawiona).");
}

// Guard: allowlista hostów testowych (localhost / 127.0.0.1 / ::1).
// Przerywa z czytelnym błędem, jeśli DATABASE_URL wskazuje na cokolwiek innego.
assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");

console.log(
	"[migrate-test] Guard OK — baza testowa zatwierdzona, uruchamiam drizzle-kit migrate...",
);

// Uruchom drizzle-kit migrate — używa drizzle.config.ts, który czyta DATABASE_URL
// z procesu (dotenv nie nadpisze już-ustawionego env). Dzięki temu config pozostaje
// NIEZMIENIONY, a ścieżka prod db:migrate (czyta .env.local) działa jak dawniej.
try {
	execSync("pnpm exec drizzle-kit migrate", {
		stdio: "inherit",
		env: process.env,
	});
} catch (e) {
	console.error("[migrate-test] drizzle-kit migrate zakończył się błędem:", e);
	process.exit(1);
}

console.log("[migrate-test] Migracja testowa zakończona.");
