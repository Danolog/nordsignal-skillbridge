/**
 * ADR-016 D2 poziom 2a — skaner inwentarza cytatów komunikatów silnika.
 *
 * PO CO: tablica asercji (`cytaty-silnikow.ts`) jest potencjalnym DRUGIM źródłem
 * prawdy. Gdyby kurator dopisał cytat do treści, a nie do tablicy, testy
 * sprawdzałyby własną kopię, nie produkt. Skaner zamyka inwentarz: znajduje
 * w ARTEFAKTACH, które widzi student, każdy kształt „NazwaBłędu: tekst" —
 * a kontrakt-test wymaga, żeby każdy znaleziony kształt miał wiersz w tablicy.
 *
 * ZAKRES SZERSZY NIŻ LITERA ADR-a (świadomie, Eva 2026-07-22): ADR wymienia
 * `tools/content/curriculum-atoms/*.json`, ale POŁOWA inwentarza DuckDB żyje
 * w notebookach (`notebooks/**|/*.ipynb`) — to je student otwiera i to w nich
 * stoi m.in. „Binder Error: Ambiguous reference…", którego w spakowanych atomach
 * nie ma. Skanowanie tylko atomów zostawiłoby tę połowę bez bramki.
 *
 * CO SIĘ SKANUJE, A CO NIE:
 *  - TAK: proza atomów (wszystkie pola tekstowe spakowanego JSON-a) i komórki
 *    MARKDOWN notebooków — czyli to, co jest OBIETNICĄ wobec studenta;
 *  - TAK: wnętrze grawisów `…` ORAZ bloków ```…``` w prozie — treść używa obu
 *    form do pokazania komunikatu dosłownie (np. eda-4 pokazuje `TypeError:
 *    agg function failed …` w płotku). Skan tylko grawisów gubił trzy cytaty;
 *  - NIE: komórki KODU notebooków — tam `except json.JSONDecodeError:` to kod
 *    do napisania, nie obietnica brzmienia komunikatu;
 *  - NIE: dopasowania poprzedzone `except`/`raise`/`class` albo kropką
 *    (`json.JSONDecodeError:`) — to samo rozróżnienie wewnątrz płotka.
 *    Bez tych wykluczeń skaner produkuje fałszywe alarmy i uczy je ignorować.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Kształt komunikatu: `[Człon ]{0,2}…Error|…Exception: treść` (DuckDB ma nazwy dwuczłonowe). */
const KSZTALT =
	/\b((?:[A-Z][A-Za-z]* ){0,2}(?:[A-Z][A-Za-z]*)?(?:Error|Exception))\s*:\s*([^\n]{1,200})/g;

/**
 * Grawisy pojedyncze — konwencja cytowania verbatim (ADR-016 D5.1). Span WOLNO
 * łamać nową linią: treść zawija się na 80 kolumnach i połowa cytatów DuckDB
 * jest przecięta w środku (`Binder Error:\n  column "minuty" must appear…`).
 * Odrzucamy tylko spany z pustą linią — tam grawis został niedomknięty.
 */
const GRAWISY = /`([^`]{1,400})`/g;

/** Płotki ```…``` — treść pokazuje w nich zarówno kod, jak i komunikat dosłownie. */
const PLOTKI = /```[a-z]*\n?([\s\S]*?)```/g;

/** Konstrukcje kodu, po których „Nazwa:" jest składnią, a nie komunikatem. */
const KOD_PRZED = /(?:except|raise|class|def|import|from)\s+[\w.]*$|\.$/;

export type ZnalezionyKsztalt = { ksztalt: string; zrodla: string[] };

/** Zawijanie 80 kolumn w treści zwijamy do spacji — cytat bywa łamany w połowie. */
function normalizuj(tekst: string): string {
	return tekst
		.replace(/\s*\n\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim();
}

function dopasujKsztalty(kandydat: string, zrodlo: string, wynik: Map<string, Set<string>>): void {
	const tekst = normalizuj(kandydat);
	for (const m of tekst.matchAll(KSZTALT)) {
		const przed = tekst.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
		if (KOD_PRZED.test(przed)) continue; // `except json.JSONDecodeError:` itp.
		if (m[2].startsWith("#")) continue; // komentarz doklejony za dwukropkiem
		const ksztalt = `${m[1]}: ${m[2]}`.trim();
		if (!wynik.has(ksztalt)) wynik.set(ksztalt, new Set());
		wynik.get(ksztalt)?.add(zrodlo);
	}
}

function zbierzZTekstu(tekst: string, zrodlo: string, wynik: Map<string, Set<string>>): void {
	// 1) płotki — komunikat pokazany w bloku (i kod, odsiewany przez KOD_PRZED)
	for (const plotek of tekst.matchAll(PLOTKI)) {
		for (const linia of plotek[1].split("\n")) dopasujKsztalty(linia, zrodlo, wynik);
	}
	// 2) grawisy w prozie — cytat verbatim wg konwencji D5.1
	for (const span of tekst.replace(PLOTKI, "\n").matchAll(GRAWISY)) {
		if (/\n\s*\n/.test(span[1])) continue; // niedomknięty grawis, nie cytat
		dopasujKsztalty(span[1], zrodlo, wynik);
	}
}

function chodzPoJson(wartosc: unknown, sciezka: string, zbierz: (t: string, z: string) => void) {
	if (typeof wartosc === "string") zbierz(wartosc, sciezka);
	else if (Array.isArray(wartosc))
		for (const [i, v] of wartosc.entries()) chodzPoJson(v, `${sciezka}[${i}]`, zbierz);
	else if (wartosc && typeof wartosc === "object")
		for (const [k, v] of Object.entries(wartosc)) chodzPoJson(v, `${sciezka}.${k}`, zbierz);
}

/** Spakowane atomy — to, co idzie ingestem do `curriculum_module_items.contentMd`. */
export function skanujAtomy(root: string = process.cwd()): Map<string, Set<string>> {
	const dir = join(root, "tools", "content", "curriculum-atoms");
	const wynik = new Map<string, Set<string>>();
	for (const plik of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
		const json = JSON.parse(readFileSync(join(dir, plik), "utf8")) as unknown;
		chodzPoJson(json, plik, (tekst, zrodlo) => zbierzZTekstu(tekst, zrodlo, wynik));
	}
	return wynik;
}

/** Zbudowane notebooki — to, co student otwiera w Colabie (tylko komórki markdown). */
export function skanujNotebooki(root: string = process.cwd()): Map<string, Set<string>> {
	const dir = join(root, "notebooks");
	const wynik = new Map<string, Set<string>>();
	for (const modul of readdirSync(dir)) {
		// `sonda` to NARZĘDZIE pomiarowe (ADR-016 D3), nie treść studenta — jej
		// komórki z definicji zawierają wszystkie kształty z tablicy i skanowanie
		// jej byłoby liczeniem własnego odbicia.
		if (modul === "sonda") continue;
		const sciezkaModulu = join(dir, modul);
		if (!statSync(sciezkaModulu).isDirectory()) continue;
		for (const plik of readdirSync(sciezkaModulu).filter((f) => f.endsWith(".ipynb"))) {
			const nb = JSON.parse(readFileSync(join(sciezkaModulu, plik), "utf8")) as {
				cells: { cell_type: string; source: string[] }[];
			};
			for (const cell of nb.cells) {
				if (cell.cell_type !== "markdown") continue;
				zbierzZTekstu(cell.source.join(""), `${modul}/${plik}`, wynik);
			}
		}
	}
	return wynik;
}

/** Pełny inwentarz: atomy + notebooki, posortowany, z listą miejsc wystąpienia. */
export function inwentarzCytatow(root: string = process.cwd()): ZnalezionyKsztalt[] {
	const razem = new Map<string, Set<string>>();
	for (const mapa of [skanujAtomy(root), skanujNotebooki(root)]) {
		for (const [ksztalt, zrodla] of mapa) {
			if (!razem.has(ksztalt)) razem.set(ksztalt, new Set());
			for (const z of zrodla) razem.get(ksztalt)?.add(z);
		}
	}
	return [...razem]
		.map(([ksztalt, zrodla]) => ({ ksztalt, zrodla: [...zrodla].sort() }))
		.sort((a, b) => a.ksztalt.localeCompare(b.ksztalt));
}

const isDirectRun =
	typeof process.argv[1] === "string" && process.argv[1].includes("inwentarz-cytatow");
if (isDirectRun) {
	const inwentarz = inwentarzCytatow();
	console.log(`Inwentarz cytatów komunikatów silnika: ${inwentarz.length} kształtów\n`);
	for (const { ksztalt, zrodla } of inwentarz) {
		console.log(`• ${ksztalt}`);
		console.log(`    ${zrodla.join(", ")}`);
	}
}
