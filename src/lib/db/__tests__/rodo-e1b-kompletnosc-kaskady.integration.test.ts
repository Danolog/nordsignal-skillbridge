// @vitest-environment node
//
// S-U-1 — STRAŻNIK KOMPLETNOŚCI KASKADY, CZYTANY Z KATALOGU BAZY (E1b §5).
// NAJWAŻNIEJSZY strażnik tego zadania: to on jest bramką zapłonu ścieżki
// usunięcia konta na produkcji (E1b §6: „ścieżka bez S-U-1 nie zapala się”).
//
// CZEGO PILNUJE. Że KAŻDA tabela w bazie jest albo czyszczona przy usunięciu
// konta, albo figuruje na jawnej liście wyjątków z powodem. Zerwanie tej reguły
// jest BEZGŁOŚNE: nowa tabela z kolumną `student_id` bez klucza obcego nie psuje
// niczego widocznego — nic nie rzuca błędu, żaden ekran nie wygląda inaczej,
// przebieg testów jest zielony. Psuje wyłącznie prawo, którego nikt nie testuje.
//
// ── CAŁA WARTOŚĆ TEGO PLIKU: NIE MA TU LISTY TABEL ──────────────────────────
//
// Test odczytuje `pg_class` i `pg_constraint`, buduje graf kasowania z korzenia
// `"user"` i porównuje wynik z listą wyjątków. Lista tabel w kodzie testu
// czyniłaby go zielonym w dniu dodania tabeli, której nikt do niej nie dopisał —
// czyli dokładnie wtedy, kiedy ma się zaczerwienić.
//
// ── DWIE RÓŻNICE WOBEC S-A1-3, OBIE ŚWIADOME ────────────────────────────────
//
// (1) S-A1-3 czyta `WIEZI_KASKADY` — wąską listę pięciu więzi, na których stoi
//     argument prawny długu A-1. Ten strażnik odpowiada na INNE pytanie: „czy
//     któraś tabela wymyka się kaskadzie”. Dwie różne reguły, dwie różne osie.
//     Mutacja zdejmująca kaskadę z `passports` czerwieni OBA — i tak ma być:
//     jeden powie „ta więź straciła kaskadę”, drugi „ta tabela wypadła
//     z zasięgu”. Różne komunikaty, różne osie, żaden nie jest kopią drugiego.
//
// (2) S-A1-3 zawęża odczyt do więzi JEDNOKOLUMNOWYCH (`array_length(conkey,1)=1`)
//     — i dla jego listy pięciu pozycji to jest w porządku. Dla GRAFU
//     KOMPLETNOŚCI to za wąsko: więź złożona wypadłaby z grafu PO CICHU,
//     a cichy ubytek w grafie kompletności jest gorszy niż w liście pięciu
//     pozycji. Ten strażnik czyta WSZYSTKIE więzi.
//     Pomiar 2026-08-12 na bazie testowej: więzi wielokolumnowych jest dziś
//     ZERO, więc poprawka nie zmienia ani jednego dzisiejszego wyniku —
//     zapisuję to wprost, żeby nikt nie uznał jej za naprawę czegoś zepsutego.
//
// ── GRANICA, KTÓREJ TEN STRAŻNIK NIE PRZEKRACZA ─────────────────────────────
//
// Czyta katalog BAZY TESTOWEJ, budowanej z `drizzle/`. Tabela utworzona ręcznie
// na produkcji jest dla niego niewidzialna — patrz
// `GRANICA_STRAZNIKA_TABELE_SPOZA_MIGRACJI` w nośniku zakresu.
//
// Wymaga DATABASE_URL na localhost po `pnpm db:migrate:test`.

import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import {
	GRANICA_STRAZNIKA_TABELE_SPOZA_MIGRACJI,
	KOLUMNY_WSKAZUJACE_OSOBE,
	KORZEN_KASKADY,
	TABELE_BEZ_DANYCH_OSOBY,
	WYJATKI_KOLUMN_BEZ_FK,
} from "./rodo-e1b-zakres-usuwania";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

type Wiez = {
	tabela: string;
	rodzic: string;
	nazwa: string;
	akcja: string;
	kolumny: string[];
};
type Kolumna = { tabela: string; kolumna: string };

dBack("S-U-1 · kompletnosc kaskady usuniecia konta (z katalogu bazy)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: db ładowane dynamicznie po env.
	let db: any;
	let tabele: string[] = [];
	let wiezi: Wiez[] = [];
	let kolumny: Kolumna[] = [];
	let kasowane = new Set<string>();

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));

		const rTabele = await db.execute(sql`
			SELECT c.relname::text AS tabela
			  FROM pg_class c
			  JOIN pg_namespace n ON n.oid = c.relnamespace
			 WHERE n.nspname = 'public' AND c.relkind = 'r'
			 ORDER BY 1
		`);
		tabele = ((rTabele.rows ?? rTabele) as { tabela: string }[]).map((r) => r.tabela);

		// WSZYSTKIE więzi — bez zawężenia do jednokolumnowych (różnica (2) wyżej).
		// Kolumny agregowane w kolejności `conkey`, żeby więź złożona miała komplet.
		const rWiezi = await db.execute(sql`
			SELECT dziecko.relname::text AS tabela,
			       rodzic.relname::text  AS rodzic,
			       c.conname::text       AS nazwa,
			       CASE c.confdeltype
			            WHEN 'c' THEN 'cascade'
			            WHEN 'n' THEN 'set null'
			            WHEN 'd' THEN 'set default'
			            WHEN 'r' THEN 'restrict'
			            WHEN 'a' THEN 'no action'
			            ELSE c.confdeltype::text
			       END                   AS akcja,
			       (SELECT array_agg(a.attname::text ORDER BY x.ord)
			          FROM unnest(c.conkey) WITH ORDINALITY AS x(attnum, ord)
			          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = x.attnum
			       )                     AS kolumny
			  FROM pg_constraint c
			  JOIN pg_class dziecko ON dziecko.oid = c.conrelid
			  JOIN pg_class rodzic  ON rodzic.oid  = c.confrelid
			 WHERE c.contype = 'f'
		`);
		wiezi = (rWiezi.rows ?? rWiezi) as Wiez[];

		const rKolumny = await db.execute(sql`
			SELECT c.relname::text AS tabela, a.attname::text AS kolumna
			  FROM pg_class c
			  JOIN pg_namespace n ON n.oid = c.relnamespace
			  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
			 WHERE n.nspname = 'public' AND c.relkind = 'r'
			 ORDER BY 1, 2
		`);
		kolumny = (rKolumny.rows ?? rKolumny) as Kolumna[];

		// Propagacja kasowania z korzenia — dokładnie to, co zrobi baza.
		kasowane = new Set<string>([KORZEN_KASKADY]);
		let zmiana = true;
		while (zmiana) {
			zmiana = false;
			for (const w of wiezi) {
				if (w.akcja === "cascade" && kasowane.has(w.rodzic) && !kasowane.has(w.tabela)) {
					kasowane.add(w.tabela);
					zmiana = true;
				}
			}
		}
	}, 60_000);

	// ── KONTROLA DWUSTRONNA — wymóg twardy, przed każdą asercją właściwą ──────

	it("odczyt katalogu cokolwiek zwrocil i graf ma wiecej niz sam korzen", () => {
		// Test, który zbadał ZERO tabel, przechodzi dokładnie tak samo jak ten,
		// który zbadał wszystkie. Ta asercja jest jedyną różnicą między nimi.
		// Progi celowo niskie i bezwzględne (nie „tyle, ile było wczoraj”) —
		// mają łapać pustkę, nie zmianę schematu.
		expect(tabele.length, "Katalog nie zwrócił ani jednej tabeli.").toBeGreaterThan(10);
		expect(wiezi.length, "Katalog nie zwrócił ani jednej więzi.").toBeGreaterThan(10);
		expect(
			kasowane.size,
			"Graf kasowania zawiera wyłącznie korzeń — propagacja nie zadziałała, " +
				"a wtedy KAŻDA tabela wygląda na „poza zbiorem” i wszystkie asercje niżej " +
				"kłamią w tę samą stronę.",
		).toBeGreaterThan(5);

		// Ślad w wyjściu — liczba zbadanych tabel ma być WIDOCZNA, nie domyślna.
		console.log(
			`[S-U-1] zbadanych tabel: ${tabele.length}; więzi: ${wiezi.length}; ` +
				`kasowanych kaskadą: ${kasowane.size}; poza zbiorem: ${tabele.length - kasowane.size}`,
		);
	});

	// ── ASERCJA GŁÓWNA: każda tabela albo kasowana, albo wyjaśniona ───────────

	it("kazda tabela jest albo czyszczona kaskada, albo ma powod na liscie wyjatkow", () => {
		const bezRozstrzygniecia = tabele
			.filter((t) => !kasowane.has(t))
			.filter((t) => !TABELE_BEZ_DANYCH_OSOBY[t]);

		expect(
			bezRozstrzygniecia,
			"Tabela nie jest czyszczona przy usunięciu konta i nikt nie napisał, dlaczego wolno " +
				"jej zostać. Dwa poprawne wyjścia i ani jednego trzeciego: (a) dodaj klucz obcy " +
				"z ON DELETE CASCADE prowadzący do konta, albo (b) dopisz tabelę do " +
				"TABELE_BEZ_DANYCH_OSOBY z jednozdaniowym powodem odpowiadającym na pytanie " +
				"„czy po usunięciu konta ten wiersz nadal mówi, co robił ten konkretny człowiek”. " +
				"Milczenie nie jest wyjściem — art. 17 RODO.",
		).toEqual([]);
	});

	it("lista wyjatkow nie zawiera pozycji martwych (tabela usunieta albo kasowana kaskada)", () => {
		// Kontrola w drugą stronę. Lista wyjątków, która puchnie o pozycje bez
		// pokrycia w rzeczywistości, przestaje być czytana — a wtedy dopisanie
		// czterdziestej pierwszej pozycji nie budzi nikogo. To jest atrapa
		// w drugą stronę i psuje strażnika równie skutecznie jak jego brak.
		const nieistniejace = Object.keys(TABELE_BEZ_DANYCH_OSOBY).filter((t) => !tabele.includes(t));
		const juzKasowane = Object.keys(TABELE_BEZ_DANYCH_OSOBY).filter((t) => kasowane.has(t));
		expect(
			{ nieistniejace, juzKasowane },
			"Pozycja na liście wyjątków bez pokrycia: tabela nie istnieje albo i tak ginie " +
				"kaskadą. Usuń ją — lista ma być krótka i prawdziwa.",
		).toEqual({ nieistniejace: [], juzKasowane: [] });
	});

	// ── ASERCJA: nic nie zatrzymuje usunięcia ────────────────────────────────

	it("zadna wiez wchodzaca w zbior kasowany nie zatrzymuje usuniecia", () => {
		// Więź NO ACTION/RESTRICT prowadząca do tabeli kasowanej sprawia, że baza
		// ODMÓWI skasowania rodzica. Skutek nie jest cichy — jest głośny i gorszy:
		// usunięcie konta pada wyjątkiem u użytkownika, który właśnie korzysta
		// z prawa. Precedens własny: wyzwalacz `BEFORE UPDATE OR DELETE`
		// skopiowany odruchowo z audit_log na tabelę kaskadowaną (migracja 0045,
		// znalezisko P-2) łamał art. 17 dokładnie w ten sposób.
		const blokujace = wiezi
			.filter((w) => kasowane.has(w.rodzic) && (w.akcja === "no action" || w.akcja === "restrict"))
			.map((w) => `${w.tabela}.(${w.kolumny.join(",")}) → ${w.rodzic} [${w.akcja}] (${w.nazwa})`);
		expect(
			blokujace,
			"Więź zatrzymująca usunięcie konta. Baza odmówi skasowania rodzica, dopóki dziecko " +
				"istnieje — użytkownik dostanie błąd zamiast wykonanego prawa.",
		).toEqual([]);
	});

	// ── ASERCJA: wskaźnik na osobę poza zbiorem musi być znany bazie ──────────

	it("kolumna wskazujaca osobe poza zbiorem kasowanym ma klucz obcy albo jawny wyjatek", () => {
		// Kolumna `text` bez klucza obcego jest dla bazy zwykłym napisem — nie
		// wie o niej nic, więc nie skasuje jej ani nie wyczyści. To jest kształt,
		// w którym identyfikator osoby przeżywa usunięcie konta w ciszy.
		const nazwy = new Set<string>(KOLUMNY_WSKAZUJACE_OSOBE);
		const bezWiezi = kolumny
			.filter((k) => nazwy.has(k.kolumna))
			.filter((k) => !kasowane.has(k.tabela))
			.filter((k) => !wiezi.some((w) => w.tabela === k.tabela && w.kolumny.includes(k.kolumna)))
			.map((k) => `${k.tabela}.${k.kolumna}`)
			.filter((klucz) => !WYJATKI_KOLUMN_BEZ_FK[klucz]);

		expect(
			bezWiezi,
			"Kolumna wskazująca osobę, o której baza nic nie wie, w tabeli, która NIE ginie " +
				"z kontem. Po usunięciu konta zostaje w niej wiszący identyfikator. Dodaj klucz " +
				"obcy (CASCADE albo SET NULL) albo dopisz pozycję do WYJATKI_KOLUMN_BEZ_FK " +
				"z powodem — trzeciej drogi nie ma.",
		).toEqual([]);
	});

	it("lista wyjatkow kolumnowych nie zawiera pozycji martwych", () => {
		const martwe = Object.keys(WYJATKI_KOLUMN_BEZ_FK).filter((klucz) => {
			const [tabela, kolumna] = klucz.split(".");
			return !kolumny.some((k) => k.tabela === tabela && k.kolumna === kolumna);
		});
		expect(martwe, "Wyjątek kolumnowy bez pokrycia — kolumna nie istnieje.").toEqual([]);
	});

	// ── Granica strażnika: nazwana, nie udawana ──────────────────────────────

	it("granica strazniku jest zapisana jawnie (etykieta zamiast udawanego pokrycia)", () => {
		// Ta asercja nie broni schematu — broni UCZCIWOŚCI raportu. Dopóki lista
		// jest niepusta, nikomu nie wolno napisać „S-U-1 dowodzi kompletności
		// kaskady na produkcji”: dowodzi jej na katalogu zbudowanym z migracji.
		expect(GRANICA_STRAZNIKA_TABELE_SPOZA_MIGRACJI.length).toBeGreaterThan(0);
	});
});
