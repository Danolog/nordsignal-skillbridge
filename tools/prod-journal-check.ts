/**
 * prod-journal-check — READ-ONLY pre-flight spójności dziennika migracji drizzle.
 *
 * Kodyfikuje lekcję z incydentu 0019 (2026-07-02, patrz pamięć projektu): na
 * prodzie DDL bywał aplikowany ręcznym SQL-em bez wpisu do
 * `drizzle.__drizzle_migrations`, przez co `db:migrate` padał na
 * "relation already exists". Ten skrypt NIE pisze nic do bazy — tylko czyta i
 * raportuje, więc jest bezpieczny do uruchomienia w dowolnym momencie (także na
 * prodzie), i powinien iść PRZED każdym `db:migrate` na produkcji.
 *
 * Sprawdza:
 *   1. DRIFT: każdy `created_at` w drizzle.__drizzle_migrations MUSI odpowiadać
 *      jakiemuś `when` w drizzle/meta/_journal.json. Wpis w tabeli bez
 *      odpowiednika w dzienniku = rozjazd (migrator porówna created_at i padnie).
 *   2. LUKA: każdy wpis dziennika z `when` <= max(created_at w bazie), którego
 *      NIE ma w bazie = migracja "przeskoczona" (też rozjazd).
 *   3. PENDING: wpisy dziennika z `when` > max(created_at w bazie) = migracje,
 *      które `db:migrate` zastosuje. Raport pokazuje dokładnie które.
 *
 * Exit code: 0 = spójny (można migrować), 1 = drift/luka (STOP, ręczna analiza).
 *
 * BEZPIECZEŃSTWO: read-only (same SELECT-y). Nie drukuje connection stringa.
 * Używa DATABASE_URL z procesu (na prodzie: ambient prod URL). NIE wymaga
 * CONFIRM_PROD_DB — nic nie zapisuje, więc nie dotyka guarda zapisu.
 *
 * Użycie:
 *   pnpm exec tsx tools/prod-journal-check.ts
 */

import { readFileSync } from "node:fs";
import { Pool } from "pg";

type JournalEntry = { idx: number; when: number; tag: string };

function readJournal(): JournalEntry[] {
	const raw = readFileSync("drizzle/meta/_journal.json", "utf8");
	const parsed = JSON.parse(raw) as { entries?: JournalEntry[] };
	if (!Array.isArray(parsed.entries)) {
		throw new Error("drizzle/meta/_journal.json: brak tablicy `entries`.");
	}
	return [...parsed.entries].sort((a, b) => a.when - b.when);
}

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error("[prod-journal-check] STOP: DATABASE_URL nie ustawiona.");
		process.exit(1);
	}

	const journal = readJournal();
	const journalWhens = new Set(journal.map((e) => e.when));
	const tagByWhen = new Map(journal.map((e) => [e.when, e.tag]));

	const pool = new Pool({ connectionString: dbUrl });
	const c = await pool.connect();
	let applied: number[];
	try {
		const res = await c.query<{ created_at: string }>(
			"SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
		);
		// created_at to bigint (ms) — pg zwraca jako string; parsujemy na number.
		applied = res.rows.map((r) => Number(r.created_at));
	} finally {
		c.release();
		await pool.end();
	}

	const maxApplied = applied.length > 0 ? Math.max(...applied) : -1;

	// 1. DRIFT — wpis w bazie bez odpowiednika w dzienniku.
	const drift = applied.filter((ts) => !journalWhens.has(ts));

	// 2. LUKA — wpis dziennika <= maxApplied, którego nie ma w bazie.
	const appliedSet = new Set(applied);
	const gaps = journal.filter((e) => e.when <= maxApplied && !appliedSet.has(e.when));

	// 3. PENDING — wpisy dziennika > maxApplied.
	const pending = journal.filter((e) => e.when > maxApplied);

	console.log("=== prod-journal-check (READ-ONLY) ===");
	console.log(`Dziennik: ${journal.length} wpisów (ostatni: ${journal.at(-1)?.tag ?? "—"}).`);
	console.log(
		`Baza: ${applied.length} zastosowanych` +
			(maxApplied >= 0
				? ` (ostatni: ${tagByWhen.get(maxApplied) ?? `created_at=${maxApplied} (SPOZA DZIENNIKA!)`}).`
				: "."),
	);

	let failed = false;

	if (drift.length > 0) {
		failed = true;
		console.error("\n❌ DRIFT — wpisy w bazie bez odpowiednika w dzienniku:");
		for (const ts of drift) console.error(`   created_at=${ts}`);
		console.error(
			"   → Rozjazd jak w incydencie 0019. NIE migruj. Wymagana ręczna analiza\n" +
				"     (porównaj hash pliku migracji z wpisem, wzór: tools/fix-drizzle-journal-0019.sql).",
		);
	}

	if (gaps.length > 0) {
		failed = true;
		console.error(
			"\n❌ LUKA — migracje przeskoczone (są w dzienniku <= ostatni zastosowany, brak w bazie):",
		);
		for (const e of gaps) console.error(`   ${e.tag} (when=${e.when})`);
	}

	if (pending.length > 0) {
		console.log(`\n⏳ PENDING — db:migrate zastosuje ${pending.length} migracj(i):`);
		for (const e of pending) console.log(`   ${e.tag} (when=${e.when})`);
	} else {
		console.log("\n✅ Brak migracji do zastosowania (baza = dziennik).");
	}

	if (failed) {
		console.error("\n[prod-journal-check] WYNIK: NIESPÓJNY — STOP przed db:migrate.");
		process.exit(1);
	}
	console.log("\n[prod-journal-check] WYNIK: spójny — db:migrate bezpieczny.");
	process.exit(0);
}

main().catch((err) => {
	console.error("[prod-journal-check] FAILED:", err instanceof Error ? err.message : String(err));
	process.exit(1);
});
