import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite — ścieżka krytyczna #1 „Rejestracja → onboarding → dashboard" po PRZEBUDOWIE
 * Partii 4 (onboarding na realnym rynku pracy). PRZEPISANE z wersji Z5 (przedstrumieniowej —
 * tamta szła przez Profil-z-celem + osobną Samoocenę; obie rzeczy zniknęły).
 *
 * NOWA SEKWENCJA (onboarding-wizard.tsx, 5 kroków 0..4):
 *   0 Cel kariery — Pomocnik LUB deterministyczny picker 23 ścieżek. Tu wybieramy z
 *     PICKERA (bez modelu) → Krok 0 przechodzi BEZ klucza API (Pomocnik = osobna ścieżka @llm).
 *   1 Profil — uczelnia/kierunek/semestr; cel kariery JUŻ NIE w tym kroku (przeniesiony do 0).
 *   2 Sylabus (opcjonalny) — można pominąć; ADNOTUJE katalog, nie generuje kompetencji.
 *   3 Kompetencje — z KATALOGU RYNKU; próg „min 5" ZNIESIONY (0 dozwolone, D5). Samoocena
 *     scalona tutaj (poziom przy kompetencji) — NIE ma osobnego kroku „Idź dalej".
 *   4 Wnioski „Profil gotowy" → POST /complete → dashboard.
 *
 * Dwa testy:
 *   A. Rejestracja → Krok 0 (picker) → Profil → Sylabus — BEZ AI, biega zawsze.
 *   B. Pełna ścieżka → dashboard — @llm (POST /onboarding generuje Skill Map modelem).
 *      Asercje TRWAŁEGO STANU: onboarding_completed=true + paszport utworzony. Liczba
 *      kompetencji NIE jest bramą (D5: 0 dozwolone) — asercja na paszport/domknięcie, nie ≥5.
 */

const PASSWORD = "Test1234!e2e";
const DATABASE_URL = process.env.DATABASE_URL ?? process.env.E2E_DATABASE_URL ?? "";
const CAREER_GOAL = "Data Analyst"; // jedna z 23 realnych ścieżek pickera (deterministyczna).

function uniqueEmail(tag: string): string {
	return `z5-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signup(page: Page, name: string, email: string): Promise<void> {
	await page.goto("/signup");
	await page.getByLabel("Imię i nazwisko").fill(name);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Hasło").fill(PASSWORD);
	await page.getByRole("button", { name: /Utwórz konto/i }).click();
	await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 20_000 });
	await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10_000 });
}

/**
 * Krok 0 — wybór celu z DETERMINISTYCZNEGO pickera (bez modelu). Klik karty ścieżki
 * (onCareerGoalChosen) → wizard ustawia careerGoal i przechodzi do Kroku 1 (Profil).
 * Picker jest pod nagłówkiem „Zacznijmy od celu" / dzielnikiem „lub wybierz z listy".
 */
async function pickCareerPathStep0(page: Page): Promise<void> {
	await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toBeVisible({
		timeout: 15_000,
	});
	await page.getByRole("button", { name: CAREER_GOAL, exact: true }).click();
	await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible({
		timeout: 15_000,
	});
	// Cel z Kroku 0 jest w pamięci (mikrokopia HITL na Profilu).
	await expect(page.getByText(/Twój cel kariery:/i)).toBeVisible();
}

/**
 * Krok 1 (Profil) → „Dalej" → krok 2 (Sylabus). Profil po przebudowie ma TYLKO 2 selecty
 * (uczelnia[0], semestr[1]) — cel kariery zniknął (Krok 0). WYMAGA wcześniejszego Kroku 0.
 */
async function fillProfileStep1(page: Page): Promise<void> {
	const combos = page.getByRole("combobox");
	await combos.nth(0).click();
	await page.getByRole("option").first().click();
	await page.getByPlaceholder(/Informatyka, Zarządzanie/i).fill("Informatyka");
	await combos.nth(1).click();
	await page.getByRole("option").first().click();
	// Anti-regresja: brak comboboxa celu kariery w Profilu (cel = Krok 0).
	await expect(combos).toHaveCount(2);
	const dalej = page.getByRole("button", { name: /^Dalej$/ });
	await expect(dalej).toBeEnabled({ timeout: 10_000 });
	await dalej.click();
}

// ── A. Rejestracja → Krok 0 (picker) → Profil → Sylabus (bez AI — biega zawsze) ──────
test.describe("@dbwrite Z5 — rejestracja → onboarding: wejście (ścieżka krytyczna 1/3)", () => {
	test("rejestracja → /onboarding → Krok 0 (picker) → Profil → Sylabus (opcjonalny)", async ({
		page,
	}) => {
		test.setTimeout(60_000);
		await signup(page, "Z5 Entry User", uniqueEmail("entry"));
		await page.goto("/onboarding");
		await pickCareerPathStep0(page);
		await fillProfileStep1(page);
		// Krok 2 — nagłówek po przebudowie: „Sylabus (opcjonalny)" (dawniej „Wgraj swój sylabus").
		await expect(page.getByRole("heading", { name: /Sylabus \(opcjonalny\)/i })).toBeVisible();
	});
});

// ── B. Pełna ścieżka rejestracja → onboarding → dashboard (@llm) ──────────────────────
test.describe("@dbwrite @llm Z5 — pełna ścieżka rejestracja → onboarding → dashboard", () => {
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"Domknięcie onboardingu woła model (POST /api/onboarding generuje Skill Map). " +
			"Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma ANTHROPIC_API_KEY.",
	);

	test("rejestracja → Krok 0 → Profil → pominięcie sylabusa → kompetencje → Wnioski → dashboard → trwały stan", async ({
		page,
	}) => {
		// Zatwierdzenie kroku 3 woła model (Skill Map) — realne 15–60 s.
		test.setTimeout(240_000);
		const email = uniqueEmail("full");
		await signup(page, "Z5 Full User", email);
		await page.goto("/onboarding");

		await pickCareerPathStep0(page);
		await fillProfileStep1(page);

		// Krok 2 — sylabus opcjonalny: pomijamy (katalog rynku dostajemy tak czy inaczej).
		await expect(page.getByRole("heading", { name: /Sylabus \(opcjonalny\)/i })).toBeVisible();
		await page.getByRole("button", { name: /Pomiń sylabus/i }).click();

		// Krok 3 — Kompetencje z katalogu rynku. Próg zniesiony (D5): zatwierdzamy bez wymogu
		// liczby (katalog może być pusty w e2e — wtedy 0% pokrycia, poprawny start juniora).
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible({
			timeout: 30_000,
		});
		const zatwierdz = page.getByRole("button", { name: /Zatwierdź i przejdź dalej/i });
		await expect(zatwierdz).toBeEnabled({ timeout: 15_000 });
		await zatwierdz.click();

		// Krok 4 — Wnioski „Profil gotowy!" → dashboard (POST /complete zapala onboardingCompleted).
		await expect(page.getByRole("heading", { name: /Profil gotowy/i })).toBeVisible({
			timeout: 90_000,
		});
		await page.getByRole("button", { name: /Przejdź do dashboardu/i }).click();
		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.getByRole("heading", { name: /Cześć,/i })).toBeVisible({ timeout: 15_000 });

		// ── DOMKNIĘCIE — trwały stan w bazie testowej (review Sophia: „ekrany się
		// przeklikały ≠ onboarding domknięty"). Czytamy realny zapisany stan, nie UI. ──
		const pool = new Pool({ connectionString: DATABASE_URL });
		try {
			const u = await pool.query<{ id: string }>('SELECT id FROM "user" WHERE email = $1', [email]);
			expect(u.rows.length).toBe(1);
			const userId = u.rows[0].id;

			const s = await pool.query<{ id: string; onboarding_completed: boolean }>(
				"SELECT id, onboarding_completed FROM students WHERE user_id = $1",
				[userId],
			);
			expect(s.rows.length).toBe(1);
			// Nowy user przestał być nowy — nie wpadnie z powrotem w redirect /dashboard→/onboarding.
			expect(s.rows[0].onboarding_completed).toBe(true);
			const studentId = s.rows[0].id;

			// Paszport utworzony — fundament ścieżek krytycznych #2/#3. Partia 4 (D5): liczba
			// kompetencji NIE jest bramą (0 dozwolone), więc asercja na paszport, nie na ≥5 komp.
			const p = await pool.query<{ n: number }>(
				"SELECT count(*)::int AS n FROM passports WHERE student_id = $1",
				[studentId],
			);
			expect(p.rows[0].n).toBeGreaterThanOrEqual(1);
		} finally {
			await pool.end();
		}
	});
});
