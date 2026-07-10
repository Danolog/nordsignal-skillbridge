import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { driveChatToSummaryCta } from "./helpers/b0-chat";
import { dbWriteTest as test } from "./helpers/guards";
import { fillSurveyAndContinue } from "./helpers/survey";

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
 * B4 — UWAGA: po strumieniu E (#5) wizard ma Krok 0 „Cel kariery" (Pomocnik) z
 * przodu. Krok 4 (samoocena) jest osiągalny przez: Krok 0 (Pomocnik — model) →
 * Profil (BEZ celu) → krok 2 „Sylabus" (model). Wizard trzyma numer kroku w stanie
 * klienta (useState(0)) — nie da się „wskoczyć" na krok 4 z URL ani z seeda.
 * Test jest @llm (wymaga ANTHROPIC_API_KEY): teraz model wołany jest DWUKROTNIE
 * (Krok 0 + Sylabus). Bez klucza — pomija się (guard niżej).
 *
 * Seed (tools/seed-e2e.ts) dla konta "b4": profil + ≥5 kompetencji już w bazie,
 * onboardingCompleted=FALSE. Test przechodzi wizard 0→1→2(AI)→3→4 i ocenia ≥5.
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

	test("Wizard 0→4: oceń ≥5 kompetencji, advance odblokowuje się po progu", async ({ page }) => {
		// Wizard woła model TRZY razy (Krok 0 czat + syllabus parse + Skill Map przy
		// zapisie). Krok 0 to ~9 wywołań modelu — podnosimy budżet czasu całego testu.
		test.setTimeout(360_000);
		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		// Krok 0 — Cel kariery (Pomocnik osadzony, strumień E / #5). Ustala careerGoal
		// w pamięci przez realny przepływ ankieta→czat→podsumowanie→wybór ścieżki.
		await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toBeVisible({
			timeout: 15_000,
		});
		await fillSurveyAndContinue(page);
		await expect(page.getByRole("heading", { name: /krok 2 z 3: rozmowa/i })).toBeVisible({
			timeout: 45_000,
		});
		await driveChatToSummaryCta(page);
		await page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i }).click();
		await expect(
			page
				.getByText(/Co rozumiem z naszej rozmowy/i)
				.or(page.getByText(/Przygotuję to za chwilę/i)),
		).toBeVisible({ timeout: 150_000 });
		await page
			.getByText(/Wybieram tę ścieżkę/i)
			.first()
			.click();
		await page.getByRole("button", { name: /Idź dalej do samooceny/i }).click();

		// Krok 1 — Profil (BEZ celu kariery — przeniesiony do Kroku 0, spec §3.2).
		// Etykiety NIE są powiązane (htmlFor) z polami, więc celujemy po placeholderze
		// (input) i po roli combobox (radix Select).
		await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible({
			timeout: 15_000,
		});
		// Kierunek studiów — input po placeholderze.
		await page.getByPlaceholder(/Informatyka, Zarządzanie/i).fill("Informatyka");
		// Radix Select: po #5 tylko combobox[0]=uczelnia, [1]=semestr (cel zniknął).
		await expect(page.getByRole("combobox")).toHaveCount(2);
		await page.getByRole("combobox").nth(0).click();
		await page.getByRole("option").first().click(); // uczelnia — pierwsza
		await page.getByRole("combobox").nth(1).click();
		await page.getByRole("option").first().click(); // semestr — pierwszy
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
		// Hub po redesignu nie ma sekcji „Twoje narzędzia" (dryf speca) —
		// stabilna kotwica: nawigacja kaflowa do Projektów.
		await expect(page.getByRole("link", { name: /Projekty/i }).first()).toBeVisible();
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
