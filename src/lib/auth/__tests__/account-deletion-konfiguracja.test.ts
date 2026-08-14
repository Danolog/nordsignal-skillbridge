// STRAŻNIK KONFIGURACJI ŚCIEŻKI USUNIĘCIA KONTA (E1b, D-U2 i §3.5)
// + STRAŻNIK TREŚCI (reguła dopasowania frazy potwierdzającej).
//
// Dwie rzeczy, które wyglądają na drobiazgi, a nie są:
//
// (1) TRYB POCZTOWY. `sendDeleteAccountVerification` zapisuje do tabeli
//     `verification` wiersz o wartości równej identyfikatorowi WŁAŚNIE
//     USUWANEGO konta, a `verification` NIE kaskaduje razem z kontem. Włączenie
//     tego trybu sprawiłoby, że każde żądanie usunięcia zostawia po sobie
//     dokładnie to, co miało usunąć — podręcznikowy kształt awarii „naprawa
//     zostawia po sobie swój przedmiot”. Do tego wymagałby dostawcy poczty,
//     czyli nowego przetwarzającego, umowy powierzenia i wpisu w RoPA.
//     Komentarz w konfiguracji tego nie pilnuje. Ten test pilnuje.
//
// (2) FRAZA POTWIERDZAJĄCA. Reguła dopasowania ma konsekwencję zewnętrzną
//     W OBIE STRONY: zbyt ostra zamienia środek przeciw pomyłce w barierę
//     wykonania prawa (art. 17), zbyt luźna przepuszcza pomyłkę przy operacji
//     nieodwracalnej. Dlatego ma jeden nośnik i strażnika sprawdzającego OBA
//     kierunki, nie tylko „poprawna fraza przechodzi”.

import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth/server";
import {
	czyFrazaPotwierdzenia,
	FRAZA_POTWIERDZENIA,
	OKNO_POTWIERDZENIA,
} from "../account-deletion-tresc";

describe("Konfiguracja sciezki usuniecia konta", () => {
	it("trasy usuniecia konta ISTNIEJA w bibliotece (sciezka jest wlaczona, nie napisana od zera)", () => {
		// Kontrola dodatnia: gdyby klucz `user.deleteUser` zniknął z konfiguracji,
		// pozostałe asercje tego pliku byłyby zielone i puste.
		expect(Object.keys(auth.api)).toContain("deleteUser");
	});

	it("tryb potwierdzenia POCZTA jest wylaczony — i ma zostac wylaczony", () => {
		const opcje = (auth.options as { user?: { deleteUser?: Record<string, unknown> } }).user
			?.deleteUser;
		expect(opcje, "Brak konfiguracji `user.deleteUser` — ścieżka nie jest włączona.").toBeTruthy();
		expect(
			opcje?.sendDeleteAccountVerification,
			"Włączono potwierdzanie usunięcia konta pocztą. Ten tryb zapisuje do tabeli " +
				"`verification` wiersz o wartości równej identyfikatorowi usuwanego konta, " +
				"a ta tabela NIE ginie razem z kontem — usunięcie zostawiałoby po sobie " +
				"identyfikator osoby, która właśnie skorzystała z prawa do bycia zapomnianą. " +
				"Do tego: zero bibliotek pocztowych w manifeście, czyli nowy przetwarzający, " +
				"umowa powierzenia i wpis w RoPA. To osobne zadanie, nie element tego.",
		).toBeUndefined();
	});

	it("zaczepy before/after sa podpiete (bramka flagi i slad audytowy)", () => {
		const opcje = (auth.options as { user?: { deleteUser?: Record<string, unknown> } }).user
			?.deleteUser;
		expect(
			typeof opcje?.beforeDelete,
			"Brak `beforeDelete` — znika bramka flagi czytana przy KAŻDYM żądaniu, czyli " +
				"jedyna, która reaguje na zgaszenie flagi bez wdrożenia.",
		).toBe("function");
		expect(
			typeof opcje?.afterDelete,
			"Brak `afterDelete` — konto znika bez jednego zdania w dzienniku rozliczalności.",
		).toBe("function");
	});
});

describe("Fraza potwierdzajaca — regula dopasowania (jeden nosnik)", () => {
	it("fraza nie zawiera polskich znakow diakrytycznych", () => {
		// Decyzja produktowa Sophii, nie kosmetyka: znak wymagający polskiej
		// klawiatury zamienia środek przeciw pomyłce w barierę wykonania prawa
		// na telefonie i na klawiaturze nie-polskiej.
		expect(FRAZA_POTWIERDZENIA).toMatch(/^[A-Z ]+$/);
	});

	it("PRZYJMUJE: dokladna fraza, inna wielkosc liter, spacje na brzegach", () => {
		expect(czyFrazaPotwierdzenia(FRAZA_POTWIERDZENIA)).toBe(true);
		expect(czyFrazaPotwierdzenia(FRAZA_POTWIERDZENIA.toLowerCase())).toBe(true);
		expect(czyFrazaPotwierdzenia(`  ${FRAZA_POTWIERDZENIA}  `)).toBe(true);
	});

	it("ODRZUCA: wszystko inne — reguła nie ignoruje niczego wiecej", () => {
		// Kontrola w drugą stronę. Bez niej implementacja `return true` przeszłaby
		// poprzedni test w całości.
		expect(czyFrazaPotwierdzenia("")).toBe(false);
		expect(czyFrazaPotwierdzenia("USUWAM")).toBe(false);
		expect(czyFrazaPotwierdzenia("USUWAM  KONTO")).toBe(false); // podwójna spacja w środku
		expect(czyFrazaPotwierdzenia("USUWAM KONTO!")).toBe(false);
		expect(czyFrazaPotwierdzenia("USUŃ KONTO")).toBe(false);
	});

	it("okno potwierdzenia mowi, czego usuniecie NIE cofnie", () => {
		// Blok powstał z obalenia przesłanki „usunięcie konta wycofuje kredencjał
		// z obiegu” — paszport ma eksport do PDF i plik zostaje u odbiorcy.
		// Skrócenie tego bloku przy przepisywaniu do komponentu przewróciłoby
		// decyzję D-U3 („bez karencji”), której nikt by ponownie nie podejmował.
		expect(OKNO_POTWIERDZENIA.czegoNieCofnie.length).toBeGreaterThanOrEqual(3);
		expect(OKNO_POTWIERDZENIA.czegoNieCofnie.join(" ")).toMatch(/PDF|plik/i);
		expect(OKNO_POTWIERDZENIA.czegoNieCofnie.join(" ")).toMatch(/30 dni/);
		expect(OKNO_POTWIERDZENIA.zdanieWiodace).toMatch(/nie da si|nieodwracaln/i);
	});
});
