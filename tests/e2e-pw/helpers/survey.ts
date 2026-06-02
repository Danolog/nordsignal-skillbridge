import { expect, type Page } from "@playwright/test";

/**
 * Wypełnienie ankiety B0 (ekran 1, „krok 1 z 3") wg REALNEJ struktury pytań
 * (src/lib/career-helper/types.ts → SURVEY_QUESTIONS):
 *
 *   q1 single-choice  → <input type="radio">      (role=radio)
 *   q2 single-choice  → <input type="radio">      (role=radio)
 *   q3 multi-choice   → <input type="checkbox">   (role=checkbox), max 3
 *   q4 textarea       → <textarea>, minLength 10
 *
 * Dlaczego osobny helper (a nie „zaznacz wszystkie radio"):
 *  - poprzedni selektor klikał TYLKO role=radio i pomijał q3 (checkboxy) →
 *    przycisk „Idź dalej" zostawał disabled (allValid=false) → flaky timeout.
 *  - q3 ma cap maxSelections=3: klikanie wszystkich opcji nic nie da po 3.
 *  - q4 wymaga ≥10 znaków, inaczej walidacja blokuje wysyłkę.
 *
 * Helper jest deterministyczny i odporny na liczbę pytań (iteruje fieldset-y),
 * a na końcu ASERTUJE, że „Idź dalej" jest enabled — czyli ankieta naprawdę
 * przeszła walidację, zanim klikniemy dalej (twardy gate, nie best-effort).
 */
export async function fillSurveyAndContinue(page: Page): Promise<void> {
	await expect(page.getByRole("heading", { name: /krok 1 z 3: ankieta/i })).toBeVisible({
		timeout: 15_000,
	});

	// 1) Single-choice (radio): zaznacz pierwszy radio KAŻDEJ grupy radiogroup.
	//    Każde pytanie single-choice renderuje własny role=radiogroup.
	const radioGroups = page.getByRole("radiogroup");
	const rgCount = await radioGroups.count();
	for (let i = 0; i < rgCount; i++) {
		const firstRadio = radioGroups.nth(i).getByRole("radio").first();
		if (await firstRadio.count()) {
			await firstRadio.check();
		}
	}

	// 2) Multi-choice (checkbox): zaznacz dokładnie 1 (≥1 i ≤maxSelections=3
	//    wystarcza do walidacji). Bierzemy pierwszy widoczny checkbox.
	const checkboxes = page.getByRole("checkbox");
	const cbCount = await checkboxes.count();
	if (cbCount > 0) {
		await checkboxes.first().check();
	}

	// 3) Textarea: wpełnij ≥10 znaków w każdym widocznym textboxie typu textarea.
	//    (W ankiecie jest jeden — q4. Iterujemy defensywnie.)
	const textboxes = page.getByRole("textbox");
	const tbCount = await textboxes.count();
	for (let i = 0; i < tbCount; i++) {
		const tb = textboxes.nth(i);
		if (await tb.isVisible().catch(() => false)) {
			await tb.fill(
				"To jest moja testowa odpowiedź na pytanie otwarte w ankiecie B0 (≥10 znaków).",
			);
		}
	}

	// Twardy gate: walidacja musiała przejść, inaczej „Idź dalej" zostaje disabled.
	const cta = page.getByRole("button", { name: /Idź dalej/i });
	await expect(cta).toBeEnabled({ timeout: 10_000 });
	await cta.click();
}
