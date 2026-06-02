/**
 * db-guard-seed — wrapper guarda dla `pnpm db:seed`.
 *
 * Chroni src/lib/db/seed.ts (który czyta .env.local i może trafić w prod)
 * guardem assertTestDb. Jeśli DATABASE_URL wskazuje na zdalny host bez
 * flagi CONFIRM_PROD_DB=1 — ABORT z instrukcją przed startem seeda.
 *
 * Logika guarda (patrz tools/assert-test-db.ts):
 *   - Host lokalny (localhost/127.0.0.1/::1) → przechodzi cicho (CI OK)
 *   - Host zdalny + CONFIRM_PROD_DB=1 → przechodzi z ostrzeżeniem
 *   - Host zdalny + brak flagi → ABORT
 *   - Hard-deny fragment prod → ABORT bezwarunkowo
 *
 * Użycie (PowerShell):
 *   pnpm db:seed                                      ← lokalny host → OK
 *   $env:CONFIRM_PROD_DB=1; pnpm db:seed              ← zdalny/prod → OK
 */

import { execSync } from "node:child_process";
import { assertTestDb } from "./assert-test-db";

try {
	assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");
} catch (e) {
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

console.log("[db-guard-seed] Guard OK — uruchamiam seed...");

try {
	execSync("pnpm exec tsx src/lib/db/seed.ts", {
		stdio: "inherit",
		env: process.env,
	});
} catch {
	process.exit(1);
}
