/**
 * db-guard-push — wrapper guarda dla `pnpm db:push`.
 *
 * drizzle-kit push zapisuje schemat bezpośrednio do bazy (bez migracji) —
 * szczególnie niebezpieczne na prod. Guard blokuje, gdy DATABASE_URL
 * wskazuje na zdalny host bez flagi CONFIRM_PROD_DB=1.
 *
 * Logika guarda (patrz tools/assert-test-db.ts):
 *   - Host lokalny (localhost/127.0.0.1/::1) → przechodzi cicho
 *   - Host zdalny + CONFIRM_PROD_DB=1 → przechodzi z ostrzeżeniem
 *   - Host zdalny + brak flagi → ABORT
 *   - Hard-deny fragment prod → ABORT bezwarunkowo
 *
 * Użycie (PowerShell):
 *   pnpm db:push                                      ← lokalny host → OK
 *   $env:CONFIRM_PROD_DB=1; pnpm db:push              ← zdalny/prod → OK
 */

import { execSync } from "node:child_process";
import { config } from "dotenv";
import { assertTestDb } from "./assert-test-db";

// Guard biegnie PRZED drizzle-kit, więc musi sam wczytać .env.local — inaczej
// DATABASE_URL jest puste i guard przerywa, zanim config drizzle go załaduje.
// dotenv nie nadpisuje zmiennych już obecnych w środowisku (eksport z shella wygrywa).
config({ path: ".env.local" });

try {
	assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");
} catch (e) {
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

console.log("[db-guard-push] Guard OK — uruchamiam drizzle-kit push...");

try {
	execSync("pnpm exec drizzle-kit push", {
		stdio: "inherit",
		env: process.env,
	});
} catch {
	process.exit(1);
}
