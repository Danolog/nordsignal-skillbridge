/**
 * prod-journal-check — READ-ONLY pre-flight spójności przed `db:migrate` na produkcji.
 *
 * ── HISTORIA DWÓCH TYCH SAMYCH WAD (czytaj, zanim coś tu zmienisz) ──
 *
 * WADA 1 (do 2026-08-12): skrypt czytał dziennik migracji WYŁĄCZNIE z drzewa
 * roboczego i nazywał wynik „spójnością". Przy nieświeżym checkoucie meldował
 * „✅ Brak migracji do zastosowania" o migracji, KTÓREJ NIE WIDZIAŁ. Zmierzone
 * na żywym prodzie: drzewo 13 commitów w tyle → „WYNIK: spójny", podczas gdy
 * `0047_sad_la_nuit` czekała niezastosowana.
 *
 * WADA 2 (znaleziona przez Leo w przeglądzie naprawy wady 1): naprawa
 * przeniosła granicę zaufania z dysku na REFERENCJĘ — i zostawiła dwie drogi,
 * którymi ta sama fałszywa zieleń wracała piętro wyżej:
 *   • `PROD_JOURNAL_SKIP_FETCH=1` przy nieaktualnym lokalnym `origin/main`,
 *   • `PROD_JOURNAL_REF=HEAD` (dowolna referencja lokalna).
 * Oba przypadki dawały „WYNIK: spójny — brak migracji do zastosowania" przy
 * `0047` czekającej na zdalnym. Gorsze niż sama dziura: skrypt **na własnej
 * ścieżce błędu reklamował obie te drogi** („wskaż właściwą referencję",
 * „Offline: PROD_JOURNAL_SKIP_FETCH=1"), czyli podsuwał obejście operatorowi
 * dokładnie w chwili, gdy ten jest pod presją ceremonii. To była oznakowana
 * furtka, nie luka.
 *
 * ── REGUŁA, KTÓREJ TEN PLIK JEST NOŚNIKIEM ──
 * Zielony werdykt („SPÓJNY") wolno wypisać WYŁĄCZNIE wtedy, gdy porównanie
 * odbyło się wobec stanu ZDALNEGO, potwierdzonego w tej samej operacji.
 * Każda sytuacja, w której tego potwierdzenia nie ma — brak sieci, pominięty
 * `fetch`, referencja lokalna — kończy się werdyktem **NIEROZSTRZYGNIĘTY**
 * i kodem wyjścia różnym od zera. Nigdy „spójny". Tryb offline istnieje, ale
 * NIE JEST drogą do zieleni; jest drogą do uczciwego „nie wiem".
 *
 * Sprawdzane warunki:
 *   0a. TOŻSAMOŚĆ referencji — zdalna (`refs/remotes/…`) i zgodna z `ls-remote`.
 *   0b. ŚWIEŻOŚĆ dziennika — dysk == referencja, po kluczu `when|tag`
 *       (sam `when` nie wystarcza: podmiana nazwy przy tym samym znaczniku).
 *   0c. TREŚĆ `drizzle/` — dysk == referencja. Dziennik jest tylko PEŁNOMOCNIKIEM
 *       zbioru migracji; `db:migrate` stosuje PLIKI. Lokalnie zmieniony
 *       `0047_sad_la_nuit.sql` przy nietkniętym dzienniku przechodził oba
 *       poprzednie sprawdzenia (rodzina incydentu 0019).
 *   1.  DRIFT — wpis na produkcji bez odpowiednika w referencji.
 *   2.  LUKA — migracja przeskoczona.
 *   3.  PENDING — migracje do zastosowania.
 *
 * Kody wyjścia: 0 = SPÓJNY, 1 = NIESPÓJNY, 2 = NIEROZSTRZYGNIĘTY.
 *
 * BEZPIECZEŃSTWO: read-only. Nie drukuje adresu połączenia. Bazy NIE dotyka,
 * dopóki bramki 0a–0c nie przejdą.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

export type JournalEntry = { idx: number; when: number; tag: string };
export type Werdykt = "SPOJNY" | "NIESPOJNY" | "NIEROZSTRZYGNIETY";
export type Rozjazd = { brakNaDysku: string[]; nadmiarNaDysku: string[] };

const JOURNAL_PATH = "drizzle/meta/_journal.json";

function parseJournal(raw: string, zrodlo: string): JournalEntry[] {
	const parsed = JSON.parse(raw) as { entries?: JournalEntry[] };
	if (!Array.isArray(parsed.entries)) throw new Error(`${zrodlo}: brak tablicy \`entries\`.`);
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
		throw new Error(
			`Nie udało się odczytać dziennika z \`${ref}\` (${(e as Error).message.trim()}).`,
		);
	}
	return parseJournal(raw, `${ref}:${JOURNAL_PATH}`);
}

/**
 * Czy werdykt wolno w ogóle rozstrzygać — czyli czy porównujemy wobec stanu
 * ZDALNEGO potwierdzonego w tej operacji. Czysta funkcja, żeby dała się zmutować.
 *
 * ZASADA: brak potwierdzenia => NIEROZSTRZYGNIĘTY. Nigdy „spójny".
 */
export function ustalPrzeszkodeReferencji(args: {
	pominietoFetch: boolean;
	refJestZdalna: boolean;
	refZgodnaZeZdalnym: boolean | null; // null = nie dało się sprawdzić (brak sieci)
	ref: string;
}): string | null {
	if (args.pominietoFetch) {
		return (
			`referencji \`${args.ref}\` NIE odświeżono (PROD_JOURNAL_SKIP_FETCH=1). ` +
			"Lokalna kopia referencji może być dowolnie stara — to jest dokładnie ten " +
			"sam mechanizm, przez który zrzut na dysku kłamał o produkcji."
		);
	}
	if (!args.refJestZdalna) {
		return (
			`\`${args.ref}\` nie jest referencją zdalną (\`refs/remotes/…\`). ` +
			"Referencja lokalna opisuje stan tego komputera, nie stan zespołu."
		);
	}
	if (args.refZgodnaZeZdalnym === null) {
		return `nie udało się potwierdzić \`${args.ref}\` wobec zdalnego (brak łączności?).`;
	}
	if (args.refZgodnaZeZdalnym === false) {
		return `\`${args.ref}\` rozjeżdża się ze stanem zdalnym — odśwież i powtórz.`;
	}
	return null;
}

/** Klucz pozycji dziennika. `when` NIE wystarcza — podmiana nazwy przy tym samym znaczniku. */
const kluczWpisu = (e: JournalEntry) => `${e.when}|${e.tag}`;

export function sprawdzSwiezosc(
	journalRef: JournalEntry[],
	journalDisk: JournalEntry[],
): Rozjazd | null {
	const refKlucze = new Set(journalRef.map(kluczWpisu));
	const diskKlucze = new Set(journalDisk.map(kluczWpisu));
	const brakNaDysku = journalRef.filter((e) => !diskKlucze.has(kluczWpisu(e))).map((e) => e.tag);
	const nadmiarNaDysku = journalDisk.filter((e) => !refKlucze.has(kluczWpisu(e))).map((e) => e.tag);
	return brakNaDysku.length > 0 || nadmiarNaDysku.length > 0
		? { brakNaDysku, nadmiarNaDysku }
		: null;
}

export type Wynik = {
	werdykt: Werdykt;
	pending: JournalEntry[];
	drift: number[];
	gaps: JournalEntry[];
	rozjazdDrzewa: Rozjazd | null;
	rozjazdPlikow: boolean;
	przeszkoda: string | null;
};

export function porownajDziennik(args: {
	journalRef: JournalEntry[];
	journalDisk: JournalEntry[];
	applied: number[];
	rozjazdPlikow?: boolean;
	przeszkoda?: string | null;
}): Wynik {
	const { journalRef, journalDisk, applied } = args;
	const rozjazdPlikow = args.rozjazdPlikow ?? false;
	const przeszkoda = args.przeszkoda ?? null;

	const rozjazdDrzewa = sprawdzSwiezosc(journalRef, journalDisk);
	const refWhens = new Set(journalRef.map((e) => e.when));
	const maxApplied = applied.length > 0 ? Math.max(...applied) : -1;
	const appliedSet = new Set(applied);

	const drift = applied.filter((ts) => !refWhens.has(ts));
	const gaps = journalRef.filter((e) => e.when <= maxApplied && !appliedSet.has(e.when));
	const pending = journalRef.filter((e) => e.when > maxApplied);

	const niespojny = drift.length > 0 || gaps.length > 0 || rozjazdDrzewa !== null || rozjazdPlikow;

	// Kolejność ma znaczenie: NIESPÓJNY (twarde znalezisko) bije NIEROZSTRZYGNIĘTY.
	// Brak potwierdzenia referencji nigdy nie daje SPÓJNY — to jest cała reguła.
	const werdykt: Werdykt = niespojny
		? "NIESPOJNY"
		: przeszkoda !== null
			? "NIEROZSTRZYGNIETY"
			: "SPOJNY";

	return { werdykt, pending, drift, gaps, rozjazdDrzewa, rozjazdPlikow, przeszkoda };
}

// ── warstwa wejścia/wyjścia ─────────────────────────────────────────────────

function tozsamoscReferencji(ref: string): string {
	try {
		return execFileSync("git", ["log", "-1", "--format=%h z %cd", "--date=iso", ref], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();
	} catch {
		return "tożsamość nieustalona";
	}
}

function czyReferencjaZdalna(ref: string): boolean {
	try {
		const pelna = execFileSync("git", ["rev-parse", "--symbolic-full-name", ref], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();
		return pelna.startsWith("refs/remotes/");
	} catch {
		return false;
	}
}

/** Porównanie lokalnej referencji ze stanem zdalnym. null = nie dało się sprawdzić. */
function refZgodnaZeZdalnym(ref: string): boolean | null {
	const m = ref.match(/^([^/]+)\/(.+)$/);
	if (!m) return null;
	const [, zdalne, galaz] = m;
	try {
		const lokalny = execFileSync("git", ["rev-parse", ref], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();
		const wyjscie = execFileSync("git", ["ls-remote", zdalne as string, `refs/heads/${galaz}`], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();
		const zdalny = wyjscie.split(/\s+/)[0];
		if (!zdalny) return null;
		return lokalny === zdalny;
	} catch {
		return null;
	}
}

/** Czy treść `drizzle/` na dysku różni się od referencji (pliki, nie dziennik). */
function plikiMigracjiRozjechane(ref: string): boolean {
	try {
		execFileSync("git", ["diff", "--quiet", ref, "--", "drizzle/"], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		return false;
	} catch {
		return true;
	}
}

async function pobierzZastosowaneZBazy(dbUrl: string): Promise<number[]> {
	const pool = new Pool({ connectionString: dbUrl });
	const c = await pool.connect();
	try {
		const res = await c.query<{ created_at: string }>(
			"SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
		);
		return res.rows.map((r) => Number(r.created_at));
	} finally {
		c.release();
		await pool.end();
	}
}

export type Zaleznosci = {
	journalRef: JournalEntry[];
	journalDisk: JournalEntry[];
	przeszkoda: string | null;
	rozjazdPlikow: boolean;
	/** Wstrzykiwane, żeby dało się udowodnić, że przy STOP-ie NIE jest wołane. */
	pobierzZastosowane: () => Promise<number[]>;
	log?: (s: string) => void;
	err?: (s: string) => void;
};

/**
 * Rdzeń przebiegu. Kluczowa własność bezpieczeństwa, której pilnuje test:
 * przy rozjeździe drzewa/plików `pobierzZastosowane` NIE JEST WOŁANE — bazy
 * produkcyjnej się nie dotyka, bo pytanie jest już unieważnione.
 */
export async function uruchom(d: Zaleznosci): Promise<Wynik> {
	const log = d.log ?? console.log;
	const err = d.err ?? console.error;

	const rozjazdWczesny = sprawdzSwiezosc(d.journalRef, d.journalDisk);
	if (rozjazdWczesny !== null || d.rozjazdPlikow) {
		if (rozjazdWczesny) {
			err("❌ NIEŚWIEŻE / ROZJECHANE DRZEWO ROBOCZE względem referencji:");
			for (const t of rozjazdWczesny.brakNaDysku) err(`   brak na dysku, jest w referencji: ${t}`);
			for (const t of rozjazdWczesny.nadmiarNaDysku)
				err(`   jest na dysku, brak w referencji: ${t}`);
		}
		if (d.rozjazdPlikow) {
			err("❌ TREŚĆ `drizzle/` NA DYSKU RÓŻNI SIĘ OD REFERENCJI.");
			err("   `db:migrate` stosuje PLIKI, nie dziennik — zgodny dziennik niczego tu nie dowodzi.");
		}
		err("   → Bazy NIE odpytywano; pytanie o spójność produkcji jest unieważnione.");
		err("   → Doprowadź drzewo do stanu referencji i powtórz.");
		return porownajDziennik({
			journalRef: d.journalRef,
			journalDisk: d.journalDisk,
			applied: [],
			rozjazdPlikow: d.rozjazdPlikow,
			przeszkoda: d.przeszkoda,
		});
	}

	const applied = await d.pobierzZastosowane();
	const w = porownajDziennik({
		journalRef: d.journalRef,
		journalDisk: d.journalDisk,
		applied,
		rozjazdPlikow: d.rozjazdPlikow,
		przeszkoda: d.przeszkoda,
	});

	const tagByWhen = new Map(d.journalRef.map((e) => [e.when, e.tag]));
	const maxApplied = applied.length > 0 ? Math.max(...applied) : -1;
	log(
		`Baza: ${applied.length} zastosowanych` +
			(maxApplied >= 0
				? ` (ostatni: ${tagByWhen.get(maxApplied) ?? `created_at=${maxApplied} (SPOZA DZIENNIKA!)`}).`
				: "."),
	);

	if (w.drift.length > 0) {
		err("\n❌ DRIFT — wpisy w bazie bez odpowiednika w referencji:");
		for (const ts of w.drift) err(`   created_at=${ts}`);
		err("   → Rozjazd jak w incydencie 0019. NIE migruj; wymagana ręczna analiza.");
	}
	if (w.gaps.length > 0) {
		err("\n❌ LUKA — migracje przeskoczone:");
		for (const e of w.gaps) err(`   ${e.tag} (when=${e.when})`);
	}
	if (w.pending.length > 0) {
		log(`\n⏳ PENDING — db:migrate zastosuje ${w.pending.length} migracj(i):`);
		for (const e of w.pending) log(`   ${e.tag} (when=${e.when})`);
	}
	return w;
}

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error("[prod-journal-check] STOP: DATABASE_URL nie ustawiona.");
		process.exit(2);
	}

	const ref = process.env.PROD_JOURNAL_REF ?? "origin/main";
	const pominietoFetch = process.env.PROD_JOURNAL_SKIP_FETCH === "1";

	if (!pominietoFetch) {
		try {
			execFileSync("git", ["fetch", "origin", "--quiet"], { stdio: ["ignore", "pipe", "pipe"] });
		} catch {
			// Brak sieci nie jest błędem krytycznym — jest powodem NIEROZSTRZYGNIĘCIA.
			// Rozstrzygnie to `refZgodnaZeZdalnym` zwracając null.
		}
	}

	const przeszkoda = ustalPrzeszkodeReferencji({
		pominietoFetch,
		refJestZdalna: czyReferencjaZdalna(ref),
		refZgodnaZeZdalnym: pominietoFetch ? null : refZgodnaZeZdalnym(ref),
		ref,
	});

	console.log("=== prod-journal-check (READ-ONLY) ===");
	console.log(`Referencja: ${ref} = ${tozsamoscReferencji(ref)}`);

	// Przy przeszkodzie nie ma sensu porównywać ani dotykać bazy — werdykt i tak
	// nie może brzmieć „spójny". Kończymy uczciwym „nie wiem".
	if (przeszkoda !== null) {
		console.error(`\n⚠️  NIEROZSTRZYGNIĘTY — ${przeszkoda}`);
		console.error(
			"   → Ten przebieg NIE jest zgodą na migrację i nie zastępuje sprawdzenia.\n" +
				"     Rozstrzygnięcie wymaga łączności ze zdalnym; bez niej odpowiedź brzmi „nie wiem”.\n" +
				"     Bazy NIE odpytywano.",
		);
		console.error("\n[prod-journal-check] WYNIK: NIEROZSTRZYGNIĘTY — STOP przed db:migrate.");
		process.exit(2);
	}

	const w = await uruchom({
		journalRef: readJournalFromRef(ref),
		journalDisk: readJournalFromDisk(),
		przeszkoda,
		rozjazdPlikow: plikiMigracjiRozjechane(ref),
		pobierzZastosowane: () => pobierzZastosowaneZBazy(dbUrl),
	});

	if (w.werdykt === "NIESPOJNY") {
		console.error("\n[prod-journal-check] WYNIK: NIESPÓJNY — STOP przed db:migrate.");
		process.exit(1);
	}
	if (w.werdykt === "NIEROZSTRZYGNIETY") {
		console.error("\n[prod-journal-check] WYNIK: NIEROZSTRZYGNIĘTY — STOP przed db:migrate.");
		process.exit(2);
	}
	if (w.pending.length === 0)
		console.log("\n✅ Brak migracji do zastosowania (baza = referencja).");
	console.log("\n[prod-journal-check] WYNIK: SPÓJNY — db:migrate bezpieczny.");
	process.exit(0);
}

if (require.main === module) {
	main().catch((err) => {
		console.error("[prod-journal-check] FAILED:", err instanceof Error ? err.message : String(err));
		process.exit(2);
	});
}
