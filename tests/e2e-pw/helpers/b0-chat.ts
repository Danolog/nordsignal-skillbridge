import { expect, type Page } from "@playwright/test";

/**
 * Przejazd rozmowy B0 aż do CTA „Pokaż podsumowanie".
 *
 * Mechanika (z src/components/career-helper/chat-screen.tsx):
 *  - Licznik „Tura X z 9" rośnie, gdy AI zada pytanie. Pole wejścia jest
 *    DISABLED w trakcie streamingu odpowiedzi AI (status submitted/streaming).
 *  - Rozmowa domyka się dopiero, gdy student odpowie na 9. pytanie AI → /turn
 *    zwraca {final:true} → pojawia się CTA „Pokaż podsumowanie" (pole znika).
 *  - Trzeba więc wysłać ~9 wiadomości (jedna na pytanie AI), za każdym razem
 *    czekając, aż pole + przycisk wysyłki wrócą do stanu gotowości.
 *
 * Pętla jest odporna: przed każdym wysłaniem czeka na ENABLED i pola, i przycisku
 * „Wyślij wiadomość" (nie tylko pola), a po wysłaniu czeka na ponowną gotowość.
 * Limit 14 iteracji = bufor nad 9 turami. Zwraca, gdy CTA widoczne.
 */
export async function driveChatToSummaryCta(page: Page): Promise<void> {
	const input = page.getByRole("textbox");
	const sendBtn = page.getByRole("button", { name: /Wyślij wiadomość/i });
	const showSummary = page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i });

	// Tura otwierająca AI musi się pojawić (pierwsze pytanie).
	await expect(page.getByText(/Tura \d+ z 9/)).toBeVisible({ timeout: 45_000 });

	for (let i = 0; i < 14; i++) {
		if (await showSummary.isVisible().catch(() => false)) return;

		// Czekaj, aż AI skończy streaming poprzedniej odpowiedzi: POLE wraca do
		// ENABLED (przycisk „Wyślij" jest disabled DOPÓKI pole jest puste — włącza
		// się dopiero po wpisaniu tekstu, więc nie czekamy na niego przed fill).
		try {
			await expect(input).toBeEnabled({ timeout: 60_000 });
		} catch {
			// Mogło właśnie domknąć rozmowę (pole znika, CTA wchodzi) — sprawdź.
			if (await showSummary.isVisible().catch(() => false)) return;
			throw new Error(`B0 chat: pole nie wróciło do gotowości (iteracja ${i}).`);
		}

		await input.fill(`Odpowiedź studenta ${i + 1} — testuję przepływ rozmowy B0.`);
		// Po wpisaniu tekstu przycisk „Wyślij" włącza się (canSend = !disabled && niepuste).
		await expect(sendBtn).toBeEnabled({ timeout: 10_000 });
		await sendBtn.click();
		// Daj UI chwilę na przejście w streaming zanim sprawdzimy CTA w następnej iteracji.
		await page.waitForTimeout(300);
	}

	// Po pętli CTA musi być widoczne — inaczej rozmowa nie domknęła się w budżecie.
	await expect(showSummary).toBeVisible({ timeout: 60_000 });
}
