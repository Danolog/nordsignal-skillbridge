import type { Page } from "@playwright/test";

/**
 * Logowanie testowe e-mail/hasło dla przepływów @dbwrite.
 *
 * Wymaga konta testowego w BAZIE TESTOWEJ (nie prod!) — przekazanego przez env:
 *   E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 * Konto musi mieć już ukończony onboarding (rekord `students`), inaczej trasy
 * Bety przekierują na /onboarding zamiast pokazać funkcję. Seed: `pnpm db:seed`
 * na bazie testowej tworzy 15 studentów demo — użyj jednego z nich albo dodaj
 * dedykowane konto e-mail/hasło (better-auth signUp.email).
 */
export async function loginWithPassword(page: Page): Promise<void> {
	const email = process.env.E2E_TEST_EMAIL;
	const password = process.env.E2E_TEST_PASSWORD;
	if (!email || !password) {
		throw new Error(
			"Brak E2E_TEST_EMAIL / E2E_TEST_PASSWORD — ustaw poświadczenia konta testowego (baza testowa).",
		);
	}
	await page.goto("/login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Hasło").fill(password);
	await page.getByRole("button", { name: /Zaloguj się/i }).click();
	await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
}
