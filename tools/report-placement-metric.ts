import { config } from "dotenv";
import { Pool } from "pg";
import { raportTekstowy, zbierzMiernik } from "../src/lib/curriculum/placement-metric";

config({ path: ".env.local" });

// 1E.7 / DŁUG D11 — odczyt miernika placementu (jedyny zapisany odczyt).
// Read-only. Uruchomienie:
//   pnpm tsx tools/report-placement-metric.ts [kohorta]
// Bez argumentu czyta wszystkie kohorty; obie postacie są fail-closed, bo liczą
// wyłącznie osoby wpisane do rejestru uczestników (`pilot_participants`).
//
// ⚠ TEN PLIK NIE ZNA REGUŁY WYŁĄCZENIA. Cała reguła („co jest obserwacją") żyje
// w `klasyfikujZdarzenie` w src/lib/curriculum/placement-metric.ts i ma tam
// dokładnie jeden nośnik — strażnik `placement-metric-one-reader.test.ts` pilnuje,
// żeby drugi nie powstał. Tutaj jest wyłącznie połączenie i wypisanie.
//
// Ograniczeń wnioskowania (D5b) nie da się pominąć: `raportTekstowy` wypisuje je
// PRZED liczbami i jest jedyną drogą, którą liczba opuszcza tamten moduł.

const kohorta = process.argv[2] ?? null;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
	const client = await pool.connect();
	try {
		const miernik = await zbierzMiernik(
			async (sql, params) => (await client.query(sql, params)).rows,
			{ kohorta },
		);
		console.log(raportTekstowy(miernik));
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((err) => {
	console.error("[report-placement-metric] błąd:", err);
	process.exit(1);
});
