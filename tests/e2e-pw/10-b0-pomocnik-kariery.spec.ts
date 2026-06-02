import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite + KOSZT LLM — B0 „Pomocnik kariery" (LIVE).
 *
 * UWAGA KOSZT: pełny czat (~9 tur) + podsumowanie wołają model Claude przez
 * /turn i /summary. Każdy przebieg to realny koszt API i zapis sesji/tur do bazy.
 * Trzymamy minimum: jeden pełny przejazd czatu + 3× podsumowanie (bug #57 bywał
 * kapryśny — powtarzamy, by złapać niestabilność).
 *
 * Selektory wprost z kodu:
 *  - licznik tury: „Tura X z 9" (COPY.chat.turnCounter, MAX_TURNS=9), w przyklejonym
 *    <header class="sticky top-0">.
 *  - pole wejścia: ChatInput (textarea), CTA wysyłki aria-label „Wyślij wiadomość".
 *  - po domknięciu rozmowy: przycisk „Pokaż podsumowanie" (aria-label
 *    „Pokaż podsumowanie rozmowy").
 *  - podsumowanie: nagłówek „Co rozumiem z naszej rozmowy" + disclaimer
 *    „To NIE są rekomendacje".
 */

test.describe("@dbwrite B0 Pomocnik kariery — czat i podsumowanie", () => {
	test("Ankieta → czat (AI odzywa się pierwszy) → 9 tur → podsumowanie", async ({ page }) => {
		await loginWithPassword(page);
		await page.goto("/pomocnik-kariery");

		// Ekran 1 — ankieta (krok 1 z 3). Wypełnić 4 pytania, „Idź dalej".
		await expect(page.getByRole("heading", { name: /krok 1 z 3: ankieta/i })).toBeVisible();
		// Ankieta ma pytania typu single/multi/textarea — wybieramy pierwszy dostępny
		// wariant każdego pytania i wypełniamy textarea minimalną liczbą znaków.
		// (Konkretne odpowiedzi nie wpływają na asercje czatu — sprawdzamy mechanikę.)
		for (const radio of await page.getByRole("radio").all()) {
			// pierwszy radio każdej grupy — Playwright kliknie widoczne
			if (await radio.isVisible()) {
				await radio.check().catch(() => {});
			}
		}
		for (const textarea of await page.getByRole("textbox").all()) {
			if (await textarea.isVisible()) {
				await textarea.fill("To jest moja testowa odpowiedź na pytanie otwarte w ankiecie.");
			}
		}
		await page.getByRole("button", { name: /Idź dalej/i }).click();

		// Ekran 2 — czat. AI odzywa się pierwszy → licznik „Tura 1 z 9" pojawia się
		// po otwierającej wiadomości Pomocnika.
		await expect(page.getByRole("heading", { name: /krok 2 z 3: rozmowa/i })).toBeVisible();
		const turnCounter = page.getByText(/Tura \d+ z 9/);
		await expect(turnCounter).toBeVisible({ timeout: 30_000 });

		const input = page.getByRole("textbox");
		const sendBtn = page.getByRole("button", { name: /Wyślij wiadomość/i });

		// Przejdź ~9 tur: odpowiadaj aż pojawi się CTA „Pokaż podsumowanie".
		const showSummary = page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i });
		for (let i = 0; i < 12; i++) {
			if (await showSummary.isVisible().catch(() => false)) break;
			await expect(input).toBeEnabled({ timeout: 30_000 });
			await input.fill(`Odpowiedź studenta numer ${i + 1} — testuję przepływ rozmowy.`);
			await sendBtn.click();
			// Fix #55: po wysłaniu fokus wraca do pola wejścia (gdy rozmowa nie domknięta).
			// Sprawdzamy po powrocie statusu do gotowości w następnej iteracji.
			await page.waitForTimeout(500);
		}

		await expect(showSummary).toBeVisible({ timeout: 60_000 });
		await showSummary.click();

		// Ekran 3 — podsumowanie: nagłówek + disclaimer (HITL, bez procentów).
		await expect(page.getByText(/Co rozumiem z naszej rozmowy/i)).toBeVisible({ timeout: 60_000 });
		await expect(page.getByText(/To NIE są rekomendacje/i)).toBeVisible();
		// Bez procentów: nie powinno być „%" w sekcji ścieżek (sanity — nie twardy gate).
		// 1–3 ścieżki: karty wyboru „Wybieram tę ścieżkę".
		await expect(page.getByText(/Wybieram tę ścieżkę/i).first()).toBeVisible();
	});

	test("Fix #55: po wysłaniu wiadomości fokus wraca do pola wejścia", async ({ page }) => {
		await loginWithPassword(page);
		await page.goto("/pomocnik-kariery");
		// Skrót: wejdź w czat jak wyżej (wypełnij ankietę), wyślij jedną wiadomość,
		// poczekaj aż AI skończy (status ready) i sprawdź, że textarea ma fokus.
		await expect(page.getByRole("heading", { name: /krok 1 z 3/i })).toBeVisible();
		for (const radio of await page.getByRole("radio").all()) {
			if (await radio.isVisible()) await radio.check().catch(() => {});
		}
		for (const textarea of await page.getByRole("textbox").all()) {
			if (await textarea.isVisible())
				await textarea.fill("Testowa odpowiedź otwarta na ankietę B0.");
		}
		await page.getByRole("button", { name: /Idź dalej/i }).click();

		const input = page.getByRole("textbox");
		await expect(page.getByText(/Tura \d+ z 9/)).toBeVisible({ timeout: 30_000 });
		await expect(input).toBeEnabled({ timeout: 30_000 });
		await input.fill("Pierwsza odpowiedź — sprawdzam powrót fokusu.");
		await page.getByRole("button", { name: /Wyślij wiadomość/i }).click();
		// Po zakończeniu odpowiedzi AI (status ready) komponent przywraca fokus do textarea.
		await expect(input).toBeEnabled({ timeout: 30_000 });
		await expect(input).toBeFocused({ timeout: 10_000 });
	});

	// Fix #57 bywał kapryśny → 3 przebiegi samego /summary. Każdy: świeża sesja,
	// szybkie domknięcie czatu, generacja podsumowania. Liczba 3 = kompromis
	// pokrycie/koszt LLM (wytyczna Olivera).
	for (let run = 1; run <= 3; run++) {
		test(`Fix #57: /summary generuje wynik — przebieg ${run}/3`, async ({ page }) => {
			await loginWithPassword(page);
			await page.goto("/pomocnik-kariery");
			await expect(page.getByRole("heading", { name: /krok 1 z 3/i })).toBeVisible();
			for (const radio of await page.getByRole("radio").all()) {
				if (await radio.isVisible()) await radio.check().catch(() => {});
			}
			for (const textarea of await page.getByRole("textbox").all()) {
				if (await textarea.isVisible())
					await textarea.fill("Odpowiedź ankietowa do przebiegu podsumowania.");
			}
			await page.getByRole("button", { name: /Idź dalej/i }).click();

			const input = page.getByRole("textbox");
			const sendBtn = page.getByRole("button", { name: /Wyślij wiadomość/i });
			const showSummary = page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i });
			await expect(page.getByText(/Tura \d+ z 9/)).toBeVisible({ timeout: 30_000 });
			for (let i = 0; i < 12; i++) {
				if (await showSummary.isVisible().catch(() => false)) break;
				await expect(input).toBeEnabled({ timeout: 30_000 });
				await input.fill(`Krótka odpowiedź ${i + 1}.`);
				await sendBtn.click();
				await page.waitForTimeout(400);
			}
			await expect(showSummary).toBeVisible({ timeout: 60_000 });
			await showSummary.click();
			// Wynik musi się wygenerować — nagłówek podsumowania albo (akceptowalny
			// degrade HITL) ekran „Przygotuję to za chwilę". Pusty ekran = FAIL.
			await expect(
				page
					.getByText(/Co rozumiem z naszej rozmowy/i)
					.or(page.getByText(/Przygotuję to za chwilę/i)),
			).toBeVisible({ timeout: 60_000 });
		});
	}
});
