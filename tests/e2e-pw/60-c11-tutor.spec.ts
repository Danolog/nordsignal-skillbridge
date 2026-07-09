import { expect } from "@playwright/test";
import { Client } from "pg";
import { loginWithPassword } from "./helpers/auth";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite @llm — C11/1.14: panel czatu tutora sokratycznego w widoku projektu.
 *
 * DoD roadmapy: „Panel czatu w widoku projektu (E2E; licznik kosztu rośnie)".
 * Dowód licznika: liczba wierszy `ai_usage_ledger` w scope 'project-tutor%'
 * PRZED i PO turze — tura = generacja (Sonnet) + sędzia (Haiku), więc przyrost
 * ≥ 2 wierszy. Wymaga DB (E2E_DATABASE_URL / DATABASE_URL — baza testowa).
 *
 * Wymagania środowiska (poza E2E_ALLOW_DB_WRITES=1 z guards):
 *  - serwer dev musi mieć FLAG_SOCRATIC_TUTOR=1 (inaczej panel nie istnieje)
 *    — sygnalizowane E2E_TUTOR_FLAG=1 w procesie Playwright,
 *  - serwer musi mieć ANTHROPIC_API_KEY (żywe modele) — jak B4:
 *    E2E_LLM_AVAILABLE=1 albo klucz w procesie Playwright.
 */

const DB_URL = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DB_URL);

async function countTutorLedgerRows(): Promise<number> {
	const client = new Client({ connectionString: DB_URL });
	await client.connect();
	try {
		const res = await client.query(
			"SELECT count(*)::int AS c FROM ai_usage_ledger WHERE scope LIKE 'project-tutor%'",
		);
		return res.rows[0].c as number;
	} finally {
		await client.end();
	}
}

test.describe("@dbwrite @llm C11 Tutor sokratyczny (panel w widoku projektu)", () => {
	test.skip(
		process.env.E2E_TUTOR_FLAG !== "1",
		"Tutor za flagą: ustaw E2E_TUTOR_FLAG=1, gdy serwer dev ma FLAG_SOCRATIC_TUTOR=1.",
	);
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"Tura tutora woła żywe modele (Sonnet + sędzia Haiku) — serwer musi mieć ANTHROPIC_API_KEY.",
	);
	test.skip(
		!isLocalTestDb,
		"Dowód wzrostu licznika kosztu czyta ai_usage_ledger — wskaż bazę testową w E2E_DATABASE_URL.",
	);

	test("student pyta tutora → odpowiedź sokratyczna w panelu, licznik kosztu w ledgerze rośnie", async ({
		page,
	}) => {
		// Tura = generacja + sędzia (typowo 10–25 s) + rehydracja i nawigacja.
		test.setTimeout(120_000);

		const ledgerBefore = await countTutorLedgerRows();

		await loginWithPassword(page, "main");
		await page.goto("/projects");
		const firstProjectLink = page.locator('a[href^="/projects/"]').first();
		await firstProjectLink.click();
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);

		// Panel istnieje (flaga ON po stronie serwera) i deklaruje zasadę HITL.
		await expect(page.getByRole("heading", { name: "Tutor projektu" })).toBeVisible();
		await expect(page.getByText("nie podaje gotowych rozwiązań")).toBeVisible();

		const input = page.getByRole("textbox", { name: "Wiadomość do tutora" });
		await input.fill("Utknąłem na starcie — od czego zacząć ten projekt?");
		await page.getByRole("button", { name: "Wyślij wiadomość do tutora" }).click();

		// Dymek studenta pojawia się natychmiast (optymistycznie).
		await expect(
			page.locator(".tutor-msg-user").getByText("Utknąłem na starcie", { exact: false }),
		).toBeVisible();

		// Odpowiedź tutora (blokująco: generacja + sędzia) — czekamy do 90 s.
		const aiBubble = page.locator(".tutor-msg-ai .tutor-msg-content").last();
		await expect(aiBubble).toBeVisible({ timeout: 90_000 });
		await expect(aiBubble).not.toContainText("Tutor myśli", { timeout: 90_000 });
		const replyText = (await aiBubble.textContent()) ?? "";
		expect(replyText.trim().length).toBeGreaterThan(20);

		// Licznik zużycia w panelu podbity (x/30 odpowiedzi).
		await expect(page.getByText(/\d+\/\d+ odpowiedzi/)).toBeVisible();

		// DoD: licznik KOSZTU rośnie — tura zapisała ≥2 wiersze ledgera
		// (project-tutor.turn + project-tutor.judge; ewentualna regeneracja = więcej).
		const ledgerAfter = await countTutorLedgerRows();
		expect(ledgerAfter).toBeGreaterThanOrEqual(ledgerBefore + 2);

		// Rehydracja: odświeżenie strony odtwarza rozmowę z bazy (tutor_turns).
		await page.reload();
		await expect(
			page.locator(".tutor-msg-user").getByText("Utknąłem na starcie", { exact: false }),
		).toBeVisible();
	});
});
