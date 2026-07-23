/**
 * enforce-retention — JEDEN skrypt egzekucji retencji dla CAŁEGO rejestru
 * (docs/data/retention.md). Realizuje R-1 z hint-reveals-retencja-signoff.md §7:
 * „jeden skrypt obsługujący wszystkie wiersze rejestru", nie skrypt-per-wiersz.
 *
 * MODEL: rejestr = tablica reguł `RULES`. Każda reguła to zamknięta jednostka
 * (id, opis, SQL liczący ile wierszy ma cokolwiek do przycięcia, SQL wykonujący
 * przycięcie). Dodanie trzeciego wiersza rejestru = DOPISANIE JEDNEGO OBIEKTU do
 * `RULES` (nowa reguła), a nie nowy skrypt ani nowa gałąź logiki w `main`.
 *
 * DZIŚ dwie reguły:
 *   1. hints-at   — curriculum_item_progress.hints_revealed_json → at[]:
 *                   usuwa znaczniki `at` starsze niż 12 miesięcy, ZOSTAWIA `d`.
 *                   Niezmiennik wiążący to at.length <= d (ADR-018, §8 signoffu):
 *                   po przycięciu at.length < d jest STANEM POPRAWNYM, nie błędem.
 *   2. viva-content — viva_answers (surowa odpowiedź studenta): usuwa wiersze
 *                   odpowiedzi, których sesja została rozstrzygnięta
 *                   (viva_sessions.completed_at) wcześniej niż 12 miesięcy temu.
 *                   „Co zostaje" wg rejestru = viva_sessions.result_json (punkty
 *                   + uzasadnienia sędziego, bez surowego tekstu) — leży na INNEJ
 *                   tabeli, więc kasowanie wierszy viva_answers jej nie dotyka.
 *                   Kasowanie (nie NULL) jest tu operacją kanoniczną: kolumna
 *                   content jest NOT NULL (schema.ts:1467), a komentarz schematu
 *                   (schema.ts:1466) i ADR-013 D3 mówią wprost „kasowanie zostawia
 *                   resultJson sesji".
 *
 * R-2 (WAŻNE — placeholder, świadomie NIE zaimplementowane w tym PR-ze):
 *   Okres retencji dla KONT NIEAKTYWNYCH (konto porzucone po jednym logowaniu
 *   trzyma dane bezterminowo) jest NIEROZSTRZYGNIĘTY. To pytanie o cykl życia
 *   konta, nie o strukturę danych — właściciel decyzji: Ryan (propozycja) →
 *   Sophia (skutek produktowy) → Darek (jeśli dotknie komunikacji do studenta/
 *   uczelni), za hint-reveals-retencja-signoff.md §7 R-2. Gdy reguła zapadnie,
 *   dojdzie tu jako TRZECI obiekt w `RULES` — nic w `main` nie trzeba ruszać.
 *   Nie zgaduję tu okresu ani kolumny; nazwane, żeby nie wyglądało na przemilczane.
 *
 * BEZPIECZEŃSTWO: guard tools/assert-test-db.ts (jak remediate-duplicate-submissions).
 *   Host lokalny → PASS. Host zdalny bez CONFIRM_PROD_DB=1 → ABORT. Fragment
 *   produkcyjnej bazy ("skill-bridge-ai") → ABORT bezwarunkowo, nawet z flagą.
 *   Domyślnie DRY-RUN (tylko raport per reguła, zero zapisów) — wymaga jawnej
 *   flagi --execute. Wykonanie idzie w JEDNEJ transakcji na JEDNYM połączeniu
 *   (BEGIN…COMMIT); dowolny błąd którejkolwiek reguły → ROLLBACK całości.
 *   Weryfikacja idempotencji przed COMMIT: po przycięciu każda reguła musi
 *   raportować 0 pozostałych wierszy, inaczej ROLLBACK.
 *
 * [CZERWONA LINIA gdy prod] — na bazie produkcyjnej to nieodwracalna modyfikacja
 *   realnych danych osobowych. Uruchamia się po kopii zapasowej gałęzią Neona,
 *   ścieżką operacyjną Ethana (delegacja v1.12), NIE z tego skryptu bez pełnej
 *   świadomości. Guard nie przepuści produkcyjnego DSN nawet z CONFIRM_PROD_DB=1.
 *
 * Użycie:
 *   pnpm exec tsx tools/enforce-retention.ts                 (dry-run, lokalna baza)
 *   pnpm exec tsx tools/enforce-retention.ts --execute       (wykonanie, lokalna baza)
 */

import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";
import { assertTestDb } from "./assert-test-db";

// Ładowanie .env (lokalna baza dev) — dotenv NIE nadpisuje już-ustawionych
// zmiennych, więc DATABASE_URL podany w procesie wygrywa.
config({ path: ".env.local" });
config({ path: ".env" });

/** Okres retencji wspólny obu regułom rejestru (docs/data/retention.md). */
const RETENTION_INTERVAL = "12 months";

/**
 * Reguła egzekucji retencji = jeden wiersz rejestru docs/data/retention.md.
 *
 *  - countSql: zwraca kolumnę `n` = ile wierszy MA cokolwiek do przycięcia.
 *    Musi zawężać do wierszy realnie wymagających działania (żeby dry-run mówił
 *    prawdę, a przebieg nie dotykał całej tabeli). Po wykonaniu musi zwrócić 0
 *    (dowód idempotencji przed COMMIT).
 *  - applySql: UPDATE/DELETE wykonujący przycięcie; `rowCount` = liczba
 *    zmienionych/usuniętych wierszy. Wykonywany w transakcji zbiorczej.
 */
type RetentionRule = {
	id: string;
	description: string;
	countSql: string;
	applySql: string;
};

const RULES: RetentionRule[] = [
	{
		id: "hints-at",
		description:
			"curriculum_item_progress.hints_revealed_json → at[] starsze niż " +
			`${RETENTION_INTERVAL} (zostawia d; niezmiennik at.length <= d)`,
		// Ile wierszy ma choć jeden znacznik at do przycięcia (wzorzec §7 signoffu).
		countSql: `
			SELECT count(*)::int AS n
			  FROM curriculum_item_progress p
			 WHERE EXISTS (
			       SELECT 1
			         FROM jsonb_each(p.hints_revealed_json) e,
			              jsonb_array_elements_text(e.value->'at') t
			        WHERE t::timestamptz < now() - interval '${RETENTION_INTERVAL}'
			 )`,
		// Przeliczenie mapy w SQL (jsonb), NIE w TS po SELECT-cie. Uzasadnienie:
		// przycięcie i zapis dzieją się w jednym UPDATE na spójnym snapshotcie
		// transakcji — brak okna wyścigu read-modify-write, brak ładowania całej
		// tabeli do procesu, atomowo per wiersz. now() jest stałe w obrębie
		// transakcji (czas jej startu), więc próg jest ten sam dla count i apply.
		//
		// Rekonstrukcja: dla KAŻDEGO klucza mapy zostawiamy d nietknięte
		// (jsonb_set celuje wyłącznie w ścieżkę {at}) i przepisujemy at, filtrując
		// znaczniki < progu. WITH ORDINALITY zachowuje kolejność chronologiczną
		// pozostałych znaczników. Pusta lista po filtrze → '[]' (coalesce), klucz
		// i jego d ZOSTAJĄ. at może się tylko skrócić, więc at.length <= d trzyma
		// się z definicji (MNIEJSZE-RÓWNE; równość nie jest wymagana po retencji).
		applySql: `
			UPDATE curriculum_item_progress p
			   SET hints_revealed_json = (
			         SELECT coalesce(
			                  jsonb_object_agg(
			                    e.key,
			                    jsonb_set(
			                      e.value,
			                      '{at}',
			                      coalesce(
			                        (SELECT jsonb_agg(t.val ORDER BY t.ord)
			                           FROM jsonb_array_elements_text(e.value->'at')
			                                WITH ORDINALITY AS t(val, ord)
			                          WHERE t.val::timestamptz >= now() - interval '${RETENTION_INTERVAL}'),
			                        '[]'::jsonb
			                      )
			                    )
			                  ),
			                  '{}'::jsonb
			                )
			           FROM jsonb_each(p.hints_revealed_json) AS e
			       ),
			       updated_at = now()
			 WHERE EXISTS (
			       SELECT 1
			         FROM jsonb_each(p.hints_revealed_json) e,
			              jsonb_array_elements_text(e.value->'at') t
			        WHERE t::timestamptz < now() - interval '${RETENTION_INTERVAL}'
			 )`,
	},
	{
		id: "viva-content",
		description:
			"viva_answers (surowa odpowiedź studenta) dla sesji rozstrzygniętych " +
			`wcześniej niż ${RETENTION_INTERVAL} temu (zostaje viva_sessions.result_json)`,
		countSql: `
			SELECT count(*)::int AS n
			  FROM viva_answers va
			  JOIN viva_sessions vs ON vs.id = va.session_id
			 WHERE vs.completed_at IS NOT NULL
			   AND vs.completed_at < now() - interval '${RETENTION_INTERVAL}'`,
		// DELETE (nie NULL): content jest NOT NULL, a ADR-013 D3 / komentarz
		// schematu mówią „kasowanie zostawia resultJson sesji". result_json leży
		// na viva_sessions, więc usunięcie wierszy odpowiedzi go nie rusza.
		applySql: `
			DELETE FROM viva_answers va
			 USING viva_sessions vs
			 WHERE vs.id = va.session_id
			   AND vs.completed_at IS NOT NULL
			   AND vs.completed_at < now() - interval '${RETENTION_INTERVAL}'`,
	},
];

async function countRule(client: PoolClient | Pool, rule: RetentionRule): Promise<number> {
	const { rows } = await client.query<{ n: number }>(rule.countSql);
	return rows[0]?.n ?? 0;
}

async function main(): Promise<void> {
	const execute = process.argv.includes("--execute");

	try {
		assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}

	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	try {
		// ── Raport per reguła PRZED jakimkolwiek zapisem ────────────────────────
		const counts = new Map<string, number>();
		let total = 0;
		for (const rule of RULES) {
			const n = await countRule(pool, rule);
			counts.set(rule.id, n);
			total += n;
			console.log(
				`[enforce-retention] ${rule.id}: ${n} wiersz(y) do przycięcia — ${rule.description}`,
			);
		}
		console.log(
			`[enforce-retention] Razem do przycięcia: ${total} wiersz(y) w ${RULES.length} regułach.`,
		);

		if (!execute) {
			console.log(
				"[enforce-retention] DRY-RUN — nic nie zmieniono. Uruchom z --execute, aby wykonać.",
			);
			return;
		}

		if (total === 0) {
			console.log("[enforce-retention] Nic do przycięcia — pomijam transakcję (idempotentne).");
			return;
		}

		// ── Wykonanie: JEDNA transakcja na JEDNYM połączeniu (all-or-nothing) ────
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			for (const rule of RULES) {
				const res = await client.query(rule.applySql);
				console.log(`[enforce-retention] ${rule.id}: dotknięto ${res.rowCount ?? 0} wiersz(y).`);
			}

			// Dowód idempotencji przed COMMIT: po przycięciu 0 pozostałych.
			for (const rule of RULES) {
				const remaining = await countRule(client, rule);
				if (remaining > 0) {
					throw new Error(
						`Reguła ${rule.id}: po przycięciu nadal ${remaining} wiersz(y) do przycięcia — ROLLBACK.`,
					);
				}
			}

			await client.query("COMMIT");
			console.log(
				"[enforce-retention] COMMIT — retencja wyegzekwowana, drugi przebieg zaraportuje 0.",
			);
		} catch (e) {
			await client.query("ROLLBACK");
			console.error(
				"[enforce-retention] FAILED (ROLLBACK):",
				e instanceof Error ? e.message : String(e),
			);
			process.exitCode = 1;
		} finally {
			client.release();
		}
	} finally {
		await pool.end();
	}
}

main().catch((err) => {
	console.error("[enforce-retention] FAILED:", err instanceof Error ? err.message : String(err));
	process.exit(1);
});
