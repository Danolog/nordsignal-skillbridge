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
 * ── DLACZEGO PORÓWNUJEMY WOBEC `origin/main`, A NIE WOBEC DYSKU (2026-08-12) ──
 * Do 2026-08-12 skrypt czytał dziennik WYŁĄCZNIE z drzewa roboczego i nazywał
 * wynik „spójnością". To czyniło go strażnikiem-atrapą: przy nieświeżym
 * checkoucie meldował „✅ Brak migracji do zastosowania" o migracji, KTÓREJ NIE
 * WIDZIAŁ. Zmierzone tego dnia na żywym prodzie: drzewo 13 commitów za
 * `origin/main` → skrypt zwrócił „Dziennik: 47 wpisów … WYNIK: spójny", podczas
 * gdy `origin/main` miał 48 wpisów, a migracja `0047_sad_la_nuit` z 2026-08-06
 * czekała niezastosowana. Fałszywa zieleń, nie błąd odczytu.
 *
 * Dlatego dziś sprawdzamy DWA warunki naraz, bo to dwa różne pytania:
 *   (A) czy produkcja zgadza się z tym, co MA BYĆ wdrożone → dziennik z
 *       `origin/main` (źródło prawdy zespołu),
 *   (B) czy to, co `db:migrate` FAKTYCZNIE zastosuje z dysku, jest tym samym co
 *       `origin/main` → porównanie drzewa roboczego z referencją.
 * Sam warunek (A) nie wystarcza: migrator bierze pliki z dysku, nie z gita.
 * Sam warunek (B) nie wystarcza: to była dokładnie stara wersja tego skryptu.
 *
 * Sprawdza:
 *   0. ŚWIEŻOŚĆ: dziennik na dysku == dziennik w `origin/main`. Rozjazd = STOP
 *      (nieświeże albo rozjechane drzewo robocze).
 *   1. DRIFT: każdy `created_at` w drizzle.__drizzle_migrations MUSI odpowiadać
 *      jakiemuś `when` w dzienniku referencyjnym.
 *   2. LUKA: każdy wpis dziennika z `when` <= max(created_at w bazie), którego
 *      NIE ma w bazie = migracja „przeskoczona".
 *   3. PENDING: wpisy dziennika z `when` > max(created_at w bazie).
 *
 * Exit code: 0 = spójny (można migrować), 1 = drift/luka/nieświeże drzewo (STOP).
 *
 * BEZPIECZEŃSTWO: read-only (same SELECT-y). Nie drukuje connection stringa.
 * `git fetch` dotyka wyłącznie referencji zdalnych — nie zmienia drzewa roboczego.
 *
 * Użycie:
 *   pnpm exec tsx tools/prod-journal-check.ts
 *   PROD_JOURNAL_REF=origin/main            # referencja (domyślna)
 *   PROD_JOURNAL_SKIP_FETCH=1               # pomiń odświeżenie referencji (offline)
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

export type JournalEntry = { idx: number; when: number; tag: string };

const JOURNAL_PATH = "drizzle/meta/_journal.json";

function parseJournal(raw: string, zrodlo: string): JournalEntry[] {
	const parsed = JSON.parse(raw) as { entries?: JournalEntry[] };
	if (!Array.isArray(parsed.entries)) {
		throw new Error(`${zrodlo}: brak tablicy \`entries\`.`);
	}
	return [...parsed.entries].sort((a, b) => a.when - b.when);
}

export function readJournalFromDisk(): JournalEntry[] {
	return parseJournal(readFileSync(JOURNAL_PATH, "utf8"), JOURNAL_PATH);
}

export function readJournalFromRef(ref: string): JournalEntry[] {
	let raw: string;
	try {
		raw = execFileSync("git", ["show", `${ref}:${JOURNAL_PATH}`], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (e) {
		// Twardy błąd, NIGDY cichy odwrót na dysk — odwrót na dysk był istotą wady.
		throw new Error(
			`Nie udało się odczytać dziennika z \`${ref}\` (${(e as Error).message.trim()}).\n` +
				"   Bez referencji nie ma z czym porównać — to jest STOP, nie ostrzeżenie.\n" +
				"   Offline: PROD_JOURNAL_SKIP_FETCH=1 (referencja lokalna może być nieświeża).",
		);
	}
	return parseJournal(raw, `${ref}:${JOURNAL_PATH}`);
}

export type Rozjazd = { brakNaDysku: string[]; nadmiarNaDysku: string[] };

export type Wynik = {
	pending: JournalEntry[];
	drift: number[];
	gaps: JournalEntry[];
	rozjazdDrzewa: Rozjazd | null;
	failed: boolean;
};

/**
 * Czy drzewo robocze niesie ten sam zbiór migracji co referencja.
 * Wydzielone, bo sprawdzamy to ZANIM dotkniemy produkcji — nieświeże drzewo
 * unieważnia całe pytanie, więc nie ma po co otwierać połączenia do bazy.
 */
export function sprawdzSwiezosc(
	journalRef: JournalEntry[],
	journalDisk: JournalEntry[],
): Rozjazd | null {
	const refWhens = new Set(journalRef.map((e) => e.when));
	const diskWhens = new Set(journalDisk.map((e) => e.when));
	const brakNaDysku = journalRef.filter((e) => !diskWhens.has(e.when)).map((e) => e.tag);
	const nadmiarNaDysku = journalDisk.filter((e) => !refWhens.has(e.when)).map((e) => e.tag);
	return brakNaDysku.length > 0 || nadmiarNaDysku.length > 0
		? { brakNaDysku, nadmiarNaDysku }
		: null;
}

/**
 * Czysta logika porównania — bez wejścia/wyjścia, żeby dała się przetestować
 * (i zmutować) bez bazy i bez gita.
 *
 * @param journalRef  dziennik z referencji (`origin/main`) — ŹRÓDŁO PRAWDY
 * @param journalDisk dziennik z drzewa roboczego — to, co zastosuje `db:migrate`
 * @param applied     `created_at` (ms) wpisów zastosowanych na produkcji
 */
export function porownajDziennik(args: {
	journalRef: JournalEntry[];
	journalDisk: JournalEntry[];
	applied: number[];
}): Wynik {
	const { journalRef, journalDisk, applied } = args;

	// 0. ŚWIEŻOŚĆ drzewa roboczego względem referencji.
	const refWhens = new Set(journalRef.map((e) => e.when));
	const rozjazdDrzewa = sprawdzSwiezosc(journalRef, journalDisk);

	const maxApplied = applied.length > 0 ? Math.max(...applied) : -1;
	const appliedSet = new Set(applied);

	// 1. DRIFT — wpis w bazie bez odpowiednika w dzienniku referencyjnym.
	const drift = applied.filter((ts) => !refWhens.has(ts));
	// 2. LUKA — wpis referencji <= maxApplied, którego nie ma w bazie.
	const gaps = journalRef.filter((e) => e.when <= maxApplied && !appliedSet.has(e.when));
	// 3. PENDING — wpisy referencji > maxApplied.
	const pending = journalRef.filter((e) => e.when > maxApplied);

	return {
		pending,
		drift,
		gaps,
		rozjazdDrzewa,
		failed: drift.length > 0 || gaps.length > 0 || rozjazdDrzewa !== null,
	};
}

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error("[prod-journal-check] STOP: DATABASE_URL nie ustawiona.");
		process.exit(1);
	}

	const ref = process.env.PROD_JOURNAL_REF ?? "origin/main";

	if (process.env.PROD_JOURNAL_SKIP_FETCH !== "1") {
		try {
			execFileSync("git", ["fetch", "origin", "--quiet"], { stdio: ["ignore", "pipe", "pipe"] });
		} catch (e) {
			console.error(
				"[prod-journal-check] STOP: `git fetch` nie powiódł się " +
					`(${(e as Error).message.trim()}).\n` +
					"   Referencja mogłaby być nieświeża, a nieświeża referencja to ta sama wada,\n" +
					"   którą ten skrypt ma wykrywać. Offline: PROD_JOURNAL_SKIP_FETCH=1.",
			);
			process.exit(1);
		}
	}

	const journalRef = readJournalFromRef(ref);
	const journalDisk = readJournalFromDisk();
	const tagByWhen = new Map(journalRef.map((e) => [e.when, e.tag]));

	// BRAMKA ŚWIEŻOŚCI PRZED DOTKNIĘCIEM PRODUKCJI. Nieświeże drzewo unieważnia
	// pytanie „czy prod jest spójny" — odpowiedź dotyczyłaby innego zbioru migracji
	// niż ten, który pojedzie. Nie ma po co otwierać połączenia do bazy.
	const rozjazdWczesny = sprawdzSwiezosc(journalRef, journalDisk);
	if (rozjazdWczesny) {
		console.error("=== prod-journal-check (READ-ONLY) ===");
		console.error(`❌ NIEŚWIEŻE / ROZJECHANE DRZEWO ROBOCZE względem ${ref}:`);
		for (const t of rozjazdWczesny.brakNaDysku) {
			console.error(`   brak na dysku, jest w ${ref}: ${t}`);
		}
		for (const t of rozjazdWczesny.nadmiarNaDysku) {
			console.error(`   jest na dysku, brak w ${ref}: ${t}`);
		}
		console.error(
			"   → `db:migrate` stosuje pliki Z DYSKU, więc wynik tego sprawdzenia byłby\n" +
				"     zdaniem o innym zbiorze migracji niż ten, który faktycznie pojedzie.\n" +
				"     Zrób `git pull` (albo wskaż właściwą referencję) i powtórz.\n" +
				"   → Bazy NIE odpytywano.",
		);
		console.error("\n[prod-journal-check] WYNIK: NIESPÓJNY — STOP przed db:migrate.");
		process.exit(1);
	}

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

	const w = porownajDziennik({ journalRef, journalDisk, applied });
	const maxApplied = applied.length > 0 ? Math.max(...applied) : -1;

	console.log("=== prod-journal-check (READ-ONLY) ===");
	console.log(
		`Referencja: ${ref} — ${journalRef.length} wpisów (ostatni: ${journalRef.at(-1)?.tag ?? "—"}).`,
	);
	console.log(
		`Drzewo robocze: ${journalDisk.length} wpisów (ostatni: ${journalDisk.at(-1)?.tag ?? "—"}).`,
	);
	console.log(
		`Baza: ${applied.length} zastosowanych` +
			(maxApplied >= 0
				? ` (ostatni: ${tagByWhen.get(maxApplied) ?? `created_at=${maxApplied} (SPOZA DZIENNIKA!)`}).`
				: "."),
	);

	if (w.rozjazdDrzewa) {
		console.error(`\n❌ NIEŚWIEŻE / ROZJECHANE DRZEWO ROBOCZE względem ${ref}:`);
		for (const t of w.rozjazdDrzewa.brakNaDysku) {
			console.error(`   brak na dysku, jest w ${ref}: ${t}`);
		}
		for (const t of w.rozjazdDrzewa.nadmiarNaDysku) {
			console.error(`   jest na dysku, brak w ${ref}: ${t}`);
		}
		console.error(
			"   → `db:migrate` stosuje pliki Z DYSKU, więc wynik tego sprawdzenia byłby\n" +
				"     zdaniem o innym zbiorze migracji niż ten, który faktycznie pojedzie.\n" +
				"     Zrób `git pull` (albo wskaż właściwą referencję) i powtórz.",
		);
	}

	if (w.drift.length > 0) {
		console.error("\n❌ DRIFT — wpisy w bazie bez odpowiednika w dzienniku:");
		for (const ts of w.drift) console.error(`   created_at=${ts}`);
		console.error(
			"   → Rozjazd jak w incydencie 0019. NIE migruj. Wymagana ręczna analiza\n" +
				"     (porównaj hash pliku migracji z wpisem, wzór: tools/fix-drizzle-journal-0019.sql).",
		);
	}

	if (w.gaps.length > 0) {
		console.error(
			"\n❌ LUKA — migracje przeskoczone (są w dzienniku <= ostatni zastosowany, brak w bazie):",
		);
		for (const e of w.gaps) console.error(`   ${e.tag} (when=${e.when})`);
	}

	if (w.pending.length > 0) {
		console.log(`\n⏳ PENDING — db:migrate zastosuje ${w.pending.length} migracj(i):`);
		for (const e of w.pending) console.log(`   ${e.tag} (when=${e.when})`);
	} else if (!w.failed) {
		console.log("\n✅ Brak migracji do zastosowania (baza = dziennik referencyjny).");
	}

	if (w.failed) {
		console.error("\n[prod-journal-check] WYNIK: NIESPÓJNY — STOP przed db:migrate.");
		process.exit(1);
	}
	console.log("\n[prod-journal-check] WYNIK: spójny — db:migrate bezpieczny.");
	process.exit(0);
}

// Uruchamiaj main() tylko przy bezpośrednim wywołaniu — import w teście ma być cichy.
if (require.main === module) {
	main().catch((err) => {
		console.error("[prod-journal-check] FAILED:", err instanceof Error ? err.message : String(err));
		process.exit(1);
	});
}
