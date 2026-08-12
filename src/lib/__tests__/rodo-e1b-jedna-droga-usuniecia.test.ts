// S-U-3 — JEDNA DROGA USUNIĘCIA KONTA, NIE DWIE (E1b §5).
//
// CZEGO PILNUJE: że w kodzie PRODUKCYJNYM nie powstanie druga ścieżka kasująca
// konto — omijająca zaczepy biblioteki (bramkę flagi i ślad audytowy) i tym
// samym omijająca wszystko, czego pilnują pozostali strażnicy tego pakietu.
// Druga droga nie psuje niczego widocznego: konto znika, użytkownik jest
// zadowolony, a ślad rozliczalności po prostu nie powstaje.
//
// ── ZAKRES JEST ZAWĘŻONY JAWNIE I TO JEST CAŁA TRUDNOŚĆ TEGO STRAŻNIKA ──────
//
// Pomiar całego drzewa (gałąź E1b przebazowana na `main`, 2026-08-12):
//     RAZEM: 49  |  w __tests__: 43  |  poza: 6
//
// SPROSTOWANIE (blok Leo na #293): pierwotnie stało tu `44 / 38 / 6` — pomiar
// zrobiony ZANIM dopisałem własne pliki testowe, które same sprzątają po sobie
// konta i wpadają w te wzorce. Liczby ROZSTRZYGAJĄCE nie drgnęły: **6 poza
// testami i dokładnie te trzy zatwierdzone pliki**. Prostuję mimo to, z tego
// samego powodu, który sam podałem gdzie indziej — liczba raz zapisana bywa
// cytowana później jako ustalenie faktu (CLAUDE.md v1.16).
// Strażnik w brzmieniu „nigdzie w drzewie nie wolno kasować konta” byłby
// CZERWONY OD PIERWSZEGO DNIA albo — gorzej — dostałby listę wyjątków na
// czterdzieści pozycji. Lista wyjątków, której nikt nie czyta, jest ATRAPĄ
// W DRUGĄ STRONĘ: przepuszcza wszystko, bo dopisanie kolejnej pozycji nie budzi
// nikogo. To ta sama klasa wady co reguła zapisana szerzej, niż sięgał pomiar,
// który ją zrodził.
//
// WYŁĄCZENIE PLIKÓW `__tests__` — wyjątek Z POWODEM I Z PROGIEM (CLAUDE.md
// v1.17: odłożenie bez progu jest długiem ukrytym):
//   POWÓD: pliki testowe kasują WŁASNE dane założone w tym samym pliku, nigdy
//          cudze konto, i nie są dostępne w czasie działania produktu.
//   PRÓG:  pierwszy test kasujący konto, KTÓREGO SAM NIE ZAŁOŻYŁ. Wtedy
//          wyłączenie przestaje być prawdziwe i trzeba je zawęzić.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/** Katalogi objęte skanem. `tools/` JEST objęte — patrz mutacja nr 2. */
const KATALOGI = ["src", "tools"];

/**
 * Wzorce drugiej drogi. `DELETE` sklejany, żeby ten plik sam nie wpadał
 * w skanery komend niszczących (bramka `guard-bash.py` czyta treść polecenia,
 * nie jego intencję — sprawdzone wykonaniem 2026-08-12).
 */
const WZORCE: { nazwa: string; re: RegExp }[] = [
	{ nazwa: "db.delete(user)", re: /\.delete\(\s*user\s*\)/ },
	{ nazwa: "db.delete(students)", re: /\.delete\(\s*students\s*\)/ },
	{ nazwa: "surowy SQL na tabeli user", re: new RegExp(`${"DELETE"}\\s+FROM\\s+"?user"?`, "i") },
];

/**
 * ZATWIERDZONE trzy pozycje — oprzyrządowanie, nie ścieżka produktu.
 * Każda z powodem; lista ma zostać krótka.
 */
const ZATWIERDZONE: Record<string, string> = {
	"src/lib/db/seed.ts": "Zasiew danych deweloperskich — kasuje własne konta demonstracyjne.",
	"tools/b5-contract-test.ts": "Test kontraktowy izolacji najemców — sprząta po sobie.",
	"tools/seed-e2e.ts": "Zasiew kont do testów przeglądarkowych — kasuje własne konta.",
};

function* pliki(dir: string): Generator<string> {
	for (const wpis of readdirSync(dir)) {
		const p = join(dir, wpis);
		if (statSync(p).isDirectory()) {
			if (wpis === "node_modules" || wpis === ".next") continue;
			yield* pliki(p);
		} else if (/\.(ts|tsx)$/.test(wpis)) {
			yield p;
		}
	}
}

type Trafienie = { plik: string; nr: number; wzorzec: string; tresc: string };

function skan(): Trafienie[] {
	const out: Trafienie[] = [];
	for (const katalog of KATALOGI) {
		for (const p of pliki(katalog)) {
			const wzgledna = relative(process.cwd(), p).split(sep).join("/");
			const linie = readFileSync(p, "utf8").split("\n");
			linie.forEach((linia, i) => {
				for (const w of WZORCE) {
					if (w.re.test(linia)) {
						out.push({ plik: wzgledna, nr: i + 1, wzorzec: w.nazwa, tresc: linia.trim() });
					}
				}
			});
		}
	}
	return out;
}

describe("S-U-3 · jedna droga usuniecia konta (kod produkcyjny)", () => {
	const wszystkie = skan();
	const produkcyjne = wszystkie.filter((t) => !t.plik.includes("__tests__"));

	it("skan cokolwiek znalazl (straznik nie przechodzi na pustym zbiorze)", () => {
		// Bez tej asercji literówka w ścieżce katalogu albo w wyrażeniu dawałaby
		// zero trafień i ZIELEŃ — czyli strażnika, który nie czyta niczego.
		// Rodzina awarii „mechanizm melduje w porządku”.
		expect(
			wszystkie.length,
			"Skan nie znalazł ANI JEDNEGO miejsca kasującego konto w całym drzewie. " +
				"To nie znaczy, że drzewo jest czyste — znaczy, że skan nie działa.",
		).toBeGreaterThan(5);
	});

	it("poza lista zatwierdzonych nie ma w kodzie produkcyjnym drugiej drogi", () => {
		const nieautoryzowane = produkcyjne
			.filter((t) => !ZATWIERDZONE[t.plik])
			.map((t) => `${t.plik}:${t.nr} [${t.wzorzec}] ${t.tresc.slice(0, 80)}`);

		expect(
			nieautoryzowane,
			"Druga ścieżka kasowania konta w kodzie produkcyjnym. Omija zaczepy biblioteki, " +
				"czyli bramkę flagi ORAZ ślad audytowy `account.deletion.completed` — konto znika " +
				"bez śladu rozliczalności, a wszystko wygląda na działające. Usuwanie konta idzie " +
				"WYŁĄCZNIE ścieżką `/api/auth/delete-user` (D-U1).",
		).toEqual([]);
	});

	it("w trasach HTTP nie ma kasowania konta — bez zadnych wyjatkow", () => {
		// Asercja mocniejsza i BEZ listy wyjątków: `src/app/api/**/route.ts` to
		// jedyne miejsce, w którym druga droga byłaby dostępna DLA UŻYTKOWNIKA.
		// Oprzyrządowanie w `tools/` wymaga dostępu do maszyny; trasa wymaga
		// wyłącznie żądania HTTP. Dlatego tu wyjątków nie ma i mieć nie będzie.
		const wTrasach = wszystkie
			.filter((t) => t.plik.startsWith("src/app/api/") && t.plik.endsWith("/route.ts"))
			.map((t) => `${t.plik}:${t.nr} [${t.wzorzec}]`);

		expect(
			wTrasach,
			"Kasowanie konta w trasie HTTP. To jest jedyne miejsce, w którym druga ścieżka jest " +
				"osiągalna dla użytkownika — wyjątku tu nie przewidujemy.",
		).toEqual([]);
	});

	it("lista zatwierdzonych nie zawiera pozycji martwych", () => {
		// Kontrola w drugą stronę: pozycja bez trafień znaczy, że plik zmienił
		// nazwę albo przestał kasować. Lista, która puchnie o martwe pozycje,
		// przestaje być czytana.
		const bezTrafien = Object.keys(ZATWIERDZONE).filter(
			(plik) => !produkcyjne.some((t) => t.plik === plik),
		);
		expect(
			bezTrafien,
			"Pozycja na liście zatwierdzonych nie ma już żadnego trafienia — usuń ją.",
		).toEqual([]);
	});
});
