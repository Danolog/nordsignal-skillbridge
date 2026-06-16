// Lokalny runner testów integracyjnych: ładuje .env.test do procesu, potem odpala
// projekt `integration` vitesta. Po co osobny plik (a nie `pnpm test:integration`):
// vitest.config.mts NIE ładuje .env.test — bez DATABASE_URL w env testy się POMIJAJĄ
// (strażnik isLocalTestDb), więc lokalnie trzeba wstrzyknąć sekret. Dotenv robi to do
// env potomka, dzięki czemu DATABASE_URL NIE pojawia się w komendzie (brak wycieku do
// transkryptu agenta). CI ustawia DATABASE_URL samodzielnie i woła test:integration.
// Spójny wzorzec z tools/migrate-test.ts (dotenv + .env.test).
import { execSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.test" });
const pattern = process.argv[2] ?? "";
const cmd = pattern
	? `pnpm exec vitest run --project integration ${pattern}`
	: "pnpm exec vitest run --project integration";
execSync(cmd, { stdio: "inherit", env: process.env });
