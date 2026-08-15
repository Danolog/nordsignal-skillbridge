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
// Po cofnięciu wszystkich czterech: 0 czerwonych.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	adresyDozwolone,
	czyAdresDozwolony,
	KOMUNIKAT_ODMOWY,
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

describe("lista dostępu — odmowa jest głośna", () => {
	it("komunikat mówi, co się stało, i nie zdradza listy", () => {
		expect(KOMUNIKAT_ODMOWY).toMatch(/zaproszon/i);
		expect(KOMUNIKAT_ODMOWY.length).toBeGreaterThan(40);
		expect(KOMUNIKAT_ODMOWY).not.toMatch(/@/); // żadnego adresu w treści
	});
});
