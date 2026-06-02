import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { driveChatToSummaryCta } from "./helpers/b0-chat";
import { dbWriteTest as test } from "./helpers/guards";
import { fillSurveyAndContinue } from "./helpers/survey";

/**
 * @dbwrite + KOSZT LLM — B0 „Pomocnik kariery" (LIVE).
 *
 * UWAGA KOSZT: pełny czat (~9 tur) + podsumowanie wołają model Claude przez
 * /turn i /summary. Każdy przebieg to realny koszt API i zapis sesji/tur do bazy.
 * Trzymamy minimum: jeden pełny przejazd czatu + 1 test fokusu + 3× podsumowanie
 * (bug #57 bywał kapryśny — powtarzamy, by złapać niestabilność).
 *
 * Mechanika i selektory wprost z kodu:
 *  - ankieta (krok 1 z 3): helper fillSurveyAndContinue (q1/q2 radio, q3 checkbox
 *    max 3, q4 textarea ≥10 znaków) — asertuje „Idź dalej" enabled.
 *  - czat: helper driveChatToSummaryCta — odpowiada aż do CTA „Pokaż podsumowanie"
 *    (pole DISABLED w trakcie streamingu; rozmowa domyka się po 9. pytaniu AI).
 *  - podsumowanie: nagłówek „Co rozumiem z naszej rozmowy" + disclaimer „To NIE są
 *    rekomendacje"; karty „Wybieram tę ścieżkę".
 *
 * Konto: "main" (onboardingCompleted=TRUE). B0 wymaga tylko zalogowanego studenta.
 * Czas: każdy pełny przejazd to ~9 wywołań modelu — podnosimy budżet testu.
 */

test.describe("@dbwrite @llm B0 Pomocnik kariery — czat i podsumowanie", () => {
	// B0 czat i podsumowanie wołają model. Serwer musi mieć ANTHROPIC_API_KEY.
	// Sygnalizujemy to flagą E2E_LLM_AVAILABLE=1 (klucz po stronie serwera, nie
	// w transkrypcie Playwright) lub obecnością klucza w procesie Playwright.
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"B0 wymaga LLM (serwer musi mieć ANTHROPIC_API_KEY). Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma klucz.",
	);

	test("Ankieta → czat (AI odzywa się pierwszy) → 9 tur → podsumowanie", async ({ page }) => {
		test.setTimeout(240_000);
		await loginWithPassword(page);
		await page.goto("/pomocnik-kariery");

		await fillSurveyAndContinue(page);

		// Ekran 2 — czat.
		await expect(page.getByRole("heading", { name: /krok 2 z 3: rozmowa/i })).toBeVisible();
		await driveChatToSummaryCta(page);

		await page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i }).click();

		// Ekran 3 — podsumowanie. Backend ma DWA dozwolone warianty (kontrakt
		// SummaryResponse): judged:true → pełne podsumowanie „Co rozumiem z naszej
		// rozmowy"; judged:false (warstwa 4 oceny nie przeszła) → akceptowalny
		// degrade HITL „Przygotuję to za chwilę". Oba pokazują karty wyboru ścieżki.
		// Pusty/błędny ekran = FAIL; którykolwiek z dwóch wariantów = PASS.
		// /summary woła model i bywa wolne (do ~64 s) → budżet 150 s (sedno bug #57).
		await expect(
			page
				.getByText(/Co rozumiem z naszej rozmowy/i)
				.or(page.getByText(/Przygotuję to za chwilę/i)),
		).toBeVisible({ timeout: 150_000 });
		// 1–3 ścieżki: karty wyboru „Wybieram tę ścieżkę" muszą się pojawić w obu wariantach.
		await expect(page.getByText(/Wybieram tę ścieżkę/i).first()).toBeVisible({ timeout: 60_000 });
	});

	test("Fix #55: po wysłaniu wiadomości fokus wraca do pola wejścia", async ({ page }) => {
		test.setTimeout(120_000);
		await loginWithPassword(page);
		await page.goto("/pomocnik-kariery");
		await fillSurveyAndContinue(page);

		const input = page.getByRole("textbox");
		await expect(page.getByText(/Tura \d+ z 9/)).toBeVisible({ timeout: 45_000 });
		await expect(input).toBeEnabled({ timeout: 45_000 });
		await input.fill("Pierwsza odpowiedź — sprawdzam powrót fokusu.");
		await page.getByRole("button", { name: /Wyślij wiadomość/i }).click();
		// Po zakończeniu odpowiedzi AI (status ready) komponent przywraca fokus do textarea.
		await expect(input).toBeEnabled({ timeout: 45_000 });
		await expect(input).toBeFocused({ timeout: 10_000 });
	});

	// Fix #57 bywał kapryśny → 3 przebiegi samego /summary. Każdy: świeża sesja,
	// domknięcie czatu, generacja podsumowania. 3 = kompromis pokrycie/koszt LLM.
	for (let run = 1; run <= 3; run++) {
		test(`Fix #57: /summary generuje wynik — przebieg ${run}/3`, async ({ page }) => {
			test.setTimeout(180_000);
			await loginWithPassword(page);
			await page.goto("/pomocnik-kariery");
			await fillSurveyAndContinue(page);

			await driveChatToSummaryCta(page);
			await page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i }).click();

			// Wynik musi się wygenerować — nagłówek podsumowania albo (akceptowalny
			// degrade HITL) ekran „Przygotuję to za chwilę". Pusty ekran = FAIL.
			// /summary woła model i bywa wolne (zaobserwowane do ~64 s) → budżet 150 s,
			// żeby smoke nie był flaky na samej latencji LLM (to był sedno bug #57).
			await expect(
				page
					.getByText(/Co rozumiem z naszej rozmowy/i)
					.or(page.getByText(/Przygotuję to za chwilę/i)),
			).toBeVisible({ timeout: 150_000 });
		});
	}
});
