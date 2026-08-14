// @vitest-environment node
//
// KROJE PISMA NIE SIĘGAJĄ DO SIECI W TRAKCIE BUDOWANIA — strażnik.
//
// PO CO TO ISTNIEJE
// -----------------
// 2026-08-14, zgłoszenie #297: wymagana bramka `a11y-exam` zaczerwieniła się,
// choć kod był poprawny. Padł krok `pnpm build` WEWNĄTRZ tego zadania, a
// osobne zadanie `build` na TYM SAMYM commicie, w TYM SAMYM przebiegu,
// przeszło — bo zdążyło pobrać krój minutę wcześniej. Z dziennika:
//
//     Received response with status 404 when requesting
//       https://fonts.gstatic.com/s/dmsans/v17/...woff2
//     Error: Module not found: Can't resolve
//       '@vercel/turbopack-next/internal/font/google/font'
//
// Przyczyna: `next/font/google` pobiera pliki kroju z serwera Google W TRAKCIE
// KOMPILACJI. Pięć zadań w przepływie buduje projekt osobno, więc jedna awaria
// cudzego serwera trafiała nas pięć razy na przebieg. WYMAGANA BRAMKA ZALEŻAŁA
// OD DOSTĘPNOŚCI CUDZEGO SERWERA — i to jest wada, którą ten strażnik zamyka.
//
// CZEGO PILNUJE (własność, nie zieleń suity)
// ------------------------------------------
// Że w drzewie `src/` nie ma ŻADNEJ drogi, którą krój mógłby przyjść z sieci:
//   (1) nikt nie importuje `next/font/google`;
//   (2) żaden arkusz nie wskazuje kroju adresem sieciowym;
//   (3) każdy plik kroju przywołany w CSS ISTNIEJE NA DYSKU w repozytorium.
//
// Punkt (3) jest tu najważniejszy i to on niesie tezę: (1) i (2) mówią „nie ma
// znanego sposobu na sieć", a (3) mówi „to, czego arkusz faktycznie żąda, leży
// w repozytorium". Bez (3) literówka w ścieżce dałaby brak żądania sieciowego
// ORAZ brak kroju — czyli zieleń bez pokrycia.
//
// CZEGO NIE PILNUJE — granica jawna
// ---------------------------------
// Nie mierzy ruchu sieciowego podczas budowania (do tego jest sonda opisana
// w `docs/2026-08-14-kroje-bez-sieci.md`, uruchamiana ręcznie). Ten plik mierzy
// REPOZYTORIUM. To rozdział jak w `bramki-powielone-spis.test.ts`: strażnik
// jednostkowy mierzy źródło, sonda mierzy przebieg.
//
// MUTACJE, KTÓRE GO CZERWIENIĄ (wymóg `CLAUDE.md` §8 v1.17) — patrz opis PR-a.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** Korzeń repo — liczony od położenia tego pliku, nie od katalogu roboczego. */
const KORZEN = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");

/** Katalog z kodem aplikacji. Poza nim krój nie ma prawa być deklarowany. */
const KATALOG_ZRODEL = "src";

/**
 * Szukany import, SKŁADANY W TRAKCIE PRZEBIEGU — nigdy nie występuje dosłownie
 * w źródle tego pliku.
 *
 * Ta sama ostrożność co w `bramki-powielone-spis.test.ts`: sonda, która łapie
 * samą siebie, melduje nieistniejącą wadę i uczy czytelnika ignorować alarm.
 * Nagłówek wyżej cytuje adres `fonts.gstatic.com` w dokumentacji, więc wzorce
 * sieciowe też muszą omijać komentarze — patrz `bezKomentarzy`.
 */
const IMPORT_ZDALNEGO_KROJU = ["next/font", "google"].join("/");

/**
 * Hosty, z których krój przychodziłby po sieci. Lista jest zamknięta i celowo
 * krótka: to nie jest filtr antyspamowy, tylko nazwanie dwóch adresów, przez
 * które Next pobiera kroje Google.
 */
const HOSTY_KROJU = ["fonts.gstatic.com", "fonts.googleapis.com"];

/**
 * Rodziny, które MUSZĄ mieć podzbiór `latin-ext`.
 *
 * Bez niego znikają polskie znaki diakrytyczne (ą, ć, ę, ł, ń, ś, ź, ż leżą
 * w U+0100–U+017F, poza podzbiorem `latin`). Produkt jest polskojęzyczny, więc
 * utrata `latin-ext` jest wadą widoczną dla użytkownika — i jest to najbardziej
 * prawdopodobny sposób, w jaki ktoś „uprości" ten plik w dobrej wierze,
 * zostawiając jeden plik na rodzinę.
 *
 * `Geist Mono` świadomie NIE jest na liście: poprzednia konfiguracja
 * (`Geist_Mono({ subsets: ["latin"] })`) też go nie miała, a ten PR nie zmienia
 * zakresu kroju — przenosi go z sieci na dysk. Dopisanie `latin-ext` dla mono
 * to osobna, świadoma zmiana wyglądu.
 */
const RODZINY_Z_LATIN_EXT = ["DM Sans", "Playfair Display"];

/** Dolna granica kontroli dodatniej — patrz „spacer w ogóle coś znajduje". */
const MINIMUM_PLIKOW = 200;

/**
 * Ten plik jest wyłączony z własnego spaceru.
 *
 * Powód: komunikaty porażek muszą cytować `next/font/google` i `fonts.gstatic.com`
 * DOSŁOWNIE, inaczej nie da się ich zrozumieć — a są to zwykłe napisy w kodzie,
 * nie komentarze, więc filtr komentarzy ich nie pominie. Pierwszy przebieg tego
 * strażnika (2026-08-14) zameldował więc trzy nieistniejące naruszenia we własnym
 * źródle. To ta sama awaria co `grep` łapiący własne `argv` (lekcja Leo, #265) —
 * i to samo lekarstwo: rozdzielić narzędzie od mierzonego.
 *
 * Bezpieczne, bo to plik testowy: nie renderuje niczego i nie może zaciągnąć
 * kroju. Kontrola dodatnia niżej pilnuje, że ścieżka nadal istnieje — wyłączenie
 * literówki byłoby cichym wyłączeniem całego strażnika.
 */
const PLIK_STRAZNIKA = "src/app/__tests__/fonty-bez-sieci.test.ts";

/**
 * Treść pliku z WYCIĘTYMI komentarzami, z zachowaniem numeracji linii.
 *
 * DLACZEGO NIE HEURYSTYKA „linia zaczyna się od gwiazdki": bo w `fonts.css`
 * nagłówek jest jednym blokiem `/* … *\/`, a jego linie zaczynają się od zwykłej
 * prozy. Pierwszy przebieg tego strażnika zameldował przez to cztery nieistniejące
 * naruszenia w `fonts.css` — komentarz tłumaczący, PO CO usunęliśmy zdalne kroje,
 * był czytany jako zdalny krój.
 *
 * DLACZEGO `//` WYCINAMY TYLKO NA POCZĄTKU LINII: bo `https://fonts.gstatic.com`
 * zawiera `//`. Wycinanie `//` w środku linii skasowałoby host z prawdziwego
 * naruszenia i uczyniło strażnika ślepym dokładnie na to, czego pilnuje.
 */
function bezKomentarzy(tresc: string): string[] {
	// Bloki `/* … */` → spacje, znak w znak: numery linii muszą przeżyć.
	const bezBlokow = tresc.replace(/\/\*[\s\S]*?\*\//g, (blok) => blok.replace(/[^\n]/g, " "));
	return bezBlokow.split("\n").map((linia) => {
		const t = linia.trimStart();
		return t.startsWith("//") || t.startsWith("*") ? "" : linia;
	});
}

function zbierzPliki(katalog: string, zebrane: string[] = []): string[] {
	for (const wpis of readdirSync(katalog)) {
		if (wpis === "node_modules" || wpis === ".next" || wpis === "dist") continue;
		const sciezka = join(katalog, wpis);
		if (statSync(sciezka).isDirectory()) {
			zbierzPliki(sciezka, zebrane);
		} else if (/\.(ts|tsx|css)$/.test(sciezka)) {
			zebrane.push(sciezka);
		}
	}
	return zebrane;
}

const PLIKI = zbierzPliki(join(KORZEN, KATALOG_ZRODEL));

/** Pliki mierzone — wszystkie poza samym strażnikiem (patrz `PLIK_STRAZNIKA`). */
const PLIKI_MIERZONE = PLIKI.filter((p) => relative(KORZEN, p) !== PLIK_STRAZNIKA);

/** Linie kodu (nie komentarze) zawierające podany napis, z lokalizacją. */
function znajdzZywe(napis: string): string[] {
	const trafienia: string[] = [];
	for (const plik of PLIKI_MIERZONE) {
		bezKomentarzy(readFileSync(plik, "utf8")).forEach((tresc, i) => {
			if (!tresc.includes(napis)) return;
			trafienia.push(`${relative(KORZEN, plik)}:${i + 1}\n      ${tresc.trim()}`);
		});
	}
	return trafienia;
}

describe("kroje bez sieci — kontrola dodatnia", () => {
	// Bez tego testu wszystkie asercje niżej mają postać „nie ma trafień", czyli
	// są PRAWDZIWE dla zbioru pustego. Zepsuty spacer po katalogach (zła ścieżka
	// korzenia, literówka w rozszerzeniach) dawałby zero plików i komplet
	// zieleni — a milczenie czytałoby się jako „krój jest lokalny".
	it("spacer w ogóle coś znajduje — inaczej każda asercja niżej jest pusta", () => {
		expect(PLIKI.length).toBeGreaterThanOrEqual(MINIMUM_PLIKOW);
	});

	it("spacer widzi arkusze CSS — inaczej reguły o `url(...)` są ślepe", () => {
		const arkusze = PLIKI.filter((p) => p.endsWith(".css"));
		expect(arkusze.length).toBeGreaterThan(0);
	});

	it("spacer widzi arkusz krojów", () => {
		expect(existsSync(join(KORZEN, "src/app/fonts.css"))).toBe(true);
	});

	it("wyłączony jest DOKŁADNIE jeden plik i nadal istnieje", () => {
		// Literówka w `PLIK_STRAZNIKA` wyłączyłaby zero plików (strażnik znów
		// łapałby sam siebie i hałasował), a rozszerzenie tej listy o plik
		// produkcyjny wyłączyłoby strażnika po cichu. Oba przypadki mają boleć tu.
		expect(existsSync(join(KORZEN, PLIK_STRAZNIKA))).toBe(true);
		expect(PLIKI.length - PLIKI_MIERZONE.length).toBe(1);
	});
});

describe("kroje bez sieci — żadnej drogi do sieci", () => {
	it("nikt nie importuje krojów Google przez `next/font`", () => {
		expect(
			znajdzZywe(IMPORT_ZDALNEGO_KROJU),
			[
				"",
				"KRÓJ WRÓCIŁ DO POBIERANIA Z SIECI.",
				"",
				"`next/font/google` pobiera pliki kroju W TRAKCIE KOMPILACJI. To czyni",
				"cudzy serwer treści zależnością WYMAGANEJ bramki: 2026-08-14 serwer",
				"Google zwrócił 404 i `a11y-exam` zaczerwieniła się na poprawnym kodzie.",
				"",
				"Krój dokładamy lokalnie: plik `.woff2` do `src/app/fonts/` + reguła",
				"`@font-face` w `src/app/fonts.css`. Procedura: docs/2026-08-14-kroje-bez-sieci.md",
				"",
				"Miejsca z importem:",
			].join("\n"),
		).toEqual([]);
	});

	it("żaden arkusz nie wskazuje kroju adresem sieciowym", () => {
		const trafienia = HOSTY_KROJU.flatMap((host) => znajdzZywe(host));

		expect(
			trafienia,
			[
				"",
				"ARKUSZ SIĘGA PO KRÓJ DO SIECI.",
				"",
				"Adres zdalny w `@font-face` albo `@import` przenosi zależność z czasu",
				"kompilacji na czas wizyty użytkownika — bramka przestaje czerwienić się",
				"od awarii Google, ale zaczyna od niej cierpieć użytkownik, i to bez",
				"żadnego sygnału po naszej stronie. Krój ma leżeć w repozytorium.",
				"",
				"Miejsca:",
			].join("\n"),
		).toEqual([]);
	});
});

describe("kroje bez sieci — to, czego arkusz żąda, leży na dysku", () => {
	// Najmocniejsza asercja pliku. Dwie poprzednie mówią „nie ma znanej drogi do
	// sieci"; ta mówi „żądanie arkusza da się spełnić z repozytorium". Bez niej
	// literówka w ścieżce daje brak sieci ORAZ brak kroju — zieleń bez pokrycia.
	it("każdy plik kroju przywołany w CSS istnieje w repozytorium", () => {
		const brakujace: string[] = [];
		let sprawdzonych = 0;

		for (const plik of PLIKI_MIERZONE.filter((p) => p.endsWith(".css"))) {
			const tresc = readFileSync(plik, "utf8");
			for (const m of tresc.matchAll(/url\(\s*["']?([^"')]+\.(?:woff2?|ttf|otf))["']?\s*\)/g)) {
				const odwolanie = m[1];
				sprawdzonych += 1;
				const sciezka = odwolanie.startsWith("/")
					? join(KORZEN, "public", odwolanie)
					: resolve(dirname(plik), odwolanie);
				if (!existsSync(sciezka)) {
					brakujace.push(`${relative(KORZEN, plik)} -> ${odwolanie}`);
				}
			}
		}

		// Kontrola dodatnia dla TEGO testu: zero dopasowań znaczy, że wyrażenie
		// przestało łapać `url(...)`, a nie że wszystko jest na miejscu.
		expect(sprawdzonych, "Nie znaleziono ŻADNEGO odwołania do pliku kroju").toBeGreaterThan(0);

		expect(
			brakujace,
			[
				"",
				"ARKUSZ ŻĄDA PLIKU KROJU, KTÓREGO NIE MA W REPOZYTORIUM.",
				"",
				"Budowanie nie sięgnie po niego do sieci (i dobrze), więc skutkiem nie",
				"będzie czerwona bramka, tylko CICHY brak kroju u użytkownika —",
				"przeglądarka podstawi zastępczy i nikt tego nie zauważy w CI.",
				"",
				"Brakuje:",
			].join("\n"),
		).toEqual([]);
	});
});

describe("kroje bez sieci — polskie znaki diakrytyczne", () => {
	it("rodziny tekstowe mają podzbiór `latin-ext`", () => {
		const arkusz = readFileSync(join(KORZEN, "src/app/fonts.css"), "utf8");
		const bezDiakrytyki: string[] = [];

		for (const rodzina of RODZINY_Z_LATIN_EXT) {
			// Reguła `@font-face` tej rodziny, która niesie zakres z U+0100 —
			// czyli blok obsługujący ą/ć/ę/ł/ń/ś/ź/ż.
			const bloki = arkusz
				.split("@font-face")
				.filter((b) => b.includes(`"${rodzina}"`) && b.includes("U+0100"));
			if (bloki.length === 0) bezDiakrytyki.push(rodzina);
		}

		expect(
			bezDiakrytyki,
			[
				"",
				"RODZINA STRACIŁA PODZBIÓR `latin-ext`.",
				"",
				"Polskie znaki diakrytyczne (ą, ć, ę, ł, ń, ś, ź, ż) leżą w U+0100–U+017F,",
				"poza podzbiorem `latin`. Bez tej reguły przeglądarka podstawi pod nie",
				"krój zastępczy — tekst pozostanie czytelny, więc ŻADNA bramka tego nie",
				"złapie, a produkt polskojęzyczny będzie wyglądał na złożony dwoma krojami.",
				"",
				"Rodziny bez `latin-ext`:",
			].join("\n"),
		).toEqual([]);
	});
});
