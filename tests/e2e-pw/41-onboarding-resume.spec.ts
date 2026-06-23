import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite — Fala B (front): trwały zapis postępu onboardingu + wznawianie.
 *
 * Para do testów integracyjnych/unit fali A+B: tu KLIENT na żywo (login → /onboarding →
 * wznowienie od onboarding_step z danymi → autosave → reload → nadal na właściwym kroku).
 * Styk serwer/baza pokrywają testy integracyjne PATCH /progress + POST /onboarding.
 *
 * BEZ @llm (kluczowe — luka CI @llm, klucz serwerowy = czerwona linia): zaczynamy ZA
 * Krokiem 0 (Pomocnik). Konto „resume" ma careerGoal≠"" + onboardingStep=3 +
 * onboardingCompleted=false, więc wejście /onboarding wznawia kreator od kroku 3
 * (Kompetencje) — ścieżka NIE woła modelu. Krok 0 (Pomocnik) i krok 2 (analiza sylabusa)
 * to jedyne segmenty wymagające modelu — tu ich nie dotykamy.
 *
 * Seed: tools/seed-e2e.ts → student „resume" (E2E_TEST_EMAIL_RESUME / ...).
 *
 * STRUKTURA:
 *   1. Wznowienie: login → /onboarding → render od kroku 3 (Kompetencje) z danymi z bazy,
 *      NIE od Kroku 0. Dowodzi hydratacji initialStep/initialData (page.tsx → wizard).
 *   2. Pasek kroków klikalny: skok do kroku 1 (Profil, osiągnięty) pokazuje zapisany profil;
 *      krok 4/5 (nieosiągnięte z step=3) zablokowane.
 *   3. Trwałość po reload: skok do Profilu → reload → kreator nadal wznawia od kroku 3
 *      (high-water-mark z bazy nie cofa się; onboarding_step trwały).
 */

test.describe("@dbwrite Onboarding — wznawianie postępu (fala B, bez @llm)", () => {
	test("wznawia od kroku 3 (Kompetencje) z danymi; pasek klikalny; trwałość po reload", async ({
		page,
	}) => {
		test.setTimeout(60_000);

		await loginWithPassword(page, "resume");
		await page.goto("/onboarding");

		// 1. WZNOWIENIE od kroku 3 (Kompetencje) — NIE Krok 0 (Pomocnik) ani Profil.
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible({
			timeout: 15_000,
		});
		// Pomocnik (Krok 0) NIE jest renderowany — wznowienie omija go (careerGoal≠"").
		await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toHaveCount(0);
		// Kompetencje z bazy wczytane do inputów (seed COMPETENCIES_RESUME, 5 pozycji).
		const compInputs = page.getByPlaceholder("Nazwa kompetencji...");
		await expect(compInputs).toHaveCount(5);
		// Pierwsza i czwarta wartość z seed (Python, Statystyka) — dowód hydratacji danych.
		await expect(compInputs.nth(0)).toHaveValue("Python");
		await expect(compInputs.nth(3)).toHaveValue("Statystyka");

		// 2. PASEK KLIKALNY — skok do Profilu (krok 1, osiągnięty: num <= maxReached=3).
		await page.getByRole("button", { name: /^Krok 2: Profil$/i }).click();
		await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible();
		// Profil z bazy odtworzony (kierunek z seed: „Informatyka").
		await expect(page.getByPlaceholder(/np\. Informatyka/i)).toHaveValue("Informatyka");
		// Krok nieosiągnięty (Samoocena, num=4 > maxReached=3) — zablokowany.
		await expect(
			page.getByRole("button", { name: /Krok 5: Samoocena \(jeszcze niedostępny\)/i }),
		).toBeDisabled();

		// 3. TRWAŁOŚĆ PO RELOAD — wracamy na /onboarding, kreator wznawia od kroku 3
		//    (onboarding_step=3 w bazie nie cofnął się przez skok wstecz na pasku).
		await page.reload();
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.locator('input[value="Python"]')).toBeVisible();
	});
});
