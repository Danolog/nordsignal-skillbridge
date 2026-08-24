// @vitest-environment node
//
// PANEL WYKŁADOWCY ZA FLAGĄ — CZŁON STRONA (powierzchnia HTML).
//
// TRZECI PUNKT EGZEKUCJI, TRZECIA MUTACJA
// ---------------------------------------
// `src/lib/__tests__/panel-wykladowcy-za-flaga.test.ts` zostawił regułę wprost:
// „Kto doda tu trzeci punkt egzekucji, jest winien trzecią mutację". Ten plik
// jest spłatą tego długu. Reguła „panel za flagą" ma od 2026-08-24 trzy człony:
//
//   `checkFacultyAuth`            ODCZYT   — dostęp do panelu i tras API
//   `POST /api/faculty/login`     ZAPIS    — tworzenie sesji
//   `src/app/faculty/layout.tsx`  STRONA   — powierzchnia HTML (ten plik)
//
// CZEGO PILNUJE TEN PLIK, A CZEGO NIE
// -----------------------------------
// Człon STRONA nie jest bramką bezpieczeństwa i nie wolno go tak cytować —
// do API da się wejść bez strony, więc bezpieczeństwa pilnują tamte dwa człony.
// Ten człon pilnuje CZEGO INNEGO i to coś było realną wadą: przy zgaszonej
// fladze `/faculty/login` renderował formularz, a `POST` na trasę logowania
// oddawał 404. Znalezisko Leo: „zamknięty, ale wygląda na zepsuty".
//
// CZY CI W OGÓLE BYWA W STANIE, KTÓREGO TEN PLIK PILNUJE — pytanie Leo z #335,
// bo to ono tłumaczy, dlaczego mutacja członu ZAPIS była niewidoczna. Tutaj
// odpowiedź brzmi TAK, i to nie przez przypadek: CI trzyma panel ZAPALONY
// (`FLAG_FACULTY_PANEL: "1"` w `.github/workflows/pr.yml`), więc plik NIE
// DZIEDZICZY stanu ze środowiska, tylko go WYTWARZA — gasi flagę wewnątrz
// przypadku i zapala z powrotem. Dlatego czerwieni się pod środowiskiem CI
// takim, jakie jest, a nie pod środowiskiem dobranym do testu.
//
// CO ASERTUJEMY — SKUTEK, NIE KSZTAŁT
// -----------------------------------
// Asercja stoi na WYWOŁANIU `notFound()`, bo to ono jest obserwowalnym skutkiem
// (Next.js zamienia je na odpowiedź 404). Nie asertujemy tekstu ani układu —
// te wolno zmieniać. Kontrola dodatnia (flaga zapalona → `notFound()` NIE pada
// i dzieci się renderują) jest tu połową wartości: bez niej „nie renderuje
// formularza" byłoby prawdą także wtedy, gdyby layout był po prostu zepsuty
// i nie renderował NIGDY. To rozróżnienie „wyłączone kontra zepsute" jest
// dokładnie tym, czego zabrakło na produkcji.

import { describe, expect, it, vi } from "vitest";

const POPRZEDNIA = process.env.FLAG_FACULTY_PANEL;

function ustawFlage(v: string | undefined): void {
	if (v === undefined) delete process.env.FLAG_FACULTY_PANEL;
	else process.env.FLAG_FACULTY_PANEL = v;
}

/**
 * Ładuje layout z atrapą `next/navigation`, żeby dało się zaobserwować, czy
 * `notFound()` zostało wywołane. Atrapa RZUCA — tak jak prawdziwe `notFound()`
 * — bo inaczej kod po wywołaniu leciałby dalej i test mierzyłby inny świat niż
 * produkcja.
 */
async function zaladujLayout() {
	vi.resetModules();
	const notFound = vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	});
	vi.doMock("next/navigation", () => ({ notFound }));
	const mod = await import("@/app/faculty/layout");
	return { Layout: mod.default, notFound, konfiguracja: mod };
}

describe("panel wykładowcy — CZŁON STRONA, flaga ZGASZONA", () => {
	it("layout /faculty/* woła notFound() — powierzchnia HTML znika, nie pokazuje formularza", async () => {
		ustawFlage("0");
		const { Layout, notFound } = await zaladujLayout();

		expect(() => Layout({ children: "cokolwiek" })).toThrow("NEXT_NOT_FOUND");
		expect(notFound).toHaveBeenCalledTimes(1);

		ustawFlage(POPRZEDNIA);
	});

	it("obejmuje CAŁY segment, więc /faculty/login też — to była zepsuta trasa", async () => {
		// Layout w App Routerze opakowuje wszystkie strony segmentu. Asercja
		// pilnuje własności STRUKTURALNEJ: dopóki plik jest layoutem segmentu
		// `faculty`, nowa strona dołożona pod `/faculty/` jest zamknięta bez
		// niczyjej pamięci. Gdyby ktoś przeniósł sprawdzenie do pojedynczej
		// strony, ta własność znika po cichu — i wtedy ten test nie ma sensu.
		const { readFileSync } = await import("node:fs");
		const sciezka = new URL("../layout.tsx", import.meta.url);
		const zrodlo = readFileSync(sciezka, "utf8");
		expect(zrodlo).toMatch(/isFeatureEnabled\(\s*["']facultyPanel["']\s*\)/);
		expect(zrodlo).toMatch(/notFound\(\)/);
	});

	it("render jest DYNAMICZNY — flaga przestawia się bez wdrożenia", async () => {
		// Bez `force-dynamic` strony segmentu byłyby wygenerowane raz przy
		// budowaniu i zamroziłyby stan flagi z tamtej chwili — czyli serwowałyby
		// formularz po tym, jak ktoś flagę zgasił. Ten sam powód, co przy
		// `/prywatnosc` i `/regulamin`.
		ustawFlage("1");
		const { konfiguracja } = await zaladujLayout();
		expect(konfiguracja.dynamic).toBe("force-dynamic");
		ustawFlage(POPRZEDNIA);
	});
});

describe("panel wykładowcy — ILE CZŁONÓW, TYLE MUTACJI (strażnik długu)", () => {
	it("punktów egzekucji flagi jest DOKŁADNIE trzy — czwarty ma zaczerwienić ten test", async () => {
		// PO CO TEN TEST — spłata długu nazwanego wprost w
		// `src/lib/__tests__/panel-wykladowcy-za-flaga.test.ts`:
		// „Kto doda tu trzeci punkt egzekucji, jest winien trzecią mutację".
		// Problem z tamtą regułą jest taki, że była PROZĄ — nikt jej nie
		// egzekwował, więc trzeci punkt (ten plik) dołożono dopiero po tym, jak
		// brak czwartego... to znaczy brak TRZECIEGO kosztował produkcję.
		//
		// Ten test zamienia zdanie w nagłówku na własność sprawdzaną maszynowo:
		// gdy ktoś doda CZWARTY punkt egzekucji `facultyPanel`, test czerwieni się
		// i mówi mu, że jest winien czwartą mutację. Bez tego reguła „ile członów,
		// tyle mutacji" żyje wyłącznie w cudzej pamięci — a to jest dokładnie ten
		// nośnik, który zawiódł 2026-08-18.
		//
		// ŚWIADOMY DRUGI NOŚNIK, z jawnym progiem (CLAUDE.md §8 v1.17): nagłówek
		// pliku `panel-wykladowcy-za-flaga.test.ts` nadal mówi „DWA WYWOŁANIA".
		// Nie poprawiam go w tym zgłoszeniu CELOWO: gałąź `test/panel-czlon-zapis`
		// (Quinn) przepisuje dokładnie te linie, a rozwiązanie konfliktu „biorę
		// swoją stronę" skasowałoby jego zmierzone cytaty. PRÓG: przy scaleniu
		// `test/panel-czlon-zapis` nagłówek dostaje trzeci człon. Dopóki to nie
		// nastąpi, TEN test jest jedynym miejscem, które zna prawdziwą liczbę.
		const { readdirSync, readFileSync, statSync } = await import("node:fs");
		const { join } = await import("node:path");

		const korzen = new URL("../../../", import.meta.url).pathname; // src/
		const trafienia: string[] = [];

		function przejdz(katalog: string): void {
			for (const wpis of readdirSync(katalog)) {
				const sciezka = join(katalog, wpis);
				if (statSync(sciezka).isDirectory()) {
					if (wpis === "__tests__" || wpis === "node_modules") continue;
					przejdz(sciezka);
					continue;
				}
				if (!/\.(ts|tsx)$/.test(wpis)) continue;
				const tresc = readFileSync(sciezka, "utf8");
				// Liczymy WYWOŁANIA predykatu, nie wzmianki w komentarzach:
				// `isFeatureEnabled("facultyPanel")`. Definicja flagi w rejestrze
				// (`flags.ts`) nie jest punktem egzekucji, tylko nośnikiem reguły.
				for (const _ of tresc.matchAll(/isFeatureEnabled\(\s*["']facultyPanel["']\s*\)/g)) {
					trafienia.push(sciezka.slice(korzen.length));
				}
			}
		}
		przejdz(korzen);

		expect(
			trafienia.sort(),
			"Zmieniła się liczba punktów egzekucji flagi facultyPanel. ILE CZŁONÓW MA " +
				"REGUŁA, TYLE MUTACJI — dołóż mutację czerwieniącą nowy człon i dopisz " +
				"go tutaj oraz w nagłówku src/lib/__tests__/panel-wykladowcy-za-flaga.test.ts.",
		).toEqual([
			"app/api/faculty/login/route.ts", // ZAPIS  — tworzenie sesji
			"app/faculty/layout.tsx", // STRONA — powierzchnia HTML
			"lib/faculty-auth.ts", // ODCZYT — dostęp
		]);
	});
});

describe("panel wykładowcy — CZŁON STRONA, kontrola dodatnia (flaga ZAPALONA)", () => {
	it("layout PRZEPUSZCZA i oddaje dzieci — dowód, że to wyłączenie, nie awaria", async () => {
		ustawFlage("1");
		const { Layout, notFound } = await zaladujLayout();

		const wynik = Layout({ children: "zawartosc-panelu" });
		expect(notFound).not.toHaveBeenCalled();
		expect(wynik.props.children).toBe("zawartosc-panelu");

		ustawFlage(POPRZEDNIA);
	});
});
