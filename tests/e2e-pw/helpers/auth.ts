import type { Page } from "@playwright/test";

/**
 * Logowanie testowe e-mail/hasło dla przepływów @dbwrite.
 *
 * DWA konta testowe (seed: tools/seed-e2e.ts), bo wymagania tras są SPRZECZNE:
 *  - B1/dashboard/projekty wymagają onboardingCompleted=TRUE (inaczej trasa
 *    przekierowuje na /onboarding).
 *  - B4 (samoocena w onboardingu) wymaga onboardingCompleted=FALSE (inaczej
 *    /onboarding przekierowuje na /dashboard).
 * Jeden student nie spełnia obu naraz → dwa konta.
 *
 * Konta i hasła przekazywane przez env (BAZA TESTOWA, nie prod!):
 *   E2E_TEST_EMAIL / E2E_TEST_PASSWORD        — student onboardingCompleted=TRUE
 *   E2E_TEST_EMAIL_B4 / E2E_TEST_PASSWORD_B4  — student onboardingCompleted=FALSE
 *
 * Konta tworzy seed-e2e.ts przez better-auth signUp.email (realny hash hasła) —
 * NIE ręcznym INSERT do account.password (better-auth liczy hash sam).
 */
type Account = "main" | "b4";

export async function loginWithPassword(page: Page, account: Account = "main"): Promise<void> {
	const email = account === "b4" ? process.env.E2E_TEST_EMAIL_B4 : process.env.E2E_TEST_EMAIL;
	const password =
		account === "b4" ? process.env.E2E_TEST_PASSWORD_B4 : process.env.E2E_TEST_PASSWORD;
	if (!email || !password) {
		throw new Error(
			`Brak poświadczeń konta testowego "${account}" — ustaw ` +
				(account === "b4"
					? "E2E_TEST_EMAIL_B4 / E2E_TEST_PASSWORD_B4"
					: "E2E_TEST_EMAIL / E2E_TEST_PASSWORD") +
				" (baza testowa).",
		);
	}
	await page.goto("/login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Hasło").fill(password);
	await page.getByRole("button", { name: /Zaloguj się/i }).click();
	await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
}
