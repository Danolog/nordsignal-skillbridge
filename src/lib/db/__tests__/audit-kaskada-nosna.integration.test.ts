// @vitest-environment node
//
// S-A1-3 — STRAŻNIK PRZESŁANKI NOŚNEJ: łańcuch kaskady (ADR A-1 (a+), §2.3 i §5).
//
// Czego pilnuje. Cały kierunek (a+) stoi na jednym zdaniu: „każdy `target_id`
// w zdarzeniach klasy 1 prowadzi do tabeli, która kasuje się KASKADĄ przy
// usunięciu konta". Po A1+A2 wiersz audytu nie niesie już nic innego, co
// wskazuje na osobę — więc gdy któraś więź straci kaskadę, wiersz PRZESTAJE
// być sierotą, a `audit_log` wygląda dokładnie tak samo jak wcześniej.
// Awaria byłaby BEZGŁOŚNA i to jest jedyny powód istnienia tego pliku.
//
// Dlaczego osobno, a nie wewnątrz S-A1-2 (wymóg Ryana, §5): S-A1-2 też by padł,
// ale z komunikatem „wiersz nadal wskazuje na żywy rekord" zamiast „ktoś zdjął
// kaskadę z passports.student_id". Strażnik, który nie mówi, CO się zepsuło,
// kosztuje pół dnia diagnozy przy każdym zapaleniu.
//
// Czytamy z KATALOGU BAZY (`pg_constraint`), nie z pliku schematu — plik opisuje
// zamiar, katalog opisuje stan. Rozjazd między nimi jest właśnie tą klasą awarii,
// którą chcemy złapać.
//
// Wymaga DATABASE_URL na localhost po `pnpm db:migrate:test`.

import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

/**
 * Łańcuch, na którym stoi (a+). Korzeniem jest `user`; `students` jest pierwszym
 * ogniwem, reszta wisi na `students`. Wszystkie cele zdarzeń klasy 1
 * (`passports`, `project_submissions`, `students`) leżą na tym drzewie —
 * `assessment_sessions` i `viva_sessions` dokładamy, bo niosą wzorzec A7
 * i wskaźnik w `metadata`.
 */
const WIEZI = [
	{ tabela: "students", kolumna: "user_id", rodzic: "user" },
	{ tabela: "passports", kolumna: "student_id", rodzic: "students" },
	{ tabela: "project_submissions", kolumna: "student_id", rodzic: "students" },
	{ tabela: "assessment_sessions", kolumna: "student_id", rodzic: "students" },
	{ tabela: "viva_sessions", kolumna: "student_id", rodzic: "students" },
] as const;

type WierszWiezi = {
	tabela: string;
	kolumna: string;
	rodzic: string;
	akcja_usuniecia: string;
};

dBack("S-A1-3 · kaskada usuniecia konta — przeslanka nosna kierunku (a+)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: db ładowane dynamicznie po env.
	let db: any;
	let odczyt: WierszWiezi[] = [];

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		const wynik = await db.execute(sql`
			SELECT
				dziecko.relname::text                AS tabela,
				kol.attname::text                    AS kolumna,
				rodzic.relname::text                 AS rodzic,
				CASE c.confdeltype
					WHEN 'c' THEN 'cascade'
					WHEN 'n' THEN 'set null'
					WHEN 'd' THEN 'set default'
					WHEN 'r' THEN 'restrict'
					WHEN 'a' THEN 'no action'
					ELSE c.confdeltype::text
				END                                  AS akcja_usuniecia
			FROM pg_constraint c
			JOIN pg_class     dziecko ON dziecko.oid = c.conrelid
			JOIN pg_class     rodzic  ON rodzic.oid  = c.confrelid
			JOIN pg_attribute kol     ON kol.attrelid = c.conrelid AND kol.attnum = c.conkey[1]
			WHERE c.contype = 'f'
			  AND array_length(c.conkey, 1) = 1
		`);
		odczyt = (wynik.rows ?? wynik) as WierszWiezi[];
	});

	it("odczyt katalogu cokolwiek zwrocil (straznik nie przechodzi na pustym zbiorze)", () => {
		// Gdyby zapytanie przestało cokolwiek zwracać (zmiana nazw katalogu,
		// pusta baza, zła rola), pętla asercji niżej byłaby zielona bez sensu.
		expect(odczyt.length).toBeGreaterThan(10);
	});

	for (const w of WIEZI) {
		it(`${w.tabela}.${w.kolumna} → ${w.rodzic} ma ON DELETE CASCADE`, () => {
			const znalezione = odczyt.filter(
				(r) => r.tabela === w.tabela && r.kolumna === w.kolumna && r.rodzic === w.rodzic,
			);
			expect(
				znalezione.length,
				`Brak klucza obcego ${w.tabela}.${w.kolumna} → ${w.rodzic}. ` +
					"Bez tej więzi wiersz audytu nie osieroci się po usunięciu konta " +
					"i kierunek (a+) przestaje cokolwiek gwarantować.",
			).toBe(1);
			expect(
				znalezione[0].akcja_usuniecia,
				`Więź ${w.tabela}.${w.kolumna} → ${w.rodzic} ma akcję ` +
					`'${znalezione[0].akcja_usuniecia}' zamiast 'cascade'. Zdjęcie kaskady ` +
					"jest BEZGŁOŚNE dla audit_log: wiersze wyglądają tak samo, a przestają " +
					"być sierotami (motyw 26 RODO przestaje się stosować).",
			).toBe("cascade");
		});
	}

	it("audit_log NIE MA klucza obcego — kaskada na tej tabeli zepsulaby usuwanie kont", () => {
		// Wersja dosłowna briefu („kaskadujący target_id") jest aktywnie szkodliwa:
		// kaskada wykonuje DELETE na audit_log, budzi wyzwalacz append-only (0008)
		// i PRZERYWA usuwanie konta. Zmierzone wykonaniem, wycena Maxa v1.1 §2b.
		// Drugi, niezależny powód: `target_id` jest wielopostaciowy (cztery różne
		// tabele), a jedna kolumna nie może mieć klucza obcego do czterech naraz.
		const naAudycie = odczyt.filter((r) => r.tabela === "audit_log");
		expect(
			naAudycie.map((r) => `${r.kolumna} → ${r.rodzic} (${r.akcja_usuniecia})`),
			"Klucz obcy na audit_log zamienia gwarancję 'nie da się usunąć śladu' " +
				"w 'nie da się usunąć konta' — art. 17 RODO niewykonalny.",
		).toEqual([]);
	});
});
