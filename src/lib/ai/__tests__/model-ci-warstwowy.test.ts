// @vitest-environment node
//
// CI NIE PODMIENIA MODELU WARSTWY `premium` — strażnik.
//
// PO CO TO ISTNIEJE
// -----------------
// Do 2026-08-14 job `e2e-llm` ustawiał `SKILLBRIDGE_AI_MODEL: claude-haiku-…`.
// Ta zmienna ma w `../model.ts` PRIORYTET 1 i nadpisuje wszystkie warstwy naraz
// — więc również `premium`, czyli podsumowanie kariery i sędziego
// (`career-helper.ts`: `getModel("premium")` dwa razy).
//
// Skutek był podwójny i oba człony są poważne:
//   (1) jedyny tor sprawdzający ścieżkę kredencjału wysokiej stawki (§7
//       `CLAUDE.md`: to, co student pokazuje pracodawcy) NIGDY nie wykonywał
//       jej na modelu produkcyjnym — prod Opus 4.8, CI cicho Haiku;
//   (2) tor przez to MIGOTAŁ — komunikat asercji w
//       `tests/e2e-pw/helpers/b0-summary.ts` wprost wskazywał ten override jako
//       najczęstszą przyczynę padu (Haiku nie trafiał w schemat).
//
// Czyli bramka jednocześnie nie mierzyła tego, co obiecywała, i hałasowała.
//
// DLACZEGO TEST, A NIE KOMENTARZ W `pr.yml`
// -----------------------------------------
// Bo komentarz nie ma jak się zaczerwienić. Wada wróci najprościej przez
// „uproszczenie": ktoś zobaczy dwie zmienne robiące to samo i skróci je do
// jednej globalnej — dokładnie odtwarzając stan sprzed naprawy, w dobrej wierze
// i bez żadnego sygnału. Ten plik jest tym sygnałem.
//
// GRANICA: mierzy PLIK PRZEPŁYWU, nie przebieg. Że rozstrzyganie warstw działa,
// pilnuje `model.test.ts` (sąsiedni plik). Dopiero oba razem dają własność
// „premium jedzie w CI na swoim modelu".

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const KORZEN = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const PLIK_PRZEPLYWU = resolve(KORZEN, ".github/workflows/pr.yml");

const PRZEPLYW = readFileSync(PLIK_PRZEPLYWU, "utf8");

/**
 * Nazwa zmiennej globalnej, SKŁADANA W TRAKCIE PRZEBIEGU — żeby ten plik nie
 * łapał samego siebie, gdyby kiedyś czytał także własne źródło, i żeby cytaty
 * w nagłówku nie zmieniały wyniku. Ta sama ostrożność co w
 * `src/test/__tests__/bramki-powielone-spis.test.ts`.
 */
const ZMIENNA_GLOBALNA = ["SKILLBRIDGE", "AI", "MODEL"].join("_");

/** Linie ustawień (klucz: wartość), bez komentarzy — komentarz wolno cytować. */
function liniePrzypisan(napis: string): string[] {
	return PRZEPLYW.split("\n")
		.map((tresc, i) => ({ tresc, nr: i + 1 }))
		.filter(({ tresc }) => {
			const t = tresc.trim();
			if (t.startsWith("#")) return false;
			// Przypisanie w YAML-u: `KLUCZ: wartosc` — nie wzmianka w prozie.
			return new RegExp(`^${napis}\\s*:`).test(t);
		})
		.map(({ tresc, nr }) => `.github/workflows/pr.yml:${nr}\n      ${tresc.trim()}`);
}

describe("model w CI — kontrola dodatnia", () => {
	// Bez tego obie asercje niżej są prawdziwe dla pustego pliku: zła ścieżka do
	// `pr.yml` dałaby zero trafień i zieleń oznaczającą „nie patrzyłem".
	it("plik przepływu jest wczytany i niepusty", () => {
		expect(PRZEPLYW.length).toBeGreaterThan(1000);
	});

	it("przepływ faktycznie nadpisuje warstwy tańszym modelem", () => {
		// Kontrola dodatnia właściwa: gdyby ktoś usunął nadpisania per warstwa,
		// asercja „nie ma globalnej" byłaby spełniona, a CI po cichu przeszłoby
		// na modele produkcyjne we WSZYSTKICH warstwach — czyli rachunek rośnie
		// bez decyzji. Tu pilnujemy, że oszczędność nadal istnieje.
		expect(liniePrzypisan(`${ZMIENNA_GLOBALNA}_STANDARD`).length).toBeGreaterThan(0);
		expect(liniePrzypisan(`${ZMIENNA_GLOBALNA}_FAST`).length).toBeGreaterThan(0);
	});
});

describe("model w CI — warstwa `premium` nietknięta", () => {
	it("przepływ NIE ustawia globalnego override'u modelu", () => {
		expect(
			liniePrzypisan(ZMIENNA_GLOBALNA),
			[
				"",
				"WRÓCIŁ GLOBALNY OVERRIDE MODELU.",
				"",
				`\`${ZMIENNA_GLOBALNA}\` ma priorytet 1 w src/lib/ai/model.ts i nadpisuje`,
				"WSZYSTKIE warstwy naraz — także `premium`, czyli podsumowanie kariery",
				"i sędziego. To jest ścieżka kredencjału wysokiej stawki (§7 CLAUDE.md:",
				"to, co student pokazuje pracodawcy). Nadpisana w CI = jedyny tor, który",
				"ją sprawdza, mierzy tańszą atrapę zamiast produktu.",
				"",
				"Chcesz taniej w CI? Nadpisuj WARSTWAMI:",
				`      ${ZMIENNA_GLOBALNA}_STANDARD  — workhorse, większość wywołań`,
				`      ${ZMIENNA_GLOBALNA}_FAST      — dopasowanie`,
				"a `premium` zostaw bez nadpisania.",
				"",
				"Miejsca:",
			].join("\n"),
		).toEqual([]);
	});

	it("przepływ NIE nadpisuje warstwy `premium`", () => {
		expect(
			liniePrzypisan(`${ZMIENNA_GLOBALNA}_PREMIUM`),
			[
				"",
				"CI PODMIENIA MODEL WARSTWY `premium`.",
				"",
				"Nadpisanie per warstwa jest legalnym narzędziem strojenia kosztu, ale",
				"nie dla `premium`: to jedyna warstwa, której wynik wychodzi na zewnątrz",
				"jako dowód kompetencji. Tor ma ją wykonywać na modelu produkcyjnym.",
				"",
				"Jeśli to świadoma decyzja kosztowa — należy do Darka (§7 + koszt),",
				"nie do pliku przepływu. Zdejmij nadpisanie albo zmień tę regułę jawnie.",
				"",
				"Miejsca:",
			].join("\n"),
		).toEqual([]);
	});
});
