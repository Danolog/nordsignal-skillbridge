// @vitest-environment node
/**
 * STRAŻNIK — bramka akceptacji regulaminu pilotażu (fala 2, zamówienie Sophii R-6 pkt 1).
 *
 * Czego pilnuje: rejestracja NIE kończy się bez świadomego zaznaczenia pola wyboru,
 * a zgoda jest przypięta do KONKRETNEJ wersji dokumentu (§14 — „na co ta osoba się
 * zgodziła"). Walidacja ma stać po stronie serwera; atrybut `required` w przeglądarce
 * jest wygodą dla człowieka, nie bramką.
 *
 * ── KONIUNKCJA MA TYLE MUTACJI, ILE CZŁONÓW (warunek zlecenia) ───────────────
 * Warunek przepuszczenia to koniunkcja dwóch członów:
 *   (1) `akceptacjaRegulaminu === true`
 *   (2) `wersjaRegulaminu === wersja aktualna`
 * Każdy człon ma własną mutację (MC1, MC2) — usunięcie któregokolwiek MUSI
 * czerwienić, inaczej jeden z nich jest dekoracją.
 *
 * ── DOWODY MUTACJI (CLAUDE.md v1.17, reguła (2)) ─────────────────────────────
 * Wykonane 2026-08-14, każda cofnięta po pomiarze. Wyniki z realnego przebiegu.
 *
 * MC1 (człon 1). W `sprawdzAkceptacjeRegulaminu` warunek `!== true` osłabiony do
 *      `== null` (czyli „byle co prawdziwe wystarczy"):
 *      PADA 5 z 14. Cytat: „expected true to be false" — dla pola niezaznaczonego
 *      oraz dla wejść `"true"` (napis), `1`, `"on"` i napisu niepustego, czyli
 *      dokładnie tych, którymi żądanie składane ręcznie obeszłoby pole wyboru.
 *
 * MC2 (człon 2). Usunięcie CAŁEGO bloku sprawdzającego wersję:
 *      PADA 2 z 14 — „odmawia przy wersji innej niż aktualna" i „odmawia przy braku
 *      wersji". Bez tej mutacji człon (2) mógłby nie robić nic i nikt by nie zauważył.
 *
 * MC3 (jeden nośnik wersji). W `wyciagnijWersjeRegulaminu` zwrot podmieniony na
 *      literał `"v0.1"` (kod przestaje czytać dokument, zaczyna twierdzić swoje):
 *      PADA 1 z 14. Cytat: „expected 'v0.1' to be 'v9.9'".
 *      To jest mutacja, dla której funkcja została ROZDZIELONA od odczytu pliku —
 *      sklejona z `readFileSync` dałaby się sprawdzić tylko na dzisiejszym
 *      dokumencie (wersja v0.1), czyli przeżyłaby tę mutację na zielono.
 *
 * Przebieg po cofnięciu wszystkich trzech: 14/14 zielonych.
 *
 * ── CZEGO TEN STRAŻNIK NIE PILNUJE (jawnie, nie udaję) ───────────────────────
 * 1. NIE sprawdza, że zaczep `before` biblioteki uwierzytelniającej faktycznie
 *    dostaje te pola w `ctx.body` — to wymaga wykonania pełnej ścieżki rejestracji
 *    z bazą, czego nie robię (baza testowa jest współdzielona). Że biblioteka
 *    dodatkowych pól NIE odcina, wiem z jej ŹRÓDŁA w zainstalowanej wersji
 *    (better-auth 1.6.26, `dist/api/routes/sign-up.mjs` linia 14–21):
 *      const signUpEmailBodySchema = z.object({…}).and(z.record(z.string(), z.any()));
 *    Przecięcie z rekordem dowolnych kluczy przepuszcza nadmiarowe pola. To dowód
 *    ze źródła, NIE z uruchomienia — oznaczone jako niezweryfikowane wykonaniem.
 * 2. NIE pilnuje ścieżki rejestracji przez dostawcę tożsamości (Google) — ta idzie
 *    inną trasą i bramki NIE ma. Luka opisana w `src/app/(auth)/signup/page.tsx`.
 * 3. NIE pilnuje ZAPISU akceptacji — zapisu nie ma (migracja schematu, Ethan).
 */

import { describe, expect, it } from "vitest";
import {
	sprawdzAkceptacjeRegulaminu,
	wersjaRegulaminuPilotazu,
	wyciagnijWersjeRegulaminu,
} from "@/lib/tresc/akceptacja-regulaminu";

const WERSJA = "v0.1";

describe("sprawdzAkceptacjeRegulaminu — człon (1): świadome zaznaczenie", () => {
	it("przepuszcza zaznaczone pole z aktualną wersją", () => {
		const wynik = sprawdzAkceptacjeRegulaminu(
			{ akceptacjaRegulaminu: true, wersjaRegulaminu: WERSJA },
			WERSJA,
		);
		expect(wynik.ok).toBe(true);
	});

	it("odmawia, gdy pola w ogóle nie ma", () => {
		expect(sprawdzAkceptacjeRegulaminu({}, WERSJA).ok).toBe(false);
		expect(sprawdzAkceptacjeRegulaminu(undefined, WERSJA).ok).toBe(false);
		expect(sprawdzAkceptacjeRegulaminu(null, WERSJA).ok).toBe(false);
	});

	it("odmawia przy polu niezaznaczonym", () => {
		expect(
			sprawdzAkceptacjeRegulaminu({ akceptacjaRegulaminu: false, wersjaRegulaminu: WERSJA }, WERSJA)
				.ok,
		).toBe(false);
	});

	it.each([
		["napis „true”", "true"],
		["jedynka", 1],
		["napis „on” (wartość pola wyboru w formularzu)", "on"],
		["napis niepusty", "tak"],
	])("odmawia przy wartości prawdziwej, ale nie logicznej: %s", (_opis, wartosc) => {
		// To NIE jest czepialstwo o typ: pole wyboru wysyła wartość logiczną, więc
		// każda z tych wartości oznacza żądanie składane ręcznie — czyli dokładnie ten
		// przypadek, dla którego bramka stoi po stronie serwera.
		expect(
			sprawdzAkceptacjeRegulaminu(
				{ akceptacjaRegulaminu: wartosc, wersjaRegulaminu: WERSJA },
				WERSJA,
			).ok,
		).toBe(false);
	});

	it("komunikat odmowy jest po polsku i mówi, co zrobić", () => {
		const wynik = sprawdzAkceptacjeRegulaminu({}, WERSJA);
		expect(wynik.ok).toBe(false);
		if (!wynik.ok) expect(wynik.powod).toContain("zaakceptuj regulamin");
	});
});

describe("sprawdzAkceptacjeRegulaminu — człon (2): zgoda przypięta do wersji", () => {
	it("odmawia przy wersji innej niż aktualna (karta otwarta przed podbiciem)", () => {
		expect(
			sprawdzAkceptacjeRegulaminu({ akceptacjaRegulaminu: true, wersjaRegulaminu: "v0.0" }, WERSJA)
				.ok,
		).toBe(false);
	});

	it("odmawia przy braku wersji, mimo zaznaczonego pola", () => {
		expect(sprawdzAkceptacjeRegulaminu({ akceptacjaRegulaminu: true }, WERSJA).ok).toBe(false);
	});
});

describe("wersja regulaminu — jeden nośnik (dokument, nie kod)", () => {
	it("czyta wersję z treści, a nie z własnego literału", () => {
		// Treść spreparowana: gdyby funkcja zwracała wpisaną na sztywno „v0.1",
		// ten przypadek by ją zdemaskował (mutacja MC3).
		expect(wyciagnijWersjeRegulaminu("## §1\ntekst\n\n**Wersja:** v9.9 · data")).toBe("v9.9");
	});

	it("rzuca, gdy dokument nie ma oznaczenia wersji (nie zgaduje)", () => {
		expect(() => wyciagnijWersjeRegulaminu("## §1\nbez metryki")).toThrow(/oznaczeń wersji/);
	});

	it("rzuca, gdy oznaczeń wersji jest więcej niż jedno", () => {
		expect(() => wyciagnijWersjeRegulaminu("**Wersja:** v0.1\ntekst\n**Wersja:** v0.2")).toThrow(
			/oznaczeń wersji/,
		);
	});

	it("realny dokument Sophii ma dokładnie jedną wersję w CZĘŚCI I", () => {
		// Kontrola na żywym nośniku — łapie podbicie wersji, które rozjechałoby się
		// z tym, co widzi uczestnik.
		expect(wersjaRegulaminuPilotazu()).toMatch(/^v\d+\.\d+$/);
	});
});
