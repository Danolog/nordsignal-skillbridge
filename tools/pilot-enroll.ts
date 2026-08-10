import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

// 1E.7 / DŁUG D11 — WPIS UCZESTNIKA PILOTAŻU do rejestru `pilot_participants`.
//
// Rejestr jest nośnikiem reguły wyłączenia z §6a: miernik liczy WYŁĄCZNIE
// zdarzenia dające się przypisać do sesji nazwanego uczestnika. Wszystko poza
// rejestrem — konto techniczne QA, konto techniczne Evy w domenie `.invalid`,
// konta zespołowe (w tym przejście Darka jako pierwszego, 2026-08-06), demo dla
// partnera, szkolenie, powtórka przy incydencie — NIE JEST obserwacją, i to bez
// wymieniania kogokolwiek z nazwiska. Wpis tutaj jest jedyną drogą, żeby czyjeś
// zdarzenia zaczęły się liczyć.
//
// Uruchomienie (domyślnie PRÓBA — nic nie zapisuje):
//   pnpm tsx tools/pilot-enroll.ts --kohorta <nazwa>
//   pnpm tsx tools/pilot-enroll.ts --kohorta <nazwa> --tak
// Adres podaje się na WEJŚCIU STANDARDOWYM, po zapytaniu narzędzia.
//
// ⚠ DLACZEGO ADRES NIE JEST ARGUMENTEM POLECENIA (uwaga Leo przy PR #270).
// Argument polecenia ląduje w historii powłoki i w tablicy procesów, czyli
// w dwóch miejscach, których nikt nie sprząta i które przeżywają sesję. To ta
// sama wada, którą konstytucja rozstrzygnęła już dla poświadczeń CI (CLAUDE.md
// §5, bramka (i) punkt 5: „klucz prywatny wyłącznie przez standardowe wejście —
// nigdy jako argument polecenia, bo wtedy trafia do audytu i tablicy procesów").
// Tu chodzi o dane osobowe, nie o sekret, ale mechanizm wycieku jest identyczny,
// więc stosujemy to samo rozstrzygnięcie zamiast wymyślać dla niego wyjątek.
//
// ⚠ `echo "adres" | pnpm tsx …` PRZYWRACA DOKŁADNIE TEN WYCIEK, KTÓRY TO ZAMYKA.
// Adres wraca wtedy do historii powłoki i do tablicy procesów — czyli tam, skąd
// właśnie go zabraliśmy. Ostrzeżenie stoi tu dlatego, że taki sposób uruchomienia
// pokazał opis PR #270 (znalezisko Ryana, W11): przykład użycia jest instrukcją,
// niezależnie od tego, co mówi kod obok.
// Właściwe użycie: wpisać adres po zapytaniu narzędzia albo podać go
// przekierowaniem z pliku SPOZA repozytorium (`… --kohorta X < ~/uczestnik.txt`).
//
// Adres służy WYŁĄCZNIE do odnalezienia konta. Do rejestru trafia identyfikator
// studenta, nigdy adres — tabela nie zakłada nowego zbioru danych osobowych.

type Argumenty = { kohorta: string | null; wykonaj: boolean };

function czytajArgumenty(argv: string[]): Argumenty {
	const wynik: Argumenty = { kohorta: null, wykonaj: false };
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === "--kohorta") wynik.kohorta = argv[i + 1] ?? null;
		if (argv[i] === "--tak") wynik.wykonaj = true;
	}
	return wynik;
}

/** Jedna linia z wejścia standardowego. Zapytanie idzie na stderr, żeby nie
 *  zabrudzić wyjścia, gdyby ktoś je przekierował do pliku. */
function wczytajLinie(zapytanie: string): Promise<string> {
	process.stderr.write(zapytanie);
	return new Promise((resolve, reject) => {
		let bufor = "";
		process.stdin.setEncoding("utf8");
		const naDane = (kawalek: string) => {
			bufor += kawalek;
			const koniec = bufor.indexOf("\n");
			if (koniec === -1) return;
			process.stdin.off("data", naDane);
			process.stdin.pause();
			resolve(bufor.slice(0, koniec).trim());
		};
		process.stdin.on("data", naDane);
		process.stdin.once("error", reject);
		process.stdin.once("end", () => resolve(bufor.trim()));
		process.stdin.resume();
	});
}

const args = czytajArgumenty(process.argv.slice(2));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
	if (!args.kohorta) {
		console.error(
			"Użycie: pnpm tsx tools/pilot-enroll.ts --kohorta <nazwa> [--tak]\n" +
				"Adres uczestnika podasz na wejściu standardowym (nie jako argument —\n" +
				"argument zostaje w historii powłoki i w tablicy procesów).\n" +
				"Bez --tak narzędzie tylko pokazuje, co by zrobiło.",
		);
		process.exit(2);
	}

	const email = await wczytajLinie("Adres konta uczestnika: ");
	if (!email) {
		console.error("Pusty adres — przerwane, nic nie zapisano.");
		process.exit(2);
	}

	const client = await pool.connect();
	try {
		const { rows } = await client.query(
			`SELECT st.id AS student_id, st.tenant_id, u.email,
			        (u.email ILIKE '%.invalid') AS konto_techniczne,
			        EXISTS (SELECT 1 FROM pilot_participants pp
			                 WHERE pp.student_id = st.id AND pp.cohort = $2) AS juz_wpisany
			   FROM "user" u
			   JOIN students st ON st.user_id = u.id
			  WHERE lower(u.email) = lower($1)`,
			[email, args.kohorta],
		);

		if (rows.length === 0) {
			console.error(
				`Nie ma konta studenta o tym adresie w bazie ${await nazwaBazy(client)}.\n` +
					"Uczestnik musi mieć założone konto ZANIM wejdzie do rejestru — rejestr " +
					"wskazuje na istniejący wiersz studenta, nie zakłada nowego bytu.",
			);
			process.exit(1);
		}

		const k = rows[0];

		// ROZRÓŻNIK POMOCNICZY jako BRAMKA WPISU, nigdy jako filtr w mierniku.
		// Domena `.invalid` jest zarezerwowana (RFC 6761) i nierozwiązywalna, więc
		// żaden prawdziwy uczestnik jej nie ma — konto Evy do domykania flag ma ją
		// z założenia. Miernik i tak by je pominął (nie ma go w rejestrze); ta bramka
		// łapie ODWROTNY błąd: wpisanie konta technicznego JAK uczestnika. Naprawa
		// należy do rejestru, nie do zapytania — dlatego stoi tutaj, a nie tam.
		if (k.konto_techniczne) {
			console.error(
				"ODMOWA: to konto ma adres w domenie `.invalid`, czyli jest kontem TECHNICZNYM\n" +
					"(konwencja repo: konto QA zapłonu 1E.7, konta do domykania flag).\n" +
					"Wpisanie go do rejestru zanieczyściłoby licznik dokładnie tak, jak opisuje\n" +
					"§6a — z tą różnicą, że tym razem zrobilibyśmy to sami i świadomie.\n" +
					"Jeśli to naprawdę uczestnik: zmień adres konta, potem wpisz do rejestru.",
			);
			process.exit(1);
		}

		if (k.juz_wpisany) {
			console.log(`Już w rejestrze kohorty „${args.kohorta}" — nic do zrobienia.`);
			return;
		}

		console.log(`Baza:      ${await nazwaBazy(client)}`);
		console.log(`Student:   ${k.student_id} (tenant ${k.tenant_id})`);
		console.log(`Kohorta:   ${args.kohorta}`);
		console.log("");
		console.log("Wpisując tę osobę, twierdzisz, że jest UCZESTNIKIEM pilotażu — czyli że");
		console.log("przechodzi ścieżkę jako student, a nie jako ktoś, kto zna system od środka.");
		console.log("Od tej chwili jej zdarzenia wchodzą do miernika placementu jako obserwacje.");

		if (!args.wykonaj) {
			console.log("\n[PRÓBA] Nic nie zapisano. Powtórz z --tak, żeby wpisać.");
			return;
		}

		await client.query("BEGIN");
		await client.query(
			`INSERT INTO pilot_participants (student_id, tenant_id, cohort)
			 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			[k.student_id, k.tenant_id, args.kohorta],
		);
		// Ślad rozliczalności — POWÓD i autor wpisu mieszkają w dzienniku, nie
		// w rejestrze. `metadata` niesie samą kohortę: adresu ani imienia nie
		// dokładamy, bo `target_id` już wiąże wiersz z osobą, a dublowanie tego
		// wiązania napisem tworzyłoby drugi zbiór danych osobowych bez zastosowania.
		await client.query(
			`INSERT INTO audit_log (actor_type, action, target_type, target_id, metadata)
			 VALUES ('operator', 'pilot.participant.enrolled', 'student', $1, $2::jsonb)`,
			[k.student_id, JSON.stringify({ cohort: args.kohorta })],
		);
		await client.query("COMMIT");
		console.log("\nWpisano. Sprawdź odczyt: pnpm tsx tools/report-placement-metric.ts");
	} catch (err) {
		await client.query("ROLLBACK").catch(() => {});
		throw err;
	} finally {
		client.release();
		await pool.end();
	}
}

async function nazwaBazy(client: { query: (s: string) => Promise<{ rows: unknown[] }> }) {
	const { rows } = await client.query("SELECT current_database() AS db");
	return (rows[0] as { db: string }).db;
}

main().catch((err) => {
	console.error("[pilot-enroll] błąd:", err);
	process.exit(1);
});
