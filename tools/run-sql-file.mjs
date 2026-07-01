// tools/run-sql-file.mjs
// Wykonuje plik .sql (wiele instrukcji, transakcyjny) przez klienta `pg` —
// ten sam, którego używa drizzle-orm/node-postgres w repo.
// Połączenie: process.env.DATABASE_URL (SSL z samego DSN, jak w src/lib/db/index.ts).
// DSN NIE jest nigdzie drukowany.
//
// Użycie:  DATABASE_URL="postgres://…" node tools/run-sql-file.mjs <plik.sql>
//
// Plik SQL ma własne BEGIN…COMMIT. `pg` Client.query(treść) używa prostego
// protokołu i wykonuje wiele instrukcji jednym przebiegiem; jeśli któraś
// instrukcja zawiedzie, Postgres przerywa transakcję, a COMMIT staje się
// ROLLBACK — więc nic się częściowo nie zapisze.

import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
	console.error("Użycie: node tools/run-sql-file.mjs <plik.sql>");
	process.exit(1);
}
if (!process.env.DATABASE_URL) {
	console.error("Brak DATABASE_URL w środowisku.");
	process.exit(1);
}

const sqlText = readFileSync(file, "utf8");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

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
	console.error("BŁĄD wykonania SQL (transakcja wycofana):", e.message);
	process.exitCode = 1;
} finally {
	await client.end();
}
