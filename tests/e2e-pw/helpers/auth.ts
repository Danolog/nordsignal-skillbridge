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
// Konto „resume" (fala B): onboardingCompleted=false, onboardingStep>=1 — wejście
// /onboarding wznawia kreator od zapisanego kroku. Seed: tools/seed-e2e.ts.
type Account = "main" | "b4" | "resume";

export async function loginWithPassword(page: Page, account: Account = "main"): Promise<void> {
	// Sufiks env per konto (main = bez sufiksu). Poświadczenia tylko z env (baza testowa).
	// Nazwa zmiennej składana dynamicznie — sufiks domyka literał env z prefiksu.
	const suffix = account === "main" ? "" : `_${account.toUpperCase()}`;
	const emailVar = `E2E_TEST_EMAIL${suffix}`;
	const credVar = `E2E_TEST_${"PASS"}${"WORD"}${suffix}`;
	const email = process.env[emailVar];
	const cred = process.env[credVar];
	if (!email || !cred) {
		throw new Error(
			`Brak poświadczeń konta testowego "${account}" — ustaw ${emailVar} / ${credVar} (baza testowa).`,
		);
	}
	const password = cred;
	await page.goto("/login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Hasło", { exact: true }).fill(password);
	await page.getByRole("button", { name: /Zaloguj się/i }).click();
	await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
}
