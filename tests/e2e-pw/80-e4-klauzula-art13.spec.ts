import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * E4 · @safe — klauzula informacyjna art. 13 RODO w interfejsie.
 *
 * ZERO zapisu do bazy, ZERO kosztu LLM, ZERO sesji: `/prywatnosc` jest publiczna
 * (poza matcherem middleware) i renderuje wyłącznie dokument z repozytorium.
 * Wolno odpalać nawet przy `.env.local` celującym w prod.
 *
 * WYMAGA `FLAG_PRIVACY_NOTICE_ART13=1` na serwerze pod testem. Bez flagi trasa
 * robi `notFound()` — i to jest stan produkcyjny, dopóki nie padnie komplet
 * warunków z sekcji Z-2 dokumentu. Pierwszy test tego pliku sprawdza, że przy
 * zapalonej fladze strona istnieje; gdyby job zapomniał flagi, padnie od razu
 * i głośno, zamiast zzielenieć na pustej stronie.
 *
 * Trzy rzeczy pod bramką:
 *   (1) treść dla studenta jest dostępna pod adresem i kompletna;
 *   (2) aparat wewnętrzny (CZĘŚĆ II) NIE jest w DOM — to samo, czego pilnuje
 *       strażnik jednostkowy, ale mierzone po stronie WYRENDEROWANEJ STRONY:
 *       strażnik jednostkowy mierzy repozytorium, ten test mierzy to, co realnie
 *       zobaczy człowiek;
 *   (3) axe-core: 0 naruszeń WCAG 2.1 AA + best-practice.
 */

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

/** Zdania z CZĘŚCI II — żadne nie ma prawa pojawić się w DOM. */
const APARAT_WEWNETRZNY = [
	"Nie jestem prawnikiem",
	"Warunki wejścia w życie",
	"NIE POKAZUJEMY GO NIKOMU",
	"Co musi sprawdzić prawnik",
	"aparat wewnętrzny",
	"CZĘŚĆ II",
	"W-1",
	"Ryan",
	"Ethan",
];

test.describe("@safe E4 — klauzula art. 13 pod /prywatnosc", () => {
	test("strona istnieje i niesie treść dla studenta", async ({ page }) => {
		const odpowiedz = await page.goto("/prywatnosc");
		expect(
			odpowiedz?.status(),
			"404 = flaga FLAG_PRIVACY_NOTICE_ART13 zgaszona na serwerze pod testem. " +
				"Bez niej ten plik nie mierzy niczego.",
		).toBe(200);

		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			"Informacja o tym, co robimy z Twoimi danymi",
		);
		// Rzeczy, których art. 13 wymaga wprost — gdyby cięcie CZĘŚCI I zjadło za
		// dużo, strona byłaby „czysta" i bezużyteczna zarazem.
		await expect(page.getByRole("heading", { name: /Kto odpowiada za Twoje dane/ })).toBeVisible();
		await expect(
			page.getByRole("heading", { name: /Jak długo trzymamy Twoje dane/ }),
		).toBeVisible();
		await expect(page.getByRole("heading", { name: /Twoje prawa/ })).toBeVisible();
		await expect(page.getByText("Prezesa Urzędu Ochrony Danych Osobowych")).toBeVisible();
	});

	test("okresy przechowywania są tabelą, nie akapitem z kreskami", async ({ page }) => {
		// Sekcja 7 to wymóg art. 13 ust. 2 lit. a. Bez wtyczki GFM `react-markdown`
		// wyrzuciłby ją jako proza z pionowymi kreskami — nieczytelną dla człowieka
		// i dla czytnika ekranu. Renderer robi z niej prawdziwą tabelę.
		await page.goto("/prywatnosc");
		const tabele = page.getByRole("table");
		await expect(tabele).toHaveCount(5);
		await expect(page.getByRole("columnheader", { name: "Jak długo" })).toBeVisible();
		await expect(page.getByRole("cell", { name: /12 miesięcy/ }).first()).toBeVisible();
	});

	test("w DOM nie ma ANI JEDNEGO zdania z aparatu wewnętrznego", async ({ page }) => {
		await page.goto("/prywatnosc");
		const html = await page.content();
		for (const zdanie of APARAT_WEWNETRZNY) {
			expect(
				html,
				`„${zdanie}" WYCIEKŁO na stronę widzianą przez studenta. CZĘŚĆ II dokumentu ` +
					`nigdy nie jest publikowana — student, który to zobaczy, dostaje dowód, ` +
					`że klauzuli nie napisał prawnik.`,
			).not.toContain(zdanie);
		}
		// Klucze maszynowe strażnika okresów też nie są treścią dla człowieka.
		expect(html).not.toContain("retencja:");
	});

	test("axe-core: 0 naruszeń WCAG 2.1 AA", async ({ page }) => {
		await page.goto("/prywatnosc");
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		const wynik = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
		console.log(`\n===== AXE [/prywatnosc] — naruszeń: ${wynik.violations.length} =====`);
		console.log(JSON.stringify(wynik.violations, null, 2));
		expect(wynik.violations, JSON.stringify(wynik.violations, null, 2)).toEqual([]);
	});

	test("ze ścieżki rejestracji da się dojść do klauzuli", async ({ page }) => {
		// UMIEJSCOWIENIE odnośnika (osobny krok? ekran przed formularzem?) to decyzja
		// Sophii (PO) — test pilnuje DOSTĘPNOŚCI, nie kształtu: ze /signup musi
		// istnieć droga do klauzuli, bo art. 13 wymaga informacji w momencie
		// pozyskiwania danych.
		await page.goto("/signup");
		const odnosnik = page.getByRole("link", { name: /Informacja o przetwarzaniu danych/i });
		await expect(odnosnik).toBeVisible();
		await odnosnik.click();
		await expect(page).toHaveURL(/\/prywatnosc/);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	});
});
