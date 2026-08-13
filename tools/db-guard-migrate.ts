/**
 * db-guard-migrate — wrapper guarda dla `pnpm db:migrate`.
 *
 * Zamienia gołe `drizzle-kit migrate` (które nie sprawdza hosta) na
 * wersję chronioną guardem assertTestDb. Jeśli DATABASE_URL wskazuje
 * na zdalny host bez flagi CONFIRM_PROD_DB=1 — ABORT z instrukcją.
 *
 * Logika guarda (patrz tools/assert-test-db.ts):
 *   - Host lokalny (localhost/127.0.0.1/::1) → przechodzi cicho (CI OK)
 *   - Host zdalny + CONFIRM_PROD_DB=1 → przechodzi z ostrzeżeniem
 *   - Host zdalny + brak flagi → ABORT
 *   - Hard-deny fragment prod → ABORT bezwarunkowo
 *
 * Użycie (PowerShell):
 *   pnpm db:migrate                                   ← lokalny host → OK
 *   $env:CONFIRM_PROD_DB=1; pnpm db:migrate           ← zdalny/prod → OK
 *
 * Nie zmieniaj drizzle.config.ts — guard żyje tutaj, nie w configu.
 * db:generate nie używa tego wrappera (nie łączy się z bazą).
 */

import { execSync } from "node:child_process";
import { config } from "dotenv";
import { assertTestDb } from "./assert-test-db";

// Guard biegnie PRZED drizzle-kit, więc musi sam wczytać .env.local — inaczej
// DATABASE_URL jest puste i guard przerywa, zanim config drizzle go załaduje.
// dotenv nie nadpisuje zmiennych już obecnych w środowisku (eksport z shella wygrywa).
config({ path: ".env.local" });

try {
	assertTestDb(process.env.DATABASE_URL, "DATABASE_URL", { allowProduction: true });
} catch (e) {
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

console.log("[db-guard-migrate] Guard OK — uruchamiam drizzle-kit migrate...");

try {
	execSync("pnpm exec drizzle-kit migrate", {
		stdio: "inherit",
		env: process.env,
	});
} catch {
	process.exit(1);
}
