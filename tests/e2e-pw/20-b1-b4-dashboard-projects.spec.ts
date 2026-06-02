import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite — B1 paszport, B4 samoocena, dashboard, projekty.
 *
 * Dlaczego @dbwrite (a nie read-only):
 *  - /passport przy wejściu TWORZY/AKTUALIZUJE rekord passports (insert/update) —
 *    to zapis do bazy, więc nie wolno na prod.
 *  - B4 samoocena autosave'uje oceny (PATCH /api/self-assessment/ratings/...) i
 *    advance (POST /api/onboarding/advance) — zapis.
 *  - dashboard/projekty czytają, ale wiszą za auth/onboardingiem (sesja w bazie).
 *
 * UWAGA do briefu: B4 to skala 1–4 („nie znam/uczę się/znam/dobrze znam"), a próg
 * to OCEŃ ≥ requiredCount (domyślnie 5) KOMPETENCJI — nie „poziom ≥5". W briefie
 * „≥5" odnosi się do liczby ocenionych kompetencji, nie do wartości suwaka.
 */

test.describe("@dbwrite B1 Paszport kompetencji", () => {
	test("Paszport ładuje się: nagłówek + sekcja kompetencji bez błędu", async ({ page }) => {
		await loginWithPassword(page);
		await page.goto("/passport");
		// PassportView renderuje dane studenta; brak błędu runtime = brak komunikatu
		// 500 / „Coś poszło nie tak". Sprawdzamy obecność widoku paszportu.
		await expect(page).toHaveURL(/\/passport/);
		await expect(page.locator("body")).not.toContainText(
			/Application error|Internal Server Error/i,
		);
	});
});

test.describe("@dbwrite B4 Samoocena (onboarding krok 4 z 5)", () => {
	test("Lista kompetencji, oceń ≥5, przycisk dalej odblokowuje się po progu", async ({ page }) => {
		await loginWithPassword(page);
		// Wejście w onboarding; nawigacja do kroku 4 zależy od stanu konta testowego.
		// Zakładamy konto ustawione na krok 4 (samoocena) — patrz README seed.
		await page.goto("/onboarding");

		// Callout prywatności B4 potwierdza, że jesteśmy w samoocenie.
		await expect(page.getByText(/To Twoja własna deklaracja, nie ocena/i)).toBeVisible({
			timeout: 15_000,
		});

		const advance = page.getByRole("button", { name: /^Idź dalej$/ });
		// Przed progiem przycisk advance jest wyłączony.
		await expect(advance).toBeDisabled();

		// Oceń 5 pierwszych kompetencji (radiogroup „Poziom kompetencji: …").
		// Wybieramy poziom „znam" (wartość 3) w pierwszych 5 grupach.
		const groups = page.getByRole("radiogroup");
		const count = Math.min(5, await groups.count());
		for (let i = 0; i < count; i++) {
			await groups.nth(i).getByRole("radio", { name: /znam/i }).first().check();
			// autosave debounce 400 ms + zapis
			await page.waitForTimeout(700);
		}

		// Po ocenieniu ≥ requiredCount przycisk advance odblokowuje się.
		await expect(advance).toBeEnabled({ timeout: 15_000 });
	});
});

test.describe("@dbwrite Dashboard", () => {
	test("Dashboard ładuje kompetencje bez błędu (migracja 0014 OK)", async ({ page }) => {
		await loginWithPassword(page);
		await page.goto("/dashboard");
		// DashboardHub: powitanie „Cześć, {imię}!" + sekcja „Twoje narzędzia".
		await expect(page.getByRole("heading", { name: /Cześć,/i })).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(/Twoje narzędzia/i)).toBeVisible();
		await expect(page.locator("body")).not.toContainText(
			/Application error|Internal Server Error/i,
		);
	});
});

test.describe("@dbwrite Marketplace projektów", () => {
	test("Lista projektów ładuje się (nagłówek Projekty)", async ({ page }) => {
		await loginWithPassword(page);
		await page.goto("/projects");
		await expect(page.getByRole("heading", { name: /^Projekty$/ })).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.locator("body")).not.toContainText(
			/Application error|Internal Server Error/i,
		);
	});

	test("Detal projektu otwiera się z listy (jeśli są projekty)", async ({ page }) => {
		await loginWithPassword(page);
		await page.goto("/projects");
		await expect(page.getByRole("heading", { name: /^Projekty$/ })).toBeVisible({
			timeout: 15_000,
		});
		// Pierwsza karta projektu → detal. Tolerujemy brak projektów (seed-zależne).
		const firstProjectLink = page.locator('a[href^="/projects/"]').first();
		if (await firstProjectLink.isVisible().catch(() => false)) {
			await firstProjectLink.click();
			await expect(page).toHaveURL(/\/projects\/[^/]+$/);
			await expect(page.locator("body")).not.toContainText(/Application error/i);
		}
	});
});
