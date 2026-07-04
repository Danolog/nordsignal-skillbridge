// tools/run-sql-file.ts
// Wykonuje plik .sql (wiele instrukcji, transakcyjny) przez klienta `pg` —
// ten sam, którego używa drizzle-orm/node-postgres w repo.
// Połączenie: process.env.DATABASE_URL (SSL z samego DSN, jak w src/lib/db/index.ts).
// DSN NIE jest nigdzie drukowany.
//
// Użycie:  DATABASE_URL="postgres://…" pnpm exec tsx tools/run-sql-file.ts <plik.sql>
//
// 0.14: przed połączeniem przechodzi przez assertTestDb — zdalny host wymaga
// CONFIRM_PROD_DB=1 (świadoma decyzja operatora), a produkcyjny fragment DSN jest
// hard-deny. Wcześniej skrypt (jako .mjs) łączył się z DOWOLNYM DATABASE_URL bez
// guarda — dowolny plik .sql leciał na prod jednym `node`. Konwersja .mjs→.ts pozwala
// reużyć wspólny, przetestowany guard (bez duplikacji logiki), spójnie z db-guard-*.
// Logika async w main() (nie top-level await) — repo nie jest ESM (package.json bez
// "type":"module"), więc tsx transpiluje .ts do CJS; wzorzec jak w innych tools.
//
// Plik SQL ma własne BEGIN…COMMIT. `pg` Client.query(treść) używa prostego
// protokołu i wykonuje wiele instrukcji jednym przebiegiem; jeśli któraś
// instrukcja zawiedzie, Postgres przerywa transakcję, a COMMIT staje się
// ROLLBACK — więc nic się częściowo nie zapisze.

import { readFileSync } from "node:fs";
import pg from "pg";
import { assertTestDb } from "./assert-test-db";

const file = process.argv[2];
const dbUrl = process.env.DATABASE_URL;
if (!file) {
	console.error("Użycie: pnpm exec tsx tools/run-sql-file.ts <plik.sql>");
	process.exit(1);
}
if (!dbUrl) {
	console.error("Brak DATABASE_URL w środowisku.");
	process.exit(1);
}

// 0.14: guard bezpieczeństwa PRZED nawiązaniem połączenia i wykonaniem SQL.
// Rzuca (i przerywa proces) dla zdalnego hosta bez CONFIRM_PROD_DB=1 lub prod-DSN.
assertTestDb(dbUrl, "DATABASE_URL");

async function main(): Promise<void> {
	// 0.15/E2 (follow-up audytu 0.14): odczyt pliku w try — brak/zły plik daje czysty
	// komunikat i exit 1 zamiast unhandled rejection.
	let sqlText: string;
	try {
		sqlText = readFileSync(file as string, "utf8");
	} catch (e) {
		console.error("BŁĄD odczytu pliku SQL:", (e as Error).message);
		process.exitCode = 1;
		return;
	}
	const client = new pg.Client({ connectionString: dbUrl });
	try {
		await client.connect();
		await client.query(sqlText);
		// Sanity po imporcie (read-only) — nie zakłada nazwy tabeli twardo:
		try {
			const r = await client.query(
				"SELECT count(*)::int AS rows, count(distinct career_goal)::int AS goals FROM job_market_data",
			);
			console.log(
				`OK — wykonano ${file}. job_market_data: ${r.rows[0].rows} wierszy / ${r.rows[0].goals} celów.`,
			);
		} catch {
			console.log(`OK — wykonano ${file}.`);
		}
	} catch (e) {
		console.error("BŁĄD wykonania SQL (transakcja wycofana):", (e as Error).message);
		process.exitCode = 1;
	} finally {
		await client.end();
	}
}

main();
