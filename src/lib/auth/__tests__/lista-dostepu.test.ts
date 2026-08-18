// @vitest-environment node
//
// STRAŻNIK LISTY DOSTĘPU.
//
// Pilnuje reguły o konsekwencji zewnętrznej: kto w ogóle wejdzie do aplikacji.
// Najważniejszy jest tu NIE przypadek „zaproszony wchodzi", tylko przypadek
// „lista pusta" — bo to jedyny, w którym wada nie jest widoczna gołym okiem:
// aplikacja działa, nikt nie zgłasza problemu, a bramka jest otwarta na oścież.
//
// MUTACJE CZERWIENIĄCE (CLAUDE.md §8 v1.17) — wykonane 2026-08-15, liczby
// PRZEPISANE Z PRZEBIEGU, nie oszacowane:
//   M1  `if (dozwolone.length === 0) return false;` → `return true`
//       (pusta lista wpuszcza wszystkich)                       -> 4 czerwone
//   M2  usunięcie `znormalizuj` z porównania                    -> 1 czerwony
//   M3  `if (!adres) return false;` → `return true`             -> 1 czerwony
//   M4  filtr pustych segmentów usunięty (lista „,,," niepusta) -> 4 czerwone
//   M5  zdjęta bramka produkcji (wpis domenowy działa wszędzie)  -> 1 czerwony
//   M6' porównanie po nazwie domeny bez małpy (poddomena wchodzi)-> 1 czerwony
//   M7  produkcja rozpoznawana po `NODE_ENV` zamiast `VERCEL_ENV`-> 1 czerwony
//   M8  powrót do „blokuj tylko na production" (podgląd przepuszcza) -> 2 czerwone
//   M9  zdjęta bramka wdrożenia w całości                       -> 3 czerwone
// Po cofnięciu wszystkich: 0 czerwonych.
//
// MUTACJA, KTÓRA PRZEŻYŁA — i dlaczego to NIE jest strażnik-atrapa:
//   M6  `wpis === domena` → `znormalizowany.endsWith(wpis)`      -> 0 czerwonych
// Ta zmiana jest RÓWNOWAŻNA ZACHOWANIEM, bo wpis domenowy niesie małpę:
// `ktos@evil.example.com` nie kończy się na `@example.com` (przed „example.com"
// stoi kropka, nie małpa). Mutacja niczego nie łamie, więc jej przeżycie nie
// mówi nic o strażniku — mówi o źle dobranej mutacji. Dopiero M6', które
// porównuje po samej nazwie domeny, faktycznie wpuszcza poddomenę i czerwieni.
// Zapisane, bo „mutacja przeżyła" bez tego wyjaśnienia czyta się jak wada.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	adresyDozwolone,
	czyAdresDozwolony,
	KOMUNIKAT_ODMOWY,
	wpisyDomenowe,
	ZMIENNA_LISTY_DOSTEPU,
} from "@/lib/auth/lista-dostepu";

const POPRZEDNIA = process.env[ZMIENNA_LISTY_DOSTEPU];

function ustawListe(wartosc: string | undefined): void {
	if (wartosc === undefined) delete process.env[ZMIENNA_LISTY_DOSTEPU];
	else process.env[ZMIENNA_LISTY_DOSTEPU] = wartosc;
}

beforeEach(() => ustawListe(undefined));
afterEach(() => ustawListe(POPRZEDNIA));

describe("lista dostępu — pusta znaczy ODMOWA WSZYSTKIM", () => {
	// Cztery kształty „braku listy", bo każdy powstaje inaczej: nikt nie ustawił
	// zmiennej / ustawił pustą / wyczyścił zostawiając przecinki / same spacje.
	// Wszystkie muszą dawać ten sam wynik, inaczej sposób czyszczenia listy
	// decyduje o tym, czy bramka jest otwarta.
	it.each([
		["zmienna nieustawiona", undefined],
		["zmienna pusta", ""],
		["same przecinki", ",,,"],
		["same białe znaki", "  ,  , "],
	])("%s -> nikt nie wchodzi", (_opis, wartosc) => {
		ustawListe(wartosc as string | undefined);
		expect(adresyDozwolone()).toEqual([]);
		expect(czyAdresDozwolony("ktokolwiek@example.com")).toBe(false);
	});
});

describe("lista dostępu — kontrola liczności", () => {
	// Wymóg Olivera: strażnik ma padać także wtedy, gdy lista jest NIEPUSTA,
	// ale żaden przypadek testowy jej nie dotknął. Bez tego dałoby się „zieleń"
	// na module, którego nikt nie wywołał z realną listą — czyli test mierzyłby
	// wyłącznie ścieżkę odmowy i milczał o tej, która wpuszcza.
	it("przypadki niżej faktycznie DOTYKAJĄ niepustej listy", () => {
		ustawListe("a@nordsignal.cc,b@nordsignal.cc");
		const lista = adresyDozwolone();
		expect(lista.length).toBeGreaterThan(0);
		// i co najmniej jeden przypadek pozytywny ją realnie konsumuje:
		expect(czyAdresDozwolony(lista[0])).toBe(true);
	});
});

describe("lista dostępu — zaproszony wchodzi, niezaproszony nie", () => {
	beforeEach(() => ustawListe("zaproszony@nordsignal.cc, drugi@nordsignal.cc"));

	it("zaproszony wchodzi", () => {
		expect(czyAdresDozwolony("zaproszony@nordsignal.cc")).toBe(true);
		expect(czyAdresDozwolony("drugi@nordsignal.cc")).toBe(true);
	});

	it("niezaproszony NIE wchodzi", () => {
		expect(czyAdresDozwolony("obcy@example.com")).toBe(false);
	});

	it("wielkość liter i spacje nie decydują o dostępie", () => {
		// Fałszywy negatyw na tej bramce jest równie zły jak fałszywy pozytyw:
		// odcina zaproszoną osobę, a wygląda jak awaria logowania.
		expect(czyAdresDozwolony("  Zaproszony@Nordsignal.CC ")).toBe(true);
	});

	it("brak adresu nie jest zgodą", () => {
		expect(czyAdresDozwolony(null)).toBe(false);
		expect(czyAdresDozwolony(undefined)).toBe(false);
		expect(czyAdresDozwolony("")).toBe(false);
	});

	it("dopasowanie jest pełne, nie po fragmencie", () => {
		// `includes` na tablicy, nie na napisie — inaczej `zaproszony@nordsignal.cc.evil.com`
		// albo `roszony@nordsignal.cc` mogłyby przejść.
		expect(czyAdresDozwolony("zaproszony@nordsignal.cc.evil.com")).toBe(false);
		expect(czyAdresDozwolony("roszony@nordsignal.cc")).toBe(false);
	});
});

describe("lista dostępu — wpis domenowy NIE działa na produkcji", () => {
	// Powód istnienia wpisu domenowego: przejazd rejestracji generuje adresy
	// LOSOWE, więc lista dosłownych adresów nigdy by go nie przepuściła.
	// Powód jego bramki: `@uczelnia.pl` na produkcji wpuściłby KAŻDEGO studenta
	// tej uczelni zamiast pięciorga zaproszonych.
	//
	// Te dwa testy są parą i mają sens wyłącznie razem — jeden bez drugiego
	// opisuje pół reguły.
	beforeEach(() => ustawListe("@example.com, imienny@nordsignal.cc"));
	afterEach(() => {
		delete process.env.VERCEL_ENV;
	});

	it("POZA produkcją wpis domenowy wpuszcza (inaczej tor nocny nie ma jak przejść)", () => {
		delete process.env.VERCEL_ENV;
		expect(czyAdresDozwolony("losowy-1234@example.com")).toBe(true);
	});

	it("NA produkcji wpis domenowy NIE wpuszcza", () => {
		process.env.VERCEL_ENV = "production";
		expect(czyAdresDozwolony("losowy-1234@example.com")).toBe(false);
	});

	it("NA PODGLĄDZIE wpis domenowy TEŻ nie wpuszcza", () => {
		// Sprostowanie po pomiarze Leo: podgląd jest wdrożeniem OSIĄGALNYM
		// Z INTERNETU. Pierwsza wersja blokowała tylko `production`, więc na
		// podglądzie wpis domenowy działał, a bronił go wyłącznie `ssoProtection`
		// — ustawienie w konsoli, poza kontrolą wersji i bez strażnika.
		process.env.VERCEL_ENV = "preview";
		expect(czyAdresDozwolony("losowy-1234@example.com")).toBe(false);
	});

	it("nieznana wartość VERCEL_ENV też blokuje (pytamy o obecność, nie o wartość)", () => {
		// Gdyby platforma dołożyła trzecią nazwę środowiska, domyślnie ma być
		// zamknięte. Lista wartości gniłaby; obecność zmiennej nie gnije.
		process.env.VERCEL_ENV = "jakies-nowe-srodowisko";
		expect(czyAdresDozwolony("losowy-1234@example.com")).toBe(false);
	});

	it("NA produkcji adres imienny nadal wpuszcza — bramka tnie domeny, nie listę", () => {
		process.env.VERCEL_ENV = "production";
		expect(czyAdresDozwolony("imienny@nordsignal.cc")).toBe(true);
	});

	it("wpis domenowy nie łapie obcej domeny ani poddomeny", () => {
		delete process.env.VERCEL_ENV;
		expect(czyAdresDozwolony("ktos@inna.pl")).toBe(false);
		// Domenę bierzemy po OSTATNIEJ małpie, więc `@example.com` nie łapie
		// `ktos@evil.example.com` — inaczej wystarczyłoby zarejestrować poddomenę.
		expect(czyAdresDozwolony("ktos@evil.example.com")).toBe(false);
	});

	it("spis wpisów domenowych jest widoczny na zewnątrz (diagnostyka i przegląd)", () => {
		expect(wpisyDomenowe()).toEqual(["@example.com"]);
	});
});

describe("lista dostępu — odmowa jest głośna", () => {
	it("komunikat mówi, co się stało, i nie zdradza listy", () => {
		expect(KOMUNIKAT_ODMOWY).toMatch(/zaproszon/i);
		expect(KOMUNIKAT_ODMOWY.length).toBeGreaterThan(40);
		expect(KOMUNIKAT_ODMOWY).not.toMatch(/@/); // żadnego adresu w treści
	});
});
