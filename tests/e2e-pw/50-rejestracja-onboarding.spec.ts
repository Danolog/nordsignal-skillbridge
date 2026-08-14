import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite — ŚCIEŻKA KRYTYCZNA #1: „rejestracja od zera → kreator → domknięcie kroku".
 *
 * DLACZEGO TEN PLIK ISTNIEJE I DLACZEGO WRACA DO CI (zadanie 1.6, blokada B6):
 * przed wpuszczeniem pierwszych 3–5 uczestników nie mieliśmy ŻADNEGO automatycznego
 * dowodu, że założenie konta działa. Pomiar 2026-08-14 na `main` b2b821e:
 *   grep -o "tests/e2e-pw/…spec.ts" .github/workflows/pr.yml | sort -u  → 8 plików
 *   ls tests/e2e-pw/*.spec.ts | wc -l                                   → 16 plików
 * Poza CI stało m.in. TO, czyli dokładnie pierwsza czynność pierwszego człowieka.
 * Plik był wyłączony z zakresu joba jako „przeterminowany, do przepisania"
 * (pr.yml, komentarz przy `E2E_LLM_SPEC`).
 *
 * CO BYŁO PRZETERMINOWANE (zmierzone czytaniem kodu na b2b821e, nie ze starego speca):
 *   - poprzednia wersja kotwiczyła krok Wniosków na „Profil gotowy" i „Przejdź do
 *     dashboardu". W `step-wnioski.tsx` NIE MA dziś takich napisów — są
 *     „Masz plan. Zobacz, od czego zacząć." i „Przejdź do pulpitu". Spec nieodpalany
 *     przez CI zdążył się rozjechać z produktem i padłby na kotwicy, nie na wadzie.
 *   - poprzednia wersja nie znała rozwidlenia N2′ z #309 (scalone 2026-08-14),
 *     czyli jedynej rzeczy, która w kroku 3 zmieniła zachowanie dla człowieka.
 *
 * CO POKRYWA (kolejność jak u człowieka):
 *   A. rejestracja od zera — konto powstaje, ląduje w kreatorze, wiersz w bazie;
 *   A2. klauzula art. 13 RODO osiągalna ZE ŚCIEŻKI REJESTRACJI (za flagą);
 *   B. kreator: Krok 0 (picker 23 ścieżek) → Profil → sylabus pominięty → krok 3;
 *   C. #309 wariant „wróć i zaznacz" + DOWÓD, że zero zaznaczeń NIE przechodzi po cichu;
 *   D. #309 wariant „przejdź dalej bez testu" → Wnioski → pulpit → TRWAŁY STAN w bazie.
 *
 * DWIE ZALEŻNOŚCI ŚRODOWISKA — JAWNE, BO CICHY POMIJANY TEST TO ZIELEŃ BEZ POKRYCIA:
 *
 *   1. `E2E_DIAGNOSIS_FLAG=1` — sygnał, że SERWER pod testem ma
 *      `FLAG_DIAGNOSTIC_ASSESSMENT=1`. Rozwidlenie N2′ renderuje się WYŁĄCZNIE
 *      w trybie diagnozy (`diagnosticMode = diagnosticEnabled && !diagnosisFallback`,
 *      onboarding-wizard.tsx). Przy fladze zgaszonej przycisk kroku 3 woła
 *      `runSubmit()` bezpośrednio i rozwidlenia NIE MA — testy C/D orzekałyby wtedy
 *      o ekranie, którego nie ma. Flaga jest czytana po stronie serwera
 *      (`onboarding/page.tsx` → `isFeatureEnabled`), więc proces Playwrighta nie ma
 *      jak jej sam sprawdzić — stąd osobna zmienna-sygnał, wzorem `E2E_TUTOR_FLAG`
 *      i `E2E_VIVA_FLAG` z 60-c11 / 70-b7.
 *
 *   2. `E2E_PRIVACY_FLAG=1` — analogicznie dla `FLAG_PRIVACY_NOTICE_ART13=1`
 *      (odnośnik do klauzuli pod formularzem rejestracji znika razem z flagą).
 *
 * ROZBIEŻNOŚĆ ZE ZLECENIEM — ŚWIADOMA, ZGŁOSZONA, NIE OBEJŚCIE:
 * zlecenie mówiło „klauzulę i akceptację". AKCEPTACJI NIE MA I NIE POWINNO BYĆ:
 * `src/app/(auth)/signup/page.tsx` nazywa to wprost — art. 13 to obowiązek
 * INFORMACYJNY, nie zgoda, więc pole „akceptuję" byłoby „błędem prawnym, nie tylko
 * nadmiarem". Testuję więc kontrakt, który produkt realnie ma (klauzula OSIĄGALNA
 * ze ścieżki rejestracji), a nie kontrolkę, której celowo nie ma. Gdyby ten spec
 * asertował „akceptację", wymusiłby dokładanie pola wbrew decyzji prawnej.
 *
 * LIMIT REJESTRACJI — TWARDE OGRANICZENIE PROJEKTU TESTU (zmierzone, nie zgadnięte):
 * Better Auth 1.6.26 ma WBUDOWANY limiter, którego `betterAuth({...})` w
 * `src/lib/auth/server.ts` nie nadpisuje, więc obowiązują domyślne reguły:
 *   node_modules/…/better-auth/dist/api/rate-limiter/index.mjs, getDefaultSpecialRules():
 *   pathMatcher: path.startsWith("/sign-in") || path.startsWith("/sign-up") …
 *   window: 10, max: 3
 * Czyli MAKS. 3 rejestracje na 10 sekund Z JEDNEGO ADRESU IP; czwarta dostaje 429
 * i formularz pokazuje „Too many requests. Please try again later." (zmierzone
 * 2026-08-14: przebieg z czterema rejestracjami padł dokładnie na tym).
 * Dlatego ten plik rejestruje DOKŁADNIE TRZY konta i nie ma czwartego testu
 * zakładającego konto. Świadomie NIE obchodzę tego ponawianiem po 429 — ponawianie
 * schowałoby realne ograniczenie produktu przed zespołem, a to jest dokładnie ta
 * klasa „zielonego testu przy sypiącym produkcie", której ten plik ma nie produkować.
 *
 * BEZ SEGMENTU @llm. Cała ścieżka domyka się BEZ zależności od wyniku modelu:
 * `POST /api/onboarding` tworzy paszport W TRANSAKCJI (route.ts — insert do
 * `passports`), a `generateSkillMap` leci ZA nią i jego pad jest łapany
 * (`aiGenerationFailed: true`, odpowiedź nadal `success`). Asercje trwałego stanu
 * (onboarding_completed + paszport) są więc deterministyczne. Tag @llm dołożyłby
 * tym testom migotanie modelu bez zysku dowodowego.
 */

const PASSWORD_FIELD_LABEL = "Hasło";
const KONTO_HASLO = "Test1234!e2e";
const DATABASE_URL = process.env.DATABASE_URL ?? process.env.E2E_DATABASE_URL ?? "";

/** Jedna z 23 realnych ścieżek pickera; `targetRole: false`, bez `profileNote`,
 *  więc dostępna nazwa przycisku to czysty napis (dopasowanie `exact` jest bezpieczne). */
const CEL_KARIERY = "Data Analyst";

const DIAGNOZA_WLACZONA = process.env.E2E_DIAGNOSIS_FLAG === "1";
const KLAUZULA_WLACZONA = process.env.E2E_PRIVACY_FLAG === "1";

/** Tekst rozwidlenia N2′ — mikrocopy WIĄŻĄCE Sophii (§3, „Tekst mój, 1:1").
 *  Kotwiczę na nim świadomie: gdyby ktoś je sparafrazował przy refaktorze, ma o tym
 *  usłyszeć od testu, bo to jest zdanie uzgodnione z PO, nie ozdoba. */
const TEKST_ROZWIDLENIA =
	"Nic nie zaznaczyłeś, więc nie mamy czego zmierzyć — zaczniesz od podstaw.";

function unikalnyEmail(tag: string): string {
	return `reg-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Rejestracja od zera przez realny formularz (nie przez seed, nie przez API). */
async function zarejestruj(page: Page, imie: string, email: string): Promise<void> {
	await page.goto("/signup");
	await page.getByLabel("Imię i nazwisko").fill(imie);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel(PASSWORD_FIELD_LABEL, { exact: true }).fill(KONTO_HASLO);
	await page.getByRole("button", { name: /Utwórz konto/i }).click();
	// Wyjście ze /signup = konto realnie powstało (formularz zostaje przy błędzie auth).
	await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
	await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
}

/** Krok 0 — wybór celu z deterministycznego pickera (bez modelu). */
async function wybierzCelKrok0(page: Page): Promise<void> {
	await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toBeVisible();
	await page.getByRole("button", { name: CEL_KARIERY, exact: true }).click();
	await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible();
}

/** Krok 1 (Profil) → „Dalej". Po przebudowie Profil ma TYLKO 2 listy wyboru
 *  (uczelnia, semestr) — cel kariery przeniesiony do Kroku 0. */
async function wypelnijProfilKrok1(page: Page): Promise<void> {
	const listy = page.getByRole("combobox");
	await listy.nth(0).click();
	await page.getByRole("option").first().click();
	await page.getByPlaceholder(/Informatyka, Zarządzanie/i).fill("Informatyka");
	await listy.nth(1).click();
	await page.getByRole("option").first().click();
	// Anty-regresja: gdyby cel kariery wrócił do Profilu, list byłoby 3.
	await expect(listy).toHaveCount(2);
	const dalej = page.getByRole("button", { name: /^Dalej$/ });
	await expect(dalej).toBeEnabled();
	await dalej.click();
}

/** Krok 2 (Sylabus) — pomijamy; katalog rynku przychodzi tak czy inaczej. */
async function pominSylabusKrok2(page: Page): Promise<void> {
	await expect(page.getByRole("heading", { name: /Sylabus \(opcjonalny\)/i })).toBeVisible();
	await page.getByRole("button", { name: /Pomiń sylabus/i }).click();
}

/** Doprowadza świeżo zarejestrowane konto do kroku 3 (Kompetencje), z katalogiem
 *  już wczytanym — czyli do stanu, w którym `canCloseStep3` jest spełniony. */
async function doKroku3(page: Page): Promise<void> {
	await page.goto("/onboarding");
	await wybierzCelKrok0(page);
	await wypelnijProfilKrok1(page);
	await pominSylabusKrok2(page);
	await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible();
	// Katalog rynku NIEPUSTY i zero zaznaczeń na wejściu. To nie ozdoba: `canCloseStep3`
	// wymaga `catalog.length > 0`, więc pusty katalog dałby wyłączony przycisk i test
	// orzekałby o ładowaniu, nie o rozwidleniu. (Zmierzone: bez `pnpm seed:e2e`
	// katalog JEST pusty — `job_market_data` 0 wierszy — i krok uczciwie blokuje.)
	await expect(page.getByText(/Zaznaczono 0 z [1-9]\d* kompetencji rynku/)).toBeVisible({
		timeout: 30_000,
	});
	await expect(page.getByRole("button", { name: /Zatwierdź i przejdź dalej/i })).toBeEnabled();
}

// ── A. Rejestracja od zera ───────────────────────────────────────────────────
test.describe("@dbwrite Ścieżka krytyczna #1 — rejestracja od zera", () => {
	test("nowe konto powstaje przez formularz i ląduje w kreatorze", async ({ page }) => {
		const email = unikalnyEmail("konto");
		await zarejestruj(page, "Uczestnik Pierwszy", email);

		// Kreator, nie pulpit: świeże konto ma onboarding_completed=false, więc brama
		// ma je wpuścić do kreatora. To jest ta ścieżka, którą przejdzie pierwszy człowiek.
		await page.goto("/onboarding");
		await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toBeVisible();

		// Trwały stan: konto realnie jest w bazie (UI mogło pokazać cokolwiek).
		const pool = new Pool({ connectionString: DATABASE_URL });
		try {
			const u = await pool.query<{ id: string }>('SELECT id FROM "user" WHERE email = $1', [email]);
			expect(u.rows.length).toBe(1);
		} finally {
			await pool.end();
		}
	});

	test("klauzula art. 13 jest osiągalna ze ścieżki rejestracji", async ({ page }) => {
		test.skip(
			!KLAUZULA_WLACZONA,
			"Wymaga FLAG_PRIVACY_NOTICE_ART13=1 na serwerze (sygnał: E2E_PRIVACY_FLAG=1). " +
				"Bez flagi odnośnik celowo nie istnieje — patrz signup/page.tsx.",
		);
		await page.goto("/signup");
		// UWAGA: to NIE jest „akceptacja". Art. 13 to obowiązek informacyjny — pola
		// „akceptuję" tu nie ma i być nie powinno (uzasadnienie w nagłówku pliku).
		const odnosnik = page.getByRole("link", { name: /Informacja o przetwarzaniu danych/i });
		await expect(odnosnik).toBeVisible();
		await odnosnik.click();
		await expect(page).toHaveURL(/\/prywatnosc/);
	});
});

// ── B. Kreator aż do kroku kompetencji ───────────────────────────────────────
// ŚWIADOMIE BEZ OSOBNEGO TESTU przejścia kreatora: kosztowałby CZWARTĄ rejestrację,
// a limit to 3/10 s (wyżej). Przejście Krok 0 → Profil → Sylabus → krok 3 jest w
// całości asertowane w `doKroku3` (nagłówek każdego kroku + `toHaveCount(2)` na
// Profilu + katalog niepusty), a `doKroku3` wykonują OBA testy rozwidlenia niżej.
// Pokrycie zostaje, liczba rejestracji spada — nie odwrotnie.

// ── C i D. Rozwidlenie N2′ z #309 — OBA warianty ─────────────────────────────
test.describe("@dbwrite Ścieżka krytyczna #1 — rozwidlenie przy zerze zaznaczeń (#309)", () => {
	test.skip(
		!DIAGNOZA_WLACZONA,
		"Rozwidlenie N2′ renderuje się tylko w trybie diagnozy. Wymaga " +
			"FLAG_DIAGNOSTIC_ASSESSMENT=1 na serwerze (sygnał: E2E_DIAGNOSIS_FLAG=1).",
	);

	test("wariant „wróć i zaznacz”: zero zaznaczeń ZATRZYMUJE krok, powrót przywraca listę", async ({
		page,
	}) => {
		await zarejestruj(page, "Uczestnik Rozwidlenie", unikalnyEmail("fork"));
		await doKroku3(page);

		await page.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }).click();

		// ── STRAŻNIK WADY Z #309 ──────────────────────────────────────────────
		// Przed naprawą ten sam klik przy zerze zaznaczeń wołał `runSubmit()` i po
		// cichu przenosił do Wniosków — człowiek mijał jedyny pomiar, jaki produkt ma
		// (przejazd Darka 2026-08-10: „gdzie miałem zobaczyć ekran diagnozy”).
		// Asercja NEGATYWNA jest tu rdzeniem: krok ma STAĆ.
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible();
		await expect(
			page.getByRole("heading", { name: /Masz plan\. Zobacz, od czego zacząć/i }),
		).toBeHidden();

		// Rozwidlenie: powód + DWA jawne wyjścia w miejscu, gdzie był przycisk.
		await expect(page.getByText(TEKST_ROZWIDLENIA)).toBeVisible();
		const dalejBezTestu = page.getByRole("button", { name: /Przejdź dalej bez testu/i });
		const wrocIZaznacz = page.getByRole("button", { name: /Wróć i zaznacz/i });
		await expect(dalejBezTestu).toBeVisible();
		await expect(wrocIZaznacz).toBeVisible();

		// Wariant 1 — „Wróć i zaznacz”: panel gaśnie, wraca wiersz akcji, da się zaznaczyć.
		await wrocIZaznacz.click();
		await expect(page.getByText(TEKST_ROZWIDLENIA)).toBeHidden();
		await expect(page.getByRole("button", { name: /^Wstecz$/ })).toBeVisible();

		await page
			.getByRole("button", { name: /Mam styczność — zmierz testem/i })
			.first()
			.click();
		await expect(page.getByText(/Zaznaczono 1 z \d+ kompetencji rynku/)).toBeVisible();
	});

	test("wariant „przejdź dalej bez testu”: krok domyka się i zostaje trwały stan", async ({
		page,
	}) => {
		// Limit podniesiony ŚWIADOMIE i wyłącznie o czas cudzy: `POST /api/onboarding`
		// woła `generateSkillMap` (realny model w torze nocnym, 15–60 s). To nie jest
		// maskowanie wolnego testu — asercje niżej nie zależą od wyniku modelu.
		test.setTimeout(180_000);

		const email = unikalnyEmail("domkniecie");
		await zarejestruj(page, "Uczestnik Domknięcie", email);
		await doKroku3(page);

		await page.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }).click();
		await expect(page.getByText(TEKST_ROZWIDLENIA)).toBeVisible();

		// Wariant 2 — świadome przejście bez pomiaru. Wolno, ale musi być WYBOREM.
		await page.getByRole("button", { name: /Przejdź dalej bez testu/i }).click();

		// Krok 4 (Wnioski) — kotwica wg AKTUALNEGO step-wnioski.tsx.
		await expect(
			page.getByRole("heading", { name: /Masz plan\. Zobacz, od czego zacząć/i }),
		).toBeVisible({ timeout: 120_000 });

		await page.getByRole("button", { name: /Przejdź do pulpitu/i }).click();
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.getByRole("heading", { name: /Cześć,/i })).toBeVisible();

		// ── TRWAŁY STAN — „ekrany się przeklikały” ≠ „onboarding domknięty” ──
		const pool = new Pool({ connectionString: DATABASE_URL });
		try {
			const u = await pool.query<{ id: string }>('SELECT id FROM "user" WHERE email = $1', [email]);
			expect(u.rows.length).toBe(1);

			const s = await pool.query<{ id: string; onboarding_completed: boolean }>(
				"SELECT id, onboarding_completed FROM students WHERE user_id = $1",
				[u.rows[0].id],
			);
			expect(s.rows.length).toBe(1);
			// Bez tego brama wrzuciłaby uczestnika z powrotem w kreator przy następnym wejściu.
			expect(s.rows[0].onboarding_completed).toBe(true);

			// Paszport = fundament ścieżek #2/#3. Liczba kompetencji NIE jest bramą (D5:
			// zero dozwolone) — dlatego asercja stoi na paszporcie, nie na „≥5 kompetencji”.
			const p = await pool.query<{ n: number }>(
				"SELECT count(*)::int AS n FROM passports WHERE student_id = $1",
				[s.rows[0].id],
			);
			expect(p.rows[0].n).toBeGreaterThanOrEqual(1);
		} finally {
			await pool.end();
		}
	});
});
