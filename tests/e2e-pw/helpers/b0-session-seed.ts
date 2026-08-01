import { Client } from "pg";
import { assertTestDb } from "../../../tools/assert-test-db";

/**
 * Zasiew DOMKNIĘTEJ rozmowy Pomocnika wprost w bazie TESTOWEJ — punkt wejścia na
 * ekran 3 bez ani jednego wywołania modelu.
 *
 * PO CO. Właściwość „uczciwy degrade podsumowania ma wyjście" nie zależy od modelu
 * ani odrobinę — zależy od kontraktu odpowiedzi /summary i od okablowania trzech
 * ekranów. Gdyby test tej właściwości musiał najpierw przejechać ankietę i 9 tur
 * rozmowy (≈10 wywołań modelu), byłby wolny, drogi i — co gorsza — sam niestabilny
 * przez model, którego wcale nie bada. Zasiew zdejmuje tę zmienną: wchodzimy prosto
 * na `/pomocnik-kariery?sessionId=…`, gdzie strona montuje czat z gotową sesją.
 *
 * KSZTAŁT DOMKNIĘTEJ ROZMOWY (1:1 z zapisem trasy /turn, nie zgadywany):
 *  - `career_helper_sessions.turn = 9` (MAX_TURNS), status `in_progress`;
 *  - `turn_index = 1`  — sama tura AI (Pomocnik odzywa się pierwszy, bez pustej tury usera);
 *  - `turn_index 2..9` — pary (user, ai) wstawiane jednym INSERT-em;
 *  - `turn_index = 10` (MAX_TURNS+1) — user-only: odpowiedź na 9. pytanie, która
 *    domyka rozmowę i NIE podbija licznika `turn`.
 * Rehydracja (GET /session) sortuje po (turn_index, user przed ai, created_at) →
 * ostatnia wiadomość ma rolę `user` i `turn >= MAX_TURNS`, więc czat pokazuje CTA
 * „Pokaż podsumowanie" zamiast pola wpisywania. Dokładnie ten stan, w którym student
 * naciska guzik i dostaje (albo nie) podsumowanie.
 *
 * Guard: assertTestDb (allowlista hostów testowych) — jak w db-reset.ts i seed-e2e.ts;
 * prod-DSN nigdy nie przejdzie. Zasiew kasuje wcześniejsze sesje tego konta, więc
 * jest idempotentny i nie zostawia „drugiej aktywnej sesji" innym testom.
 */

type Konto = "main" | "b4" | "resume";

const MAX_TURNS = 9;
const FINAL_ANSWER_TURN_INDEX = MAX_TURNS + 1;

/** Ankieta w kształcie kontraktu POST /survey (q1..q4) — treść bez znaczenia dla asercji. */
const ANKIETA = {
	q1: "Praca z danymi i liczbami",
	q2: "Wolę pracę zespołową",
	q3: ["Analiza danych", "Programowanie"],
	q4: "Lubię rozkładać problem na części i sprawdzać hipotezy na danych.",
};

/** Adres e-mail konta testowego wg konwencji zmiennych z .env.test / joba CI. */
function emailKonta(konto: Konto): string {
	const suffix = konto === "main" ? "" : `_${konto.toUpperCase()}`;
	const email = process.env[`E2E_TEST_EMAIL${suffix}`];
	if (!email) throw new Error(`Brak E2E_TEST_EMAIL${suffix} — nie wiem, o które konto chodzi.`);
	return email;
}

/**
 * Kasuje wszystkie sesje Pomocnika danego konta (tury lecą kaskadą FK).
 *
 * PO CO OSOBNO OD ZASIEWU: trasa POST /survey ma cap 10 sesji na dobę per student
 * (MAX_SESSIONS_PER_DAY, src/lib/ai/career-helper.ts). Spec 10 zakłada 5 sesji na
 * koncie „main" w jednym przebiegu; przy ponowieniach Playwrighta w CI (retries: 1)
 * ta liczba dobija do sufitu i kolejny test dostaje 429 „Limit sesji Pomocnika".
 * Czerwień wyglądałaby wtedy jak defekt Pomocnika, a byłaby resztką po poprzednim
 * teście — dokładnie ta klasa fałszywego alarmu, którą naprawiamy w tym pliku.
 */
export async function wyczyscSesjePomocnika(konto: Konto = "main"): Promise<void> {
	const dsn = process.env.E2E_DATABASE_URL;
	assertTestDb(dsn, "E2E_DATABASE_URL");
	const email = emailKonta(konto);
	const client = new Client({ connectionString: dsn });
	await client.connect();
	try {
		await client.query(
			`DELETE FROM career_helper_sessions
			 WHERE student_id IN (
			   SELECT s.id FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.email = $1
			 )`,
			[email],
		);
	} finally {
		await client.end();
	}
}

export async function zasiejDomknietaRozmowe(konto: Konto = "main"): Promise<string> {
	const dsn = process.env.E2E_DATABASE_URL;
	assertTestDb(dsn, "E2E_DATABASE_URL");

	const email = emailKonta(konto);

	const client = new Client({ connectionString: dsn });
	await client.connect();
	try {
		const student = await client.query(
			`SELECT s.id, s.tenant_id FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.email = $1`,
			[email],
		);
		if (student.rowCount !== 1) {
			throw new Error(
				`Konto ${email}: oczekiwano 1 studenta, jest ${student.rowCount} — odpal pnpm seed:e2e.`,
			);
		}
		const studentId = student.rows[0].id as string;
		const tenantId = student.rows[0].tenant_id as string;

		// Cap „max 1 aktywna sesja per student" (golden-adr §4.1) — czyścimy przed zasiewem.
		await client.query(`DELETE FROM career_helper_sessions WHERE student_id = $1`, [studentId]);

		const sesja = await client.query(
			`INSERT INTO career_helper_sessions (student_id, tenant_id, status, turn, answers, restart_count)
			 VALUES ($1, $2, 'in_progress', $3, $4::jsonb, 0) RETURNING id`,
			[studentId, tenantId, MAX_TURNS, JSON.stringify(ANKIETA)],
		);
		const sessionId = sesja.rows[0].id as string;

		const wiersze: { role: "ai" | "user"; content: string; turnIndex: number }[] = [
			{ role: "ai", content: "Pytanie otwierające: co Cię ostatnio wciągnęło?", turnIndex: 1 },
		];
		for (let i = 2; i <= MAX_TURNS; i++) {
			wiersze.push({
				role: "user",
				content: `Odpowiedź studenta ${i - 1} (zasiew E2E).`,
				turnIndex: i,
			});
			wiersze.push({ role: "ai", content: `Pytanie Pomocnika ${i} (zasiew E2E).`, turnIndex: i });
		}
		wiersze.push({
			role: "user",
			content: "Ostatnia odpowiedź studenta — rozmowa domknięta (zasiew E2E).",
			turnIndex: FINAL_ANSWER_TURN_INDEX,
		});

		const wartosci = wiersze
			.map((_, i) => `($1, $2, $3, $${i * 3 + 4}, $${i * 3 + 5}, $${i * 3 + 6})`)
			.join(", ");
		await client.query(
			`INSERT INTO career_helper_turns (session_id, student_id, tenant_id, role, content, turn_index)
			 VALUES ${wartosci}`,
			[sessionId, studentId, tenantId, ...wiersze.flatMap((w) => [w.role, w.content, w.turnIndex])],
		);

		return sessionId;
	} finally {
		await client.end();
	}
}
