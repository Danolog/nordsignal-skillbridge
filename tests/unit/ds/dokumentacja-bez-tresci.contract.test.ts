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
 * brak całego modułu `m-pandas` (nośnik miał 9 modułów), 19 trafień kodu
 * wewnętrznego w ładunku („ADR-014", „LEAN", „pkt 10", „Capstone: …").
 *
 * Dopóki opisy na produkcji były równie zażargonowane, ładunek był tylko martwy.
 * Kuracja języka (PR #291, wdrożona 2026-08-12) zamieniła go w **narzędzie
 * regresji**: ponowne wykonanie Kroku 4 cofnęłoby kurację po cichu, bo polecenie
 * wygląda na rutynową procedurę aktywacyjną, a nie na nadpisanie treści.
 * Klasa nie jest hipotetyczna — w tym repozytorium ręczne polecenia szły na
 * produkcję w obie strony (tabela na prodzie bez migracji i migracja bez tabeli).
 *
 * ── CZEGO PILNUJE ─────────────────────────────────────────────────────────────
 * Żaden plik `.md` w repozytorium nie zawiera polecenia ZAPISU do tabeli treści,
 * które wymienia kolumnę czytaną przez studenta (`title`, `description`,
 * `content_md`, `stem`, `explanation_md`, `feedback_md`, `hints`, `options`).
 * Dokument ma **wołać** nośnik (`pnpm db:ingest-curriculum` + manifest), nie
 * **przepisywać** jego treść — CLAUDE.md v1.17, sekcja 8, „jeden nośnik reguły".
 *
 * ── CZEGO NIE PILNUJE (jawne granice, nie przeoczenie) ────────────────────────
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
 * Granica jest wąska celowo (CLAUDE.md v1.17: reguła ma nie stać się rytuałem).
 * Zakazujemy jednej rzeczy: dokumentu, który sam w sobie potrafi nadpisać to,
 * co czyta student.
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
 * Szuka polecenia zapisu (`INSERT INTO` / `UPDATE`) do tabeli treści, po którym
 * w zasięgu jednego polecenia pada nazwa kolumny czytanej przez studenta.
 *
 * Cudzysłowy wokół nazw (`"curriculum_module_items"`) są dopuszczalne — Postgres
 * je przyjmuje, więc ładunek z nimi jest równie wykonywalny.
 */
function trafieniaWPliku(sciezka: string): Trafienie[] {
	const tekst = readFileSync(sciezka, "utf8");
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
				plik: relative(KORZEN, sciezka).split(sep).join("/"),
				linia: tekst.slice(0, m.index).split("\n").length,
				tabela,
				kolumny: [...kolumny],
				fragment: okno.slice(0, 90).replace(/\s+/g, " "),
			});
		}
	}
	return out;
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
	 * dwóch wzorcach, które są w repozytorium legalne. Bez tego pierwsza fałszywa
	 * czerwień nauczy kogoś wyłączać strażnika zamiast poprawiać dokument.
	 */
	it("nie czerwieni się na zapisie bez kolumny czytanej przez studenta ani na tabeli spoza treści", () => {
		const legalne = [
			// backfill kolumny technicznej — runbook 1E.2, migracja 0036
			'UPDATE "curriculum_module_items" SET "slug" = CASE WHEN "kind" = \'project\' THEN \'capstone\' END',
			// rollback danych rynku z kopii — market-refresh-runbook.md
			"INSERT INTO job_market_data SELECT * FROM job_market_data_bak;",
			// dziennik migracji — oba runbooki aktywacyjne
			"INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('ad28…', 1783778817693);",
		];
		for (const fragment of legalne) {
			const kolumnyWZasiegu = TABELE_TRESCI.flatMap((tabela) => {
				const wzorzec = new RegExp(`\\b(?:INSERT\\s+INTO|UPDATE)\\s+"?${tabela}"?\\b`, "gi");
				const m = wzorzec.exec(fragment);
				if (!m) return [];
				const okno = fragment.slice(m.index, m.index + ZASIEG_POLECENIA);
				return KOLUMNY_STUDENTA.filter((k) => new RegExp(`(?<![\\w])"?${k}"?(?![\\w])`).test(okno));
			});
			expect(kolumnyWZasiegu, `Fałszywe trafienie na legalnym wzorcu: „${fragment}"`).toEqual([]);
		}
	});
});
