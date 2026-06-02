import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite — B1 paszport, B4 samoocena, dashboard, projekty.
 *
 * Dlaczego @dbwrite (a nie read-only):
 *  - /passport przy wejściu może TWORZYĆ/AKTUALIZOWAĆ rekord passports — zapis,
 *    więc nie wolno na prod.
 *  - B4 samoocena autosave'uje oceny (PATCH /api/self-assessment/ratings/...) i
 *    advance (POST /api/onboarding/advance) — zapis.
 *  - dashboard/projekty czytają, ale wiszą za auth/onboardingiem (sesja w bazie).
 *
 * KONTA (helpers/auth.ts + seed tools/seed-e2e.ts):
 *  - "main": onboardingCompleted=TRUE → B1/dashboard/projekty (inaczej redirect
 *    na /onboarding).
 *  - "b4":   onboardingCompleted=FALSE → B4 (inaczej /onboarding redirectuje na
 *    /dashboard). To DWA różne konta, bo wymagania tras są sprzeczne.
 *
 * B4 a skala: skala 1–4 („nie znam/uczę się/znam/dobrze znam"), próg to OCEŃ
 * ≥ requiredCount (=min(5, N), domyślnie 5) KOMPETENCJI — nie „poziom ≥5".
 */

test.describe("@dbwrite B1 Paszport kompetencji", () => {
	test("Paszport ładuje się: widok bez błędu runtime", async ({ page }) => {
		await loginWithPassword(page, "main");
		await page.goto("/passport");
		await expect(page).toHaveURL(/\/passport/);
		await expect(page.locator("body")).not.toContainText(
			/Application error|Internal Server Error/i,
		);
	});
});

/**
 * B4 — UWAGA: krok 4 (samoocena) jest w wizardzie onboardingu OSIĄGALNY TYLKO
 * przez krok 2 „Sylabus", który woła model (POST /api/syllabus/parse). Wizard
 * trzyma numer kroku w stanie klienta (useState(1)) — nie da się „wskoczyć" na
 * krok 4 z URL ani z seeda. Dlatego ten test jest oznaczony @llm: wymaga
 * ANTHROPIC_API_KEY tak samo jak B0. Bez klucza — pomija się (guard niżej).
 *
 * Seed (tools/seed-e2e.ts) dla konta "b4": profil + ≥5 kompetencji już w bazie,
 * onboardingCompleted=FALSE. Test przechodzi wizard 1→2(AI)→3→4 i ocenia ≥5.
 */
test.describe("@dbwrite @llm B4 Samoocena (onboarding krok 4 z 5)", () => {
	// LLM dostępny po stronie SERWERA (klucz w env serwera dev/preview, nie w
	// transkrypcie Playwright). Sygnalizujemy to flagą E2E_LLM_AVAILABLE=1 LUB
	// obecnością ANTHROPIC_API_KEY w procesie Playwright. Bez żadnej — skip.
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"B4 wymaga LLM (serwer musi mieć ANTHROPIC_API_KEY): krok 4 wizardu osiągalny " +
			"tylko przez krok 2 'Sylabus' (woła model). Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma klucz.",
	);

	test("Wizard 1→4: oceń ≥5 kompetencji, advance odblokowuje się po progu", async ({ page }) => {
		// Wizard woła model DWA razy (syllabus parse + Skill Map przy zapisie) —
		// to realne 15–60 s. Podnosimy budżet czasu całego testu.
		test.setTimeout(180_000);
		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		// Krok 1 — Profil. Etykiety NIE są powiązane (htmlFor) z polami, więc
		// celujemy po placeholderze (input) i po roli combobox (radix Select).
		await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible({
			timeout: 15_000,
		});
		// Kierunek studiów — input po placeholderze.
		await page.getByPlaceholder(/Informatyka, Zarządzanie/i).fill("Informatyka");
		// Radix Select: combobox[0]=uczelnia, [1]=semestr, [2]=cel kariery.
		// Klik triggera otwiera listbox z opcjami (role=option).
		await page.getByRole("combobox").nth(0).click();
		await page.getByRole("option").first().click(); // uczelnia — pierwsza
		await page.getByRole("combobox").nth(1).click();
		await page.getByRole("option").first().click(); // semestr — pierwszy
		await page.getByRole("combobox").nth(2).click();
		await page.getByRole("option", { name: /Data Analyst/i }).click(); // cel kariery
		// „Dalej" odblokowuje się po wypełnieniu wszystkich wymaganych pól.
		const dalej = page.getByRole("button", { name: /^Dalej$/ });
		await expect(dalej).toBeEnabled({ timeout: 10_000 });
		await dalej.click();

		// Krok 2 — Sylabus. Wklej ≥100 znaków i odpal analizę AI (krok 2→3).
		await expect(page.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeVisible();
		await page
			.getByPlaceholder(/Wklej tutaj treść sylabusa/i)
			.fill(
				"Sylabus testowy do E2E: analiza danych, statystyka, SQL, Python, " +
					"wizualizacja, raportowanie wyników, podstawy uczenia maszynowego, " +
					"praca z arkuszami i czyszczenie danych. Treść ma min. 100 znaków.",
			);
		await page.getByRole("button", { name: /Analizuj sylabus/i }).click();

		// Krok 3 — Kompetencje (po analizie AI). Zatwierdź (≥5 z analizy/seeda).
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible({
			timeout: 60_000,
		});
		await page.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }).click();

		// Krok 4 — Samoocena. Po „Zatwierdź" leci POST /api/onboarding (zapis +
		// generacja Skill Map = drugie wołanie modelu, do ~60 s) → ekran
		// „Analizujemy Twój profil…", potem krok 4. Callout potwierdza B4.
		await expect(page.getByText(/To Twoja własna deklaracja, nie ocena/i)).toBeVisible({
			timeout: 90_000,
		});
		const advance = page.getByRole("button", { name: /^Idź dalej$/ });
		await expect(advance).toBeDisabled();

		// Oceń 5 pierwszych kompetencji — w każdej radiogroup wybierz „znam".
		// RatingScale renderuje natywny input[type=radio] jako sr-only, a widoczna
		// jest <label> (segment), która przechwytuje kliknięcia. Dlatego check()
		// z force:true na ukrytym inpucie (interakcja realna idzie i tak na grupę).
		const groups = page.getByRole("radiogroup");
		const count = Math.min(5, await groups.count());
		for (let i = 0; i < count; i++) {
			await groups.nth(i).getByRole("radio", { name: /^znam/i }).first().check({ force: true });
			await page.waitForTimeout(700); // autosave debounce 400 ms + zapis
		}

		await expect(advance).toBeEnabled({ timeout: 15_000 });
	});
});

test.describe("@dbwrite Dashboard", () => {
	test("Dashboard ładuje kompetencje bez błędu (migracja 0014 OK)", async ({ page }) => {
		await loginWithPassword(page, "main");
		await page.goto("/dashboard");
		await expect(page.getByRole("heading", { name: /Cześć,/i })).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(/Twoje narzędzia/i)).toBeVisible();
		await expect(page.locator("body")).not.toContainText(
			/Application error|Internal Server Error/i,
		);
	});
});

test.describe("@dbwrite Marketplace projektów", () => {
	test("Lista projektów ładuje się (nagłówek Projekty)", async ({ page }) => {
		await loginWithPassword(page, "main");
		await page.goto("/projects");
		await expect(page.getByRole("heading", { name: /^Projekty$/ })).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.locator("body")).not.toContainText(
			/Application error|Internal Server Error/i,
		);
	});

	test("Detal projektu otwiera się z listy (seed gwarantuje ≥1 projekt)", async ({ page }) => {
		await loginWithPassword(page, "main");
		await page.goto("/projects");
		await expect(page.getByRole("heading", { name: /^Projekty$/ })).toBeVisible({
			timeout: 15_000,
		});
		const firstProjectLink = page.locator('a[href^="/projects/"]').first();
		await expect(firstProjectLink).toBeVisible({ timeout: 15_000 });
		await firstProjectLink.click();
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);
		await expect(page.locator("body")).not.toContainText(/Application error/i);
	});
});
