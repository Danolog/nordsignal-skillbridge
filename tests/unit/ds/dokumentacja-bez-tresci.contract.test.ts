/**
 * STRAŻNIK: dokument nie niesie ładunku, który nadpisuje treść na produkcji.
 *
 * ── SKĄD SIĘ WZIĄŁ ────────────────────────────────────────────────────────────
 * `docs/runbooks/aktywacja-1e1-neon-console.md` niósł w Kroku 4 gotowy do wklejenia
 * blok `INSERT INTO curriculum_modules (slug, title, description) VALUES (…)
 * ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description` — czyli
 * KOPIĘ tytułów i opisów modułów, tego samego tekstu, który czyta student.
 * Kopię zamrożono 2026-07-11 (`ce4fe18`) i nigdy więcej nie ruszono, podczas gdy
 * nośnik (`tools/content/curriculum-ds-drabina.json`) żył dalej. Stan w chwili
 * usunięcia, zmierzony 2026-08-12: 8 z 8 opisów i 4 z 8 tytułów rozjechane,
 * brak całego modułu `m-pandas` (nośnik miał 9 modułów), 18 trafień kodu
 * wewnętrznego w ładunku („ADR-014", „LEAN", „pkt 10", „Capstone: …").
 *
 * Reguła liczenia tych 18 (bo bez niej liczba jest nie do odtworzenia): liczymy
 * wystąpienia WEWNĄTRZ literałów kolumn czytanych przez studenta (`title`,
 * `description`) — 10 poza słowem „capstone" + 8 razy „capstone" w tytułach
 * i opisach. Surowy `grep` po całym bloku Kroku 4 daje 22, bo dolicza 4
 * wystąpienia w komentarzach SQL i w treści `RAISE EXCEPTION`, których student
 * nigdy nie zobaczy. Wcześniejsze „19" było błędem arytmetycznym (własna
 * wyliczanka sumowała się do 18); poprawione po przeliczeniu Leo i po
 * niezależnym przeliczeniu autorki, 2026-08-13.
 *
 * Dopóki opisy na produkcji były równie zażargonowane, ładunek był tylko martwy.
 * Kuracja języka (PR #291, wdrożona 2026-08-12) zamieniła go w **narzędzie
 * regresji**: ponowne wykonanie Kroku 4 cofnęłoby kurację po cichu, bo polecenie
 * wygląda na rutynową procedurę aktywacyjną, a nie na nadpisanie treści.
 * Klasa nie jest hipotetyczna — w tym repozytorium ręczne polecenia szły na
 * produkcję w obie strony (tabela na prodzie bez migracji i migracja bez tabeli).
 *
 * ── CZEGO PILNUJE ─────────────────────────────────────────────────────────────
 * Żaden plik `.md` w repozytorium nie zawiera polecenia WSTAWIENIA (`INSERT
 * INTO`) ani NADPISANIA (`UPDATE`) w tabeli treści, które wymienia kolumnę
 * czytaną przez studenta (`title`, `description`, `content_md`, `theory_md`,
 * `stem`, `options`, `explanation_md`, `feedback_md`, `hints`).
 * Dokument ma **wołać** nośnik (`pnpm db:ingest-curriculum` + manifest), nie
 * **przepisywać** jego treść — CLAUDE.md v1.17, sekcja 8, „jeden nośnik reguły".
 *
 * ── CZEGO NIE PILNUJE (jawne granice, nie przeoczenie) ────────────────────────
 *   • USUWANIA treści. `DELETE FROM …` nie jest widziany w ogóle, także na
 *     tabeli z listy. Luka nazwana i zmierzona — patrz „LUKA D" niżej.
 *   • STRUKTURY ŚCIEŻKI — `curriculum_path_modules`, `curriculum_module_prereqs`
 *     (przynależność modułu do ścieżki, łańcuch prerekwizytów). Patrz „LUKA D".
 *   • Zapisów do tabel spoza listy TABELE_TRESCI — np. `job_market_data`
 *     (rollback z kopii w `market-refresh-runbook.md` kopiuje wiersze z tabeli
 *     zapasowej, nie niesie ani jednego literału treści) czy dziennika migracji
 *     `drizzle.__drizzle_migrations`. Tam nośnikiem nie jest manifest treści.
 *   • Zapisów, które nie dotykają kolumny czytanej przez studenta — np. backfill
 *     `UPDATE curriculum_module_items SET slug = …` z runbooka 1E.2 (migracja
 *     0036). Kolumna techniczna, student jej nie widzi, kopii treści nie ma.
 *   • Poleceń w plikach innych niż `.md` — `tools/*.sql` i migracje są kodem
 *     wykonywanym przez narzędzie, nie tekstem do przeklejenia ręką.
 *   • Tego, czy produkcja zgadza się z manifestem. Ten test mierzy REPOZYTORIUM.
 *     Zgodność bazy z repo daje dopiero ingest — i tylko Ethan, na prodzie.
 *
 * ── LUKA D: usuwanie i struktura ścieżki (jawna, z progiem) ───────────────────
 * Strażnik NIE widzi najcięższej części ładunku, który go zrodził. Ładunek
 * Kroku 4 zaczynał się od `DELETE FROM curriculum_path_modules WHERE path_key =
 * 'data-science'` i reinsertu ośmiu modułów — czyli **wyrzucenia `m-pandas` ze
 * ścieżki**. Tego ten test nie łapie (mutacja Leo, 2026-08-12: plik z tym
 * właśnie `DELETE` przechodzi na zielono).
 *
 * Dlaczego mimo to nie domykamy tego tutaj — i dlaczego to NIE jest „za drogo":
 *   1. Domknięcie wymaga DRUGIEJ reguły, nie rozszerzenia tej. Tabele struktury
 *      ścieżki nie mają ani jednej kolumny czytanej przez studenta
 *      (`curriculum_path_modules` to `id`, `path_key`, `module_id`, `position`
 *      — migracja 0035, linie 95–100). Dopisanie ich do TABELE_TRESCI byłoby
 *      martwym kodem: filtr KOLUMNY_STUDENTA nigdy by nie trafił. Dla struktury
 *      szkodliwy jest sam zapis, niezależnie od kolumny — inne kryterium.
 *   2. Rozszerzenie o `DELETE` zaczerwieni istniejące, ZATWIERDZONE procedury
 *      wycofania w `docs/decisions/009-…` i `010-…` (sign-off Darka 2026-07-02).
 *      To nie jest usterka do cichego naprawienia w tym PR — to decyzja
 *      produktowa o tym, czy dokument w ogóle ma prawo nieść gotowe polecenie
 *      niszczące. Waga: `project_submissions` kasuje się kaskadą od `projects`
 *      (migracja 0001, linia 55: `ON DELETE cascade`), czyli w promieniu rażenia
 *      jest warstwa kredencjału z CLAUDE.md sekcja 7.
 *
 * PRÓG DOMKNIĘCIA (CLAUDE.md v1.17 — odłożenie wolno zostawić tylko z progiem):
 *   • przy pierwszej decyzji na zgłoszeniu następczym „bloki wycofania w ADR
 *     009/010" (Sophia + Ethan), ALBO
 *   • przy pierwszym nowym pliku `.md` niosącym `DELETE FROM` na tabeli treści
 *     — cokolwiek nastąpi wcześniej.
 * Do tego czasu luka jest jawna tutaj i w opisie zgłoszenia, i NIKT nie cytuje
 * tego strażnika jako dowodu, że dokumentacja nie potrafi skasować treści.
 *
 * Granica jest wąska celowo (CLAUDE.md v1.17: reguła ma nie stać się rytuałem).
 * Zakazujemy jednej rzeczy: dokumentu, który sam w sobie potrafi **nadpisać**
 * to, co czyta student. Nie „zmienić" i nie „skasować" — nadpisać.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const KORZEN = process.cwd();

/** Katalogi, w których nie szukamy — cudzy kod i artefakty budowania. */
const POMIJANE = new Set(["node_modules", ".git", ".next", "coverage", "dist", ".turbo"]);

/**
 * Tabele, których wiersze student czyta jako treść nauki, a których kanonicznym
 * źródłem jest manifest w `tools/content/`.
 */
const TABELE_TRESCI = [
	"curriculum_modules",
	"curriculum_module_items",
	"curriculum_atoms",
	"projects",
	"project_learning_resources",
	"question_items",
	"question_concepts",
] as const;

/** Kolumny, których zawartość trafia na ekran studenta. */
const KOLUMNY_STUDENTA = [
	"title",
	"description",
	"content_md",
	"theory_md",
	"stem",
	"options",
	"explanation_md",
	"feedback_md",
	"hints",
] as const;

/** Jak daleko od słowa-klucza tabeli szukamy nazwy kolumny (jedno polecenie SQL). */
const ZASIEG_POLECENIA = 1200;

function plikiMd(katalog = KORZEN): string[] {
	const out: string[] = [];
	for (const wpis of readdirSync(katalog)) {
		if (POMIJANE.has(wpis)) continue;
		const pelna = join(katalog, wpis);
		if (statSync(pelna).isDirectory()) {
			out.push(...plikiMd(pelna));
			continue;
		}
		if (wpis.endsWith(".md")) out.push(pelna);
	}
	return out;
}

type Trafienie = {
	plik: string;
	linia: number;
	tabela: string;
	kolumny: string[];
	fragment: string;
};

/**
 * JEDYNY NOŚNIK DOPASOWANIA (CLAUDE.md v1.17, sekcja 8, „jeden nośnik reguły").
 *
 * Szuka polecenia zapisu (`INSERT INTO` / `UPDATE`) do tabeli treści, po którym
 * w zasięgu jednego polecenia pada nazwa kolumny czytanej przez studenta.
 *
 * Cudzysłowy wokół nazw (`"curriculum_module_items"`) są dopuszczalne — Postgres
 * je przyjmuje, więc ładunek z nimi jest równie wykonywalny.
 *
 * Ta funkcja jest jedynym miejscem, w którym żyje wzorzec dopasowania. Zarówno
 * test dodatni (po realnych plikach), jak i kontrola dwustronna wołają JĄ —
 * żaden z nich nie odtwarza jej wnętrza. Poprzednia wersja miała ten sam napis
 * przepisany w dwóch miejscach, przez co kontrola dwustronna badała własną
 * kopię i nie drgnęła, gdy Leo zmienił detektor (mutacja z 2026-08-12).
 * Dokładnie ta wada, którą to zgłoszenie zwalcza — w narzędziu do jej zwalczania.
 */
function trafieniaWTekscie(tekst: string, etykieta: string): Trafienie[] {
	const out: Trafienie[] = [];
	for (const tabela of TABELE_TRESCI) {
		const wzorzec = new RegExp(`\\b(?:INSERT\\s+INTO|UPDATE)\\s+"?${tabela}"?\\b`, "gi");
		for (const m of tekst.matchAll(wzorzec)) {
			const okno = tekst.slice(m.index, m.index + ZASIEG_POLECENIA);
			const kolumny = KOLUMNY_STUDENTA.filter((k) =>
				new RegExp(`(?<![\\w])"?${k}"?(?![\\w])`).test(okno),
			);
			if (kolumny.length === 0) continue;
			out.push({
				plik: etykieta,
				linia: tekst.slice(0, m.index).split("\n").length,
				tabela,
				kolumny: [...kolumny],
				fragment: okno.slice(0, 90).replace(/\s+/g, " "),
			});
		}
	}
	return out;
}

/** Cienka powłoka: czyta plik z dysku i oddaje go jedynemu nośnikowi wyżej. */
function trafieniaWPliku(sciezka: string): Trafienie[] {
	return trafieniaWTekscie(
		readFileSync(sciezka, "utf8"),
		relative(KORZEN, sciezka).split(sep).join("/"),
	);
}

describe("dokumentacja nie niesie ładunku nadpisującego treść studenta", () => {
	it("żaden plik .md nie zapisuje do tabeli treści kolumny czytanej przez studenta", () => {
		const złe = plikiMd().flatMap(trafieniaWPliku);
		expect(
			złe,
			"Dokument niesie polecenie, które nadpisze treść czytaną przez studenta —\n" +
				"czyli DRUGI NOŚNIK obok manifestu (CLAUDE.md v1.17, sekcja 8):\n" +
				złe
					.map(
						(x) =>
							`  • ${x.plik}:${x.linia} — zapis do \`${x.tabela}\`, kolumny: ${x.kolumny.join(", ")}\n` +
							`      „${x.fragment}…"`,
					)
					.join("\n") +
				"\nZamiast ładunku wpisz WYWOŁANIE nośnika:\n" +
				"  DATABASE_URL='<PROD DIRECT>' CONFIRM_PROD_DB=1 pnpm db:ingest-curriculum\n" +
				"Nośnik treści drabiny: tools/content/curriculum-ds-drabina.json.",
		).toEqual([]);
	});

	/**
	 * Kontrola dwustronna (CLAUDE.md v1.17: „gdzie to tanie, dokłada się kontrolę
	 * dwustronną"). Strażnik ma się czerwienić na ładunku i NIE czerwienić na
	 * wzorcach, które są w repozytorium legalne. Bez tego pierwsza fałszywa
	 * czerwień nauczy kogoś wyłączać strażnika zamiast poprawiać dokument.
	 *
	 * CZYM TO JEST, A CZYM NIE (sprostowanie po przeglądzie Leo, 2026-08-13):
	 * poniższe trzy wzorce to **literały przepisane ręcznie**, modelowane na
	 * poleceniach z realnych plików — NIE odczyt tych plików z dysku. Wcześniejszy
	 * opis nazywał je „prawdziwymi danymi"; to była nadinterpretacja. Że wzorzec
	 * jest cytatem z realnego pliku, nie czyni go odczytem — przy najbliższej
	 * edycji runbooka 1E.2 ten literał nadal będzie brzmiał jak dziś.
	 *
	 * Kontrolę „nie czerwienimy się na legalnych wzorcach" NA PRAWDZIWYCH DANYCH
	 * dostarcza test dodatni wyżej: przebiega po wszystkich realnych plikach `.md`
	 * w repozytorium (189 na 2026-08-12) i jest zielony, mimo że kilka z nich
	 * niesie legalne zapisy. Ten test poniżej dokłada precyzję na poziomie
	 * pojedynczego wzorca — i, po refaktorze, woła TEN SAM nośnik dopasowania.
	 */
	it("nie czerwieni się na zapisie bez kolumny czytanej przez studenta ani na tabeli spoza treści", () => {
		const legalne = [
			// backfill kolumny technicznej — runbook 1E.2, migracja 0036
			'UPDATE "curriculum_module_items" SET "slug" = CASE WHEN "kind" = \'project\' THEN \'capstone\' END',
			// rollback danych rynku z kopii — market-refresh-runbook.md
			"INSERT INTO job_market_data SELECT * FROM job_market_data_bak;",
			// dziennik migracji — oba runbooki aktywacyjne
			"INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('ad28…', 1783778817693);",
			// ODCZYT weryfikacyjny po ingeście — wzorzec z Kroku 5 obu runbooków
			// (`SELECT … FROM curriculum_modules`, 1E.1 linia 101, 1E.2 linia 80).
			// Ten wzorzec jest w zestawie NIEPRZYPADKOWO: jako jedyny wymienia
			// jednocześnie tabelę treści i kolumnę studenta, więc jako jedyny
			// realnie bada KSZTAŁT WZORCA, a nie samą listę tabel. Bez niego
			// kontrola dwustronna nie potrafiła się zaczerwienić na żadnej
			// zmianie detektora (zmierzone mutacjami M4/M5, 2026-08-13).
			"SELECT * FROM curriculum_modules ORDER BY title;",
		];
		for (const fragment of legalne) {
			expect(
				trafieniaWTekscie(fragment, "<literał kontroli dwustronnej>"),
				`Fałszywe trafienie na legalnym wzorcu: „${fragment}"`,
			).toEqual([]);
		}
	});
});
