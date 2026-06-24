import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite — Z5 (Quinn, Agent QA): ścieżka krytyczna #1 „Rejestracja → onboarding"
 * (skills/qa/SKILL.md §4). Pierwsza z 3 ścieżek krytycznych. Test POZYTYWNY (nie brama
 * błędu) — onboarding działa; Z5 dokłada to, czego brakuje: REALNĄ REJESTRACJĘ (dziś bez
 * e2e) + DOMKNIĘCIE onboardingu (krok 5 → dashboard) z dowodem TRWAŁEGO STANU.
 *
 * Dwa testy, bo krok 2 (Sylabus) WOŁA MODEL (POST /api/syllabus/parse) i bez niego nie
 * da się wejść na krok 3 (handleAnalyze → setStep(3), onboarding-wizard.tsx):
 *   A. Rejestracja → wejście w onboarding (krok 1 → 2) — BEZ AI, biega zawsze.
 *   B. Pełna ścieżka rejestracja → … → dashboard — @llm (skip bez klucza, konwencja
 *      10-b0 / 20-b1-b4). Z REALNĄ SAMOOCENĄ + asercjami trwałego stanu.
 *
 * NIETRWAŁOŚĆ (review Sophia): ta sekwencja jest sprzed strumienia E. Plan poprawek
 * przebuduje onboarding — Krok 0 „Pomocnik kariery" jako pierwszy krok, cel kariery
 * ZNIKA z kroku „Profil" (pochodzi z pomocnika), źródło kompetencji = analiza rynku
 * (sylabus → adnotacja). Po strumieniu E ten test wymaga PRZEPISANIA (nowa sekwencja),
 * nie dostrojenia selektorów. Nie traktować jako trwałej specyfikacji docelowego onboardingu.
 *
 * SAMOOCENA (review Sophia, G4): realna ocena (≥requiredCount) jest CZĘŚCIĄ ścieżki
 * krytycznej #1 — to jedyny człon, gdzie ocenia CZŁOWIEK (student), nie AI (human-in-the-loop,
 * wiarygodność paszportu). Test B ocenia realnie; wariant „Oceń później" (onSkip) pokryty
 * w 20-b1-b4 nie jest (B4 testuje komponent w izolacji na seedzie) — tu pełny przepływ
 * rejestracja→ocena→domknięcie.
 *
 * §4 a „z PDF" (review Sophia/Leo): §4 literalnie pisze „sylabus z PDF". Tu wejście TEKSTOWE
 * (PDF = błąd #2, pokryty w Z2). Po naprawie strumienia C uspójnić §4 z wariantem PDF.
 *
 * L1 (review Leo, → Ethan/G3): segment @llm (krok 3→5) NIE biega w CI bez klucza serwerowego
 * → ścieżka #1 w domyślnym CI pokryta tylko 1→2. Decyzja topologii CI (job e2e-llm z kluczem
 * albo świadoma akceptacja) = Ethan; nazwane w handoffie + ticket. Próg: przed go-live Bety.
 */

const PASSWORD = "Test1234!e2e";
const DATABASE_URL = process.env.DATABASE_URL ?? process.env.E2E_DATABASE_URL ?? "";

// Unikalny e-mail per przebieg + entropia (L2: hedge na równoległe workery w tej samej ms).
function uniqueEmail(tag: string): string {
	return `z5-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const SYLLABUS_TEXT =
	"Sylabus testowy E2E ścieżki krytycznej: analiza danych, statystyka opisowa, SQL, " +
	"Python, biblioteka pandas, wizualizacja danych, raportowanie wyników, podstawy " +
	"uczenia maszynowego, czyszczenie i przygotowanie danych. Treść ma min. 100 znaków.";

async function signup(page: Page, name: string, email: string): Promise<void> {
	await page.goto("/signup");
	// Etykiety signup SĄ powiązane (htmlFor → id) — getByLabel solidne (signup-form.tsx).
	await page.getByLabel("Imię i nazwisko").fill(name);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Hasło").fill(PASSWORD);
	await page.getByRole("button", { name: /Utwórz konto/i }).click();
	// better-auth signUp.email tworzy sesję (autoSignIn); form pushuje /dashboard.
	await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 20_000 });
	// L5: pozytywny dowód, że konto+sesja powstały (a nie zostaliśmy gdzieś indziej),
	// zanim ruszymy do onboardingu — czytelny fail zamiast późniejszego timeoutu.
	await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10_000 });
}

/**
 * Krok 1 (Profil) → „Dalej" → krok 2. Selektory pozycyjne comboboxów (L3): Radix Select
 * nie eksponuje htmlFor, więc celujemy po kolejności (uczelnia0/semestr1/cel2) — spójnie
 * z 20-b1-b4. Cel kariery kotwiczymy DODATKOWO po nazwie opcji „Data Analyst" (gdyby
 * kolumny się przestawiły, opcja nie istnieje → głośny fail, nie ciche złe pole).
 */
async function fillProfileStep1(page: Page): Promise<void> {
	await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible({
		timeout: 15_000,
	});
	await page.getByPlaceholder(/Informatyka, Zarządzanie/i).fill("Informatyka");
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
		await page.goto("/onboarding");
		await fillProfileStep1(page);
		await expect(page.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeVisible();
	});
});

// ── B. Pełna ścieżka rejestracja → onboarding → dashboard (@llm) ─────────────────
test.describe("@dbwrite @llm Z5 — pełna ścieżka rejestracja → onboarding → dashboard", () => {
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"Pełny onboarding wymaga LLM (serwer ANTHROPIC_API_KEY): krok 2 'Sylabus' woła model. " +
			"Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma klucz.",
	);

	test("rejestracja → sylabus(AI) → kompetencje → SAMOOCENA → Profil gotowy → dashboard → trwały stan", async ({
		page,
	}) => {
		// Wizard woła model dwa razy (syllabus parse + Skill Map przy zapisie) — realne 15–60 s.
		test.setTimeout(240_000);
		const email = uniqueEmail("full");
		await signup(page, "Z5 Full User", email);
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

		// Krok 4 — REALNA samoocena (review Sophia): oceń ≥requiredCount kompetencji,
		// autosave PATCH zapisuje, „Idź dalej" odblokowuje się po progu. To człon
		// human-in-the-loop ścieżki #1 — nie „Oceń później".
		await expect(page.getByText(/To Twoja własna deklaracja, nie ocena/i)).toBeVisible({
			timeout: 90_000,
		});
		const advance = page.getByRole("button", { name: /^Idź dalej$/ });
		await expect(advance).toBeDisabled();
		const groups = page.getByRole("radiogroup");
		const count = Math.min(5, await groups.count());
		for (let i = 0; i < count; i++) {
			await groups.nth(i).getByRole("radio", { name: /^znam/i }).first().check({ force: true });
			await page.waitForTimeout(700); // autosave debounce 400 ms + zapis
		}
		await expect(advance).toBeEnabled({ timeout: 15_000 });
		await advance.click();

		// Krok 5 — Wnioski „Profil gotowy!" → dashboard.
		await expect(page.getByRole("heading", { name: /Profil gotowy/i })).toBeVisible({
			timeout: 15_000,
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

			// Kompetencje zapisane (źródło paszportu) + samoocena zapisana (≥próg).
			const comps = await pool.query<{ n: number; rated: number }>(
				"SELECT count(*)::int AS n, count(self_assessment)::int AS rated FROM competencies WHERE student_id = $1",
				[studentId],
			);
			expect(comps.rows[0].n).toBeGreaterThanOrEqual(5);
			expect(comps.rows[0].rated).toBeGreaterThanOrEqual(count);

			// Paszport utworzony — fundament ścieżek krytycznych #2/#3.
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
