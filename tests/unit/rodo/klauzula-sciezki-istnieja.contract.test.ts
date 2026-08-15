import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * STRAŻNIK: dokument zgodności nie powołuje się na ścieżkę spoza kontroli wersji.
 *
 * ── Dlaczego ten strażnik istnieje ─────────────────────────────────────────
 * Tabela Z-2 klauzuli art. 13 deklarowała przy warunku W-5 „przegląd RODO
 * WYKONANY" i cytowała jako dowód `scratchpad/przeglad-zasada-pracodawcy-ryan.md`.
 * Tego pliku nigdy nie było w kontroli wersji — `scratchpad/` jest katalogiem
 * ignorowanym. Ta sama nieistniejąca ścieżka była cytowana DRUGI raz, w rejestrze
 * kompletności art. 17, jako adres „pełnej oceny prawnej".
 *
 * Skutek jest dokładnie tej klasy, przed którą broni cały pakiet RODO: warunek
 * wygląda na spełniony, bo dokument sam tak mówi i podaje adres dowodu. Adres
 * prowadzi donikąd, a sprawdzić to może wyłącznie osoba, która ma ten sam dysk
 * co autor. Recenzent, kupujący firmę i organ nadzorczy nie mają.
 *
 * ── Co jest regułą, a co tylko powtórzeniem ────────────────────────────────
 * Regułą o konsekwencji zewnętrznej jest: DOWÓD W DOKUMENCIE ZGODNOŚCI MUSI BYĆ
 * ODTWARZALNY. Jej nośnikiem jest ten test, a nie zdanie w dokumencie — dokument
 * zdanie o tym niesie (sekcja Z-2a, „wniosek metodyczny"), ale zdanie nikogo nie
 * zatrzymuje. Zatrzymuje bramka.
 *
 * ── Mutacja czerwieniąca (CLAUDE.md v1.17 pkt 2) ───────────────────────────
 * Wykonana 2026-08-14, cofnięta po odczycie.
 *
 *   Zmiana: do `docs/legal/klauzula-informacyjna-art13.md`, wiersz W-5 tabeli Z-2,
 *   dopisano w prozie (poza cytatem i poza blokiem kodu):
 *       „…przegląd RODO wykonany (`scratchpad/przeglad-zasada-pracodawcy-ryan.md`)"
 *
 *   Padł test: „każda cytowana ścieżka jest w kontroli wersji albo na jawnej liście"
 *   AssertionError: expected [ 'docs/legal/klauzula-informacyjna-art13.md:71 →
 *   scratchpad/przeglad-zasada-pracodawcy-ryan.md' ] to deeply equal []
 *
 * Kontrola dwustronna: po cofnięciu mutacji ten sam test przechodzi na zielono,
 * a test „lista pozycji niepowstałych nie zgniła" pada po dodaniu do listy
 * ścieżki, która JUŻ jest w kontroli wersji (druga mutacja, niżej).
 *
 *   Zmiana 2: do `SCIEZKI_JESZCZE_NIEISTNIEJACE` dopisano `docs/data/ropa.md`
 *   (plik istniejący). Padł test: „lista pozycji niepowstałych nie zgniła”.
 *   AssertionError: expected [ 'docs/data/ropa.md' ] to deeply equal []
 *
 * ── Zakres — świadomie wąski, żeby strażnik nie stał się szumem ────────────
 * (1) Pilnujemy WYŁĄCZNIE dwóch dokumentów zgodności wymienionych w `NOSNIKI`.
 *     Nie skanujemy całego repozytorium — notatka inżynierska wolno może cytować
 *     ścieżkę roboczą, dokument prawny nie.
 * (2) Pilnujemy WYŁĄCZNIE ścieżek zapisanych w grawisach i zawierających ukośnik
 *     oraz rozpoznawalne rozszerzenie. Sama nazwa pliku (`ropa.md`) jest
 *     dwuznaczna — nie wiadomo, którego katalogu dotyczy — i celowo jej nie
 *     ruszamy; wymuszanie pełnej ścieżki wszędzie dałoby więcej hałasu niż obrony.
 * (3) NIE pilnujemy linii w cytatach (`>`) ani w blokach kodu (```). Sprostowanie
 *     jawne MUSI cytować stare, nieprawdziwe brzmienie dosłownie — cytat martwej
 *     ścieżki jest tam dowodem wady, a nie jej popełnieniem. Gdyby strażnik
 *     czerwienił się na cytatach, zakazywałby sprostowań.
 */

const REPO = resolve(__dirname, "../../..");

/** Dokumenty zgodności objęte regułą. Jedyne miejsce, w którym ta lista pada. */
const NOSNIKI = [
	"docs/legal/klauzula-informacyjna-art13.md",
	"docs/data/art17-kompletnosc-usuniecia.md",
] as const;

/**
 * Ścieżki, które jeszcze nie powstały — dopuszczone JAWNIE, z powodem i właścicielem.
 * To jest jedyne legalne wyjście poza regułę. Pusta lista jest stanem docelowym.
 */
const SCIEZKI_JESZCZE_NIEISTNIEJACE: Readonly<Record<string, string>> = {
	// PUSTO — stan docelowy osiągnięty 2026-08-14.
	//
	// Obie pozycje („docs/product/zasada-odpowiedzi-dla-pracodawcy.md" i
	// „docs/product/regulamin-pilotazu.md") zdjęte w tym samym zgłoszeniu, które
	// wprowadza oba pliki do kontroli wersji — dokładnie tak, jak nakazywał ich
	// własny wpis („zdejmujemy z listy w zgłoszeniu, które wprowadza go na `main`").
	// Zdjęcie jest w TYM SAMYM commicie co wejście plików: gdyby szło osobno,
	// pomiędzy jednym a drugim `main` miałby suitę czerwoną.
	//
	// Że lista nie zgniła, nie wynika z tego komentarza — pilnuje tego test
	// „lista pozycji niepowstałych nie zgniła" niżej, który padał na obu pozycjach
	// (cytat: „expected [ 'docs/product/zasada-odpowiedzi-dla-pracodawcy.md',
	// 'docs/product/regulamin-pilotazu.md' ] to deeply equal []", odczyt 2026-08-14)
	// dopóki tu stały.
};

/**
 * Ścieżki w INNYM repozytorium firmy (system operacyjny nordsignal). Tu ich nie
 * ma i nie będzie — nie są długiem, są odesłaniem międzyrepozytoryjnym.
 */
const SCIEZKI_POZA_TYM_REPO: Readonly<Record<string, string>> = {
	"docs/audyty/2026-08-14-konta-produkcyjne-pomiar-ryan.md":
		"repozytorium systemu operacyjnego nordsignal — tam mieszkają audyty CRCO",
};

/** Ścieżka: w grawisach, z ukośnikiem, z rozpoznawalnym rozszerzeniem. */
const SCIEZKA_W_GRAWISACH =
	/`([A-Za-z0-9_.\-/]+\/[A-Za-z0-9_.-]+\.(?:md|ts|tsx|js|mjs|cjs|py|json|ya?ml|sql|toml))(?::\d+)?`/g;

type Trafienie = { nosnik: string; wiersz: number; sciezka: string };

/** Zbiera ścieżki z prozy dokumentu. Pomija cytaty i bloki kodu — patrz zakres (3). */
function sciezkiZProzy(nosnik: string): Trafienie[] {
	const linie = readFileSync(join(REPO, nosnik), "utf8").split("\n");
	const out: Trafienie[] = [];
	let wBlokuKodu = false;
	linie.forEach((linia, i) => {
		if (/^\s*```/.test(linia)) {
			wBlokuKodu = !wBlokuKodu;
			return;
		}
		if (wBlokuKodu) return;
		if (/^\s*>/.test(linia)) return; // cytat starego brzmienia
		for (const m of linia.matchAll(SCIEZKA_W_GRAWISACH)) {
			out.push({ nosnik, wiersz: i + 1, sciezka: m[1] });
		}
	});
	return out;
}

/** Pliki w kontroli wersji — źródło autorytatywne, nie zawartość dysku. */
function wKontroliWersji(): Set<string> {
	const wyjscie = execFileSync("git", ["ls-files"], { cwd: REPO, encoding: "utf8" });
	return new Set(wyjscie.split("\n").filter(Boolean));
}

describe("dokumenty zgodności — każda cytowana ścieżka jest odtwarzalna", () => {
	it("ekstraktor w ogóle coś znajduje (kontrola dodatnia)", () => {
		const wszystkie = NOSNIKI.flatMap(sciezkiZProzy);
		expect(wszystkie.length).toBeGreaterThan(5);
		// I znajduje konkretnie tę, o której wiadomo, że jest cytowana i istnieje.
		expect(wszystkie.map((t) => t.sciezka)).toContain("docs/data/ropa.md");
	});

	it("ekstraktor NIE łapie cytatu starego brzmienia (kontrola ujemna)", () => {
		// Martwa ścieżka żyje w sekcji Z-2a wyłącznie w cytacie i w bloku kodu.
		const wszystkie = NOSNIKI.flatMap(sciezkiZProzy).map((t) => t.sciezka);
		expect(wszystkie).not.toContain("scratchpad/przeglad-zasada-pracodawcy-ryan.md");
	});

	it("każda cytowana ścieżka jest w kontroli wersji albo na jawnej liście", () => {
		const znane = wKontroliWersji();
		const winne = NOSNIKI.flatMap(sciezkiZProzy)
			.filter(
				(t) =>
					!znane.has(t.sciezka) &&
					!(t.sciezka in SCIEZKI_JESZCZE_NIEISTNIEJACE) &&
					!(t.sciezka in SCIEZKI_POZA_TYM_REPO),
			)
			.map((t) => `${t.nosnik}:${t.wiersz} → ${t.sciezka}`);

		expect(
			winne,
			"Dokument zgodności powołuje się na ścieżkę, której NIE MA w kontroli wersji. " +
				"Taki dowód jest nieodtwarzalny: żyje na jednym dysku i nie da się go pokazać " +
				"ani recenzentowi, ani kupującemu firmę, ani organowi nadzorczemu. " +
				"Albo wprowadź plik do kontroli wersji, albo dopisz go do " +
				"SCIEZKI_JESZCZE_NIEISTNIEJACE z powodem i właścicielem — cicho nie wolno.",
		).toEqual([]);
	});

	it("lista pozycji niepowstałych nie zgniła", () => {
		const znane = wKontroliWersji();
		const juzIstnieja = Object.keys(SCIEZKI_JESZCZE_NIEISTNIEJACE).filter((s) => znane.has(s));
		expect(
			juzIstnieja,
			"Ścieżka z listy „jeszcze nie istnieje” JEST już w kontroli wersji. " +
				"Zdejmij ją z listy — inaczej lista przestaje mówić prawdę i zaczyna " +
				"przepuszczać kolejne pozycje bez pytania.",
		).toEqual([]);
	});

	it("każda pozycja obu list ma zapisany powód (nie sam wpis)", () => {
		const bezPowodu = [
			...Object.entries(SCIEZKI_JESZCZE_NIEISTNIEJACE),
			...Object.entries(SCIEZKI_POZA_TYM_REPO),
		]
			.filter(([, powod]) => powod.trim().length < 20)
			.map(([s]) => s);
		expect(bezPowodu, "Wyjątek bez powodu jest cichym wyjątkiem.").toEqual([]);
	});
});
