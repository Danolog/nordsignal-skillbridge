import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool } from "pg";
import { raportTekstowy, zbierzMiernik } from "../src/lib/curriculum/placement-metric";

config({ path: ".env.local" });

// 1E.7 / DŁUG D11 — odczyt miernika placementu (jedyny zapisany odczyt).
// Read-only wobec bazy. Uruchomienie:
//   pnpm tsx tools/report-placement-metric.ts [kohorta] [--zapis <ścieżka>]
// Bez argumentu czyta wszystkie kohorty; obie postacie są fail-closed, bo liczą
// wyłącznie osoby wpisane do rejestru uczestników (`pilot_participants`).
//
// `--zapis` utrwala DOKŁADNIE ten sam tekst, który idzie na ekran (razem
// z ograniczeniami wnioskowania i datą odczytu). Powód jest merytoryczny, nie
// wygodowy: liczby z tego miernika NIE SĄ TRWAŁE W CZASIE — skorzystanie przez
// uczestnika z art. 17 RODO kasuje jego wiersz rejestru kaskadą i jego zdarzenia
// przestają być obserwacjami wstecz. Odczyt jest więc zdaniem o KONKRETNEJ chwili
// i albo zostanie zapisany w całości (z datą i z ograniczeniami), albo za miesiąc
// nikt go nie odtworzy. Zapis samej liczby, bez tej obudowy, jest tym samym
// błędem co cytowanie liczby bez daty.
// Plik nie zawiera żadnych identyfikatorów osób — raport ich nie wypisuje.
//
// ⚠ TEN PLIK NIE ZNA REGUŁY WYŁĄCZENIA. Cała reguła („co jest obserwacją") żyje
// w `klasyfikujZdarzenie` w src/lib/curriculum/placement-metric.ts i ma tam
// dokładnie jeden nośnik — strażnik `placement-metric-one-reader.test.ts` pilnuje,
// żeby drugi nie powstał. Tutaj jest wyłącznie połączenie i wypisanie.
//
// Ograniczeń wnioskowania (D5b) nie da się pominąć: `raportTekstowy` wypisuje je
// PRZED liczbami i jest jedyną drogą, którą liczba opuszcza tamten moduł.

const argv = process.argv.slice(2);
const indeksZapisu = argv.indexOf("--zapis");
const sciezkaZapisu = indeksZapisu === -1 ? null : (argv[indeksZapisu + 1] ?? null);
const kohorta = argv[0] && !argv[0].startsWith("--") ? argv[0] : null;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
	if (indeksZapisu !== -1 && !sciezkaZapisu) {
		console.error("--zapis wymaga ścieżki pliku.");
		process.exit(2);
	}
	const client = await pool.connect();
	try {
		const miernik = await zbierzMiernik(
			async (sql, params) => (await client.query(sql, params)).rows,
			{ kohorta },
		);
		const tekst = raportTekstowy(miernik);
		console.log(tekst);
		if (sciezkaZapisu) {
			// Ten sam tekst, bez skrótów — patrz nagłówek pliku.
			writeFileSync(sciezkaZapisu, `${tekst}\n`, "utf8");
			console.error(`\n[zapisano odczyt: ${sciezkaZapisu}]`);
		}
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((err) => {
	console.error("[report-placement-metric] błąd:", err);
	process.exit(1);
});
