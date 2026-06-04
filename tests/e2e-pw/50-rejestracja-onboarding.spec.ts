import { expect, type Page } from "@playwright/test";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite — Z5 (Quinn, Agent QA): ścieżka krytyczna #1 „Rejestracja → onboarding"
 * (skills/qa/SKILL.md §4). Pierwsza z 3 ścieżek krytycznych. Test POZYTYWNY (nie brama
 * błędu) — onboarding działa (B4 e2e dowodzi 1→4); Z5 dokłada to, czego brakuje:
 * REALNĄ REJESTRACJĘ (dziś bez e2e) + DOMKNIĘCIE onboardingu (krok 5 → dashboard).
 *
 * Struktura — dwa testy, bo krok 2 (Sylabus) WOŁA MODEL (POST /api/syllabus/parse) i
 * bez niego nie da się wejść na krok 3 (handleAnalyze → setStep(3)):
 *   A. Rejestracja → wejście w onboarding (krok 1 → 2) — BEZ AI, biega zawsze.
 *      Pokrywa: signup tworzy konto+sesję, nowy user trafia do onboardingu, krok Profil.
 *   B. Pełna ścieżka rejestracja → onboarding → dashboard — @llm (skip bez klucza,
 *      konwencja jak 10-b0 / 20-b1-b4). Pokrywa całą ścieżkę krytyczną end-to-end.
 *
 * Świeży e-mail per przebieg (rejestracja musi być unikalna) — bez kolizji, bez
 * sprzątania (baza testowa jest jednorazowa; akumulacja userów nieszkodliwa).
 */

const PASSWORD = "Test1234!e2e";

// Unikalny e-mail per przebieg. Date.now() w runtime Playwright (nie w workflow) — OK.
function uniqueEmail(tag: string): string {
	return `z5-${tag}-${Date.now()}@example.com`;
}

const SYLLABUS_TEXT =
	"Sylabus testowy E2E ścieżki krytycznej: analiza danych, statystyka opisowa, SQL, " +
	"Python, biblioteka pandas, wizualizacja danych, raportowanie wyników, podstawy " +
	"uczenia maszynowego, czyszczenie i przygotowanie danych. Treść ma min. 100 znaków.";

async function signup(page: Page, name: string, email: string): Promise<void> {
	await page.goto("/signup");
	// Etykiety signup SĄ powiązane (htmlFor) — celujemy po getByLabel.
	await page.getByLabel("Imię i nazwisko").fill(name);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Hasło").fill(PASSWORD);
	await page.getByRole("button", { name: /Utwórz konto/i }).click();
	// better-auth signUp.email tworzy sesję (autoSignIn); form pushuje /dashboard.
	// Czekamy aż opuścimy /signup (sesja ustawiona).
	await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 20_000 });
}

/** Krok 1 (Profil) → „Dalej" → krok 2. Wzorzec selektorów jak w 20-b1-b4. */
async function fillProfileStep1(page: Page): Promise<void> {
	await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible({
		timeout: 15_000,
	});
	await page.getByPlaceholder(/Informatyka, Zarządzanie/i).fill("Informatyka");
	// Radix Select: combobox[0]=uczelnia, [1]=semestr, [2]=cel kariery.
	await page.getByRole("combobox").nth(0).click();
	await page.getByRole("option").first().click();
	await page.getByRole("combobox").nth(1).click();
	await page.getByRole("option").first().click();
	await page.getByRole("combobox").nth(2).click();
	await page.getByRole("option", { name: /Data Analyst/i }).click();
	const dalej = page.getByRole("button", { name: /^Dalej$/ });
	await expect(dalej).toBeEnabled({ timeout: 10_000 });
	await dalej.click();
}

// ── A. Rejestracja → wejście w onboarding (bez AI — biega zawsze) ────────────────
test.describe("@dbwrite Z5 — rejestracja → onboarding: wejście (ścieżka krytyczna 1/3)", () => {
	test("nowa rejestracja → /onboarding → krok 1 (Profil) → krok 2 (Sylabus)", async ({ page }) => {
		test.setTimeout(60_000);
		await signup(page, "Z5 Entry User", uniqueEmail("entry"));

		// Nowy user (onboarding niedokończony) należy do /onboarding. Nawigujemy wprost
		// (robustnie wobec łańcucha redirectów /dashboard→/onboarding).
		await page.goto("/onboarding");
		await fillProfileStep1(page);

		// Krok 2 osiągnięty → rejestracja + profil + nawigacja wizardu działają.
		await expect(page.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeVisible();
	});
});

// ── B. Pełna ścieżka rejestracja → onboarding → dashboard (@llm) ─────────────────
test.describe("@dbwrite @llm Z5 — pełna ścieżka rejestracja → onboarding → dashboard", () => {
	// Krok 2 (Sylabus) woła model; krok 4 wymaga go pośrednio (osiągalny tylko przez
	// krok 2). Bez klucza po stronie serwera — skip (konwencja 10-b0 / 20-b1-b4).
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"Pełny onboarding wymaga LLM (serwer ANTHROPIC_API_KEY): krok 2 'Sylabus' woła model. " +
			"Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma klucz.",
	);

	test("rejestracja → profil → sylabus(AI) → kompetencje → samoocena → Profil gotowy → dashboard", async ({
		page,
	}) => {
		// Wizard woła model dwa razy (syllabus parse + Skill Map przy zapisie) — realne 15–60 s.
		test.setTimeout(240_000);
		await signup(page, "Z5 Full User", uniqueEmail("full"));
		await page.goto("/onboarding");
		await fillProfileStep1(page);

		// Krok 2 — sylabus tekstem (≥100 znaków) → analiza AI (krok 2→3).
		await expect(page.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeVisible();
		await page.getByPlaceholder(/Wklej tutaj treść sylabusa/i).fill(SYLLABUS_TEXT);
		await page.getByRole("button", { name: /Analizuj sylabus/i }).click();

		// Krok 3 — kompetencje (po AI). Zatwierdź (≥5 z analizy).
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible({
			timeout: 60_000,
		});
		await page.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }).click();

		// Krok 4 — samoocena (po zapisie + generacji Skill Map = drugie wołanie modelu).
		// Pomijamy ocenę („Oceń później" → krok 5) — pełną ocenę pokrywa 20-b1-b4 (B4).
		await expect(page.getByText(/To Twoja własna deklaracja, nie ocena/i)).toBeVisible({
			timeout: 90_000,
		});
		await page.getByRole("button", { name: /Oceń później/i }).click();

		// Krok 5 — Wnioski „Profil gotowy!" → dashboard.
		await expect(page.getByRole("heading", { name: /Profil gotowy/i })).toBeVisible({
			timeout: 15_000,
		});
		await page.getByRole("button", { name: /Przejdź do dashboardu/i }).click();
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.getByRole("heading", { name: /Cześć,/i })).toBeVisible({ timeout: 15_000 });
	});
});
