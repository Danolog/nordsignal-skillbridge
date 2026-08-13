/**
 * STRAŻNIK OKNA KOPII ZAPASOWYCH — jedna liczba, jeden nośnik, mierzalna obietnica.
 *
 * ── CZEGO PILNUJE ────────────────────────────────────────────────────────────
 *
 * Sekcja 9 klauzuli informacyjnej obiecuje studentowi, że kopie z jego danymi
 * wygasają najpóźniej w zadeklarowanym oknie. Do 2026-08-13 tej obietnicy **nie
 * pilnowało nic**: automatyczna historia Neona (6 h) mieści się w oknie z zapasem,
 * ale nasze własne gałęzie `prod-backup-*` są pełnymi kopiami bazy i **nie wygasają
 * w ogóle**. Zdanie było prawdziwe PRZYPADKIEM — bo akurat niedawno były ceremonie.
 *
 * Ten plik pilnuje DWÓCH rzeczy naraz, bo obie potrafią zawieść osobno:
 *   (1) **jeden nośnik liczby** — okno deklaruje wyłącznie klauzula; narzędzie
 *       oceniające i runbook mają ją WOŁAĆ, nie POWTARZAĆ (CLAUDE.md v1.17);
 *   (2) **sędzia faktycznie sądzi** — `ocen()` czerwieni się na kopii po oknie
 *       i milczy na kopii w oknie (kontrola dwustronna).
 *
 * ── DLACZEGO NIE PRZEZ TABELĘ OKRESÓW ────────────────────────────────────────
 *
 * Naturalnym miejscem liczby wyglądał rejestr retencji, objęty strażnikiem
 * `okresy-retencji.contract.test.ts`. Sprawdzone i odrzucone: tamten strażnik
 * wymaga, by KAŻDA pozycja rejestru miała bliźniaczy klucz w **sekcji 7** klauzuli,
 * czyli w tabeli pokazywanej studentowi. Okno kopii nie jest okresem przechowywania
 * klasy danych, a wepchnięcie go tam zmieniłoby tekst widziany przez człowieka —
 * cudzy dokument (Ryan) pod sign-offem Darka. Wchodzimy więc od strony sekcji 9,
 * gdzie ta obietnica już żyje, i nie dokładamy czwartego miejsca z liczbą.
 *
 * ── GRANICE, KTÓRYCH TEN STRAŻNIK NIE PRZEKRACZA ─────────────────────────────
 *
 *   • Nie odpytuje Neona. Mierzy REGUŁĘ i SĘDZIEGO, nie stan produkcji — stan
 *     czyta narzędzie z runbooka §7, przy kluczu, którego CI nie ma i mieć nie ma.
 *   • Nie ocenia, czy okno jest zgodne z prawem — to Wendy (Legal), Faza 3.
 *   • Zakaz powtarzania liczby sprawdzam po samej cyfrze, więc niewinne „art. 30"
 *     w narzędziu albo runbooku też go zaczerwieni. Świadomie: fałszywy alarm przy
 *     przeredagowaniu jest tańszy niż milczenie przy rozjeździe liczby.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	czyKopiaProdukcji,
	type Galaz,
	ocen,
	oknoDniZKlauzuli,
} from "../../../tools/kopie-zapasowe-przeglad";

const KLAUZULA = join(process.cwd(), "docs", "legal", "klauzula-informacyjna-art13.md");
const NARZEDZIE = join(process.cwd(), "tools", "kopie-zapasowe-przeglad.ts");
const RUNBOOK = join(process.cwd(), "docs", "runbooks", "neon-kopia-zapasowa.md");

const trescKlauzuli = readFileSync(KLAUZULA, "utf8");
const OKNO = oknoDniZKlauzuli(trescKlauzuli);

const g = (nazwa: string, dniTemu: number, domyslna = false): Galaz => ({
	id: `br-${nazwa}`,
	name: nazwa,
	created_at: new Date(Date.UTC(2026, 7, 13) - dniTemu * 86_400_000).toISOString(),
	default: domyslna,
});
const TERAZ = new Date(Date.UTC(2026, 7, 13));

describe("okno kopii zapasowych · nośnik reguły", () => {
	it("klauzula niesie okno i daje się je odczytać maszynowo", () => {
		expect(OKNO).toBeGreaterThan(0);
		expect(Number.isInteger(OKNO)).toBe(true);
	});

	it("okno ma DOKŁADNIE JEDEN nośnik — narzędzie i runbook go wołają, nie powtarzają", () => {
		const cyfra = new RegExp(`\\b${OKNO}\\b`);
		const powtorzenia: string[] = [];
		for (const [nazwa, sciezka] of [
			["tools/kopie-zapasowe-przeglad.ts", NARZEDZIE],
			["docs/runbooks/neon-kopia-zapasowa.md", RUNBOOK],
		] as const) {
			if (cyfra.test(readFileSync(sciezka, "utf8"))) powtorzenia.push(nazwa);
		}
		expect(
			powtorzenia,
			`Liczba ${OKNO} występuje poza swoim jedynym nośnikiem (sekcja 9 klauzuli). ` +
				"Drugi nośnik rozjedzie się po cichu przy pierwszej zmianie klauzuli — " +
				"odczytaj okno przez oknoDniZKlauzuli() zamiast je przepisywać.",
		).toEqual([]);
	});

	it("parser jest wąski: brak znacznika, dwa znaczniki i nieznane brzmienie RZUCAJĄ", () => {
		expect(() => oknoDniZKlauzuli("nic tu nie ma")).toThrow(/znacznika/i);
		expect(() =>
			oknoDniZKlauzuli(
				"<!-- kopie:okno_dni --> najpóźniej po 30 dniach\n<!-- kopie:okno_dni --> x",
			),
		).toThrow(/JEDEN/i);
		expect(() => oknoDniZKlauzuli("<!-- kopie:okno_dni --> kopie znikają po miesiącu")).toThrow(
			/nie rozpoznaję/i,
		);
	});
});

describe("okno kopii zapasowych · sędzia (kontrola dwustronna)", () => {
	it("kopia starsza niż okno = NARUSZENIE, z nazwą gałęzi w werdykcie", () => {
		const w = ocen(
			[g("main", 155, true), g("prod-backup-a", OKNO + 1), g("prod-backup-b", 2)],
			OKNO,
			TERAZ,
		);
		expect(w.kod).toBe(1);
		expect(w.przeterminowane).toEqual(["prod-backup-a"]);
	});

	it("wszystkie kopie w oknie = CISZA (strażnik nie krzyczy na poprawnym stanie)", () => {
		const w = ocen(
			[g("main", 155, true), g("prod-backup-a", OKNO - 1), g("prod-backup-b", 2)],
			OKNO,
			TERAZ,
		);
		expect(w.kod).toBe(0);
		expect(w.przeterminowane).toEqual([]);
	});

	it("gałąź produkcyjna NIE jest kopią, NAWET gdy nazywa się jak kopia", () => {
		// ⚠ TEN PRZYPADEK POWSTAŁ Z MUTACJI, NIE Z PROJEKTU. Pierwsze brzmienie
		// sprawdzało wyłącznie `main` — a `main` odsiewa już sprawdzenie NAZWY, więc
		// warunek „gałąź domyślna nie jest kopią" NIE BYŁ ĆWICZONY: mutacja M16
		// (usunięcie `g.default !== true`) przeszła na ZIELONO. Klasyczny
		// strażnik-atrapa (CLAUDE.md v1.17), znaleziony mutacją, nie czytaniem.
		//
		// Przypadek NIE jest teoretyczny: procedura odtworzenia (runbook §9) każe
		// odtworzyć do NOWEJ gałęzi i dopiero potem ją promować. Promowana gałąź
		// może więc nosić nazwę `prod-backup-*` i BYĆ produkcją. Bez rozróżnienia
		// narzędzie doradziłoby wtedy skasowanie produkcji.
		const odtworzonaProdukcja = g("prod-backup-odtworzona-20260813", OKNO + 40, true);
		expect(czyKopiaProdukcji(odtworzonaProdukcja)).toBe(false);
		expect(ocen([odtworzonaProdukcja], OKNO, TERAZ).kod).toBe(0);

		// Zwykła produkcja — druga strona tego samego rozróżnienia.
		expect(czyKopiaProdukcji(g("main", 155, true))).toBe(false);
		expect(ocen([g("main", 155, true)], OKNO, TERAZ).kod).toBe(0);
	});

	it("kolejność odwrotna, gdy kasowanie zeszłoby poniżej dwóch kopii (bramka (g))", () => {
		const w = ocen([g("prod-backup-stara", OKNO + 5), g("prod-backup-swieza", 1)], OKNO, TERAZ);
		expect(w.kod).toBe(1);
		expect(w.wymagaSwiezejKopiiPrzedKasowaniem).toBe(true);
	});

	it("przy dwóch świeżych kopiach kasowanie przeterminowanej NIE wymaga wyprzedzenia", () => {
		const w = ocen(
			[g("prod-backup-stara", OKNO + 5), g("prod-backup-s1", 1), g("prod-backup-s2", 2)],
			OKNO,
			TERAZ,
		);
		expect(w.kod).toBe(1);
		expect(w.wymagaSwiezejKopiiPrzedKasowaniem).toBe(false);
	});
});
