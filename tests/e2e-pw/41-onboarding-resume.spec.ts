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
 * PARTIA 4 (przebudowa): krok 3 (Kompetencje) NIE ma już inputów nazw — to wybór z
 * KATALOGU RYNKU z poziomem (catalog dociągany na wejściu). Dlatego ten test dowodzi
 * SEKWENCJI wznowienia (właściwy krok + pasek + trwałość), a hydratację poziomów wyboru
 * (selections→przyciski) pokrywa unit (onboarding-wizard-resume.test.tsx z mockiem katalogu).
 * Krok „Samoocena" scalony w krok 3 — w pasku 5 kroków ostatni to „Krok 5: Wnioski".
 *
 * STRUKTURA:
 *   1. Wznowienie: login → /onboarding → render od kroku 3 (Kompetencje) z bazy,
 *      NIE od Kroku 0. Dowodzi hydratacji initialStep/initialData (page.tsx → wizard).
 *   2. Pasek kroków klikalny: skok do kroku 1 (Profil, osiągnięty) pokazuje zapisany profil;
 *      krok 5 (Wnioski, nieosiągnięty z step=3) zablokowany.
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

		// 2. PASEK KLIKALNY — skok do Profilu (krok 1, osiągnięty: num <= maxReached=3).
		await page.getByRole("button", { name: /^Krok 2: Profil$/i }).click();
		await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible();
		// Profil z bazy odtworzony (kierunek z seed: „Informatyka").
		await expect(page.getByPlaceholder(/np\. Informatyka/i)).toHaveValue("Informatyka");
		// Krok nieosiągnięty (Wnioski, num=4 > maxReached=3) — zablokowany. Partia 4: ostatni
		// krok paska to „Krok 5: Wnioski" (samoocena scalona w krok 3, nie ma osobnego kroku).
		await expect(
			page.getByRole("button", { name: /Krok 5: Wnioski \(jeszcze niedostępny\)/i }),
		).toBeDisabled();

		// 3. TRWAŁOŚĆ PO RELOAD — wracamy na /onboarding, kreator wznawia od kroku 3
		//    (onboarding_step=3 w bazie nie cofnął się przez skok wstecz na pasku).
		await page.reload();
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible({
			timeout: 15_000,
		});
		// Wznowienie wróciło na krok 3 (a nie Krok 0 / Profil) — sekwencja trwała.
		await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toHaveCount(0);
	});
});
