import { expect, type Page } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite B5 — Refleksja po projekcie (smoke E2E pełny).
 *
 * Dokończony 2026-06-18 (zalążek: smoke 2026-06-02). Wymóg z TODO domknięty:
 * seed `tools/seed-e2e.ts` tworzy DRUGI projekt `e2e-projekt-zaakceptowany` ze
 * zgłoszeniem 'verified' studenta "main" — bo callout refleksji wyzwala się tylko
 * przy status='verified' (REFLECTION_TRIGGER_STATUSES). Pierwszy projekt zostaje
 * 'submitted' (pod T2 + 20-spec). Refleksje kasują się kaskadowo przy reseedzie
 * (FK ON DELETE CASCADE na project_reflections) → czysty start.
 *
 * Co testuje:
 *  T1. Callout pojawia się przy submission.status='verified'
 *  T2. Callout NIE pojawia się przy submission.status='submitted'
 *  T3. Formularz: 3 pola + zapis → Toast „Refleksja zapisana" + callout znika
 *  T4. Upsert: ponowny zapis (edycja) → sukces, bez 500/duplikatu
 *  T5. Moja droga: /moja-droga wyświetla refleksję z tytułem projektu i treścią
 *  T6. Prywatność R1: brak afordancji „pokaż wykładowcy" w widoku studenta
 *  T7. A11y: label/aria-describedby na polach; aria-live na kontenerze Mojej drogi
 *
 * KONTO: "main" (onboardingCompleted=TRUE, seed-e2e.ts).
 *
 * Tryb serial: T3 tworzy refleksję, T4 ją edytuje, T5 czyta — kolejność istotna.
 * Pojedyncze testy uodpornione na powtórny przebieg bez reseedu (sprawdzają stan
 * calloutu zamiast zakładać go na sztywno).
 *
 * Uruchomienie (baza testowa — patrz tests/e2e-pw/README.md):
 *   pnpm db:migrate:test ; pnpm seed:e2e ; (osobny terminal) pnpm dev
 *   pnpm exec playwright test --grep @dbwrite 30-b5-refleksja
 */

// Tytuły z seeda — link na /projects ma tytuł w dostępnej nazwie (ProjectCard = <Link>).
const VERIFIED_PROJECT = /Refleksja: projekt zaakceptowany/i;
const SUBMITTED_PROJECT = /Analiza danych GUS/i;

/** Otwiera detal projektu z marketplace po tytule (regex). */
async function openProjectByTitle(page: Page, titleRe: RegExp): Promise<void> {
	await page.goto("/projects");
	await expect(page.getByRole("heading", { name: /^Projekty$/ })).toBeVisible({ timeout: 15_000 });
	await page.getByRole("link", { name: titleRe }).first().click();
	await page.waitForURL(/\/projects\/[^/]+$/);
}

test.describe
	.serial("@dbwrite B5 Refleksja po projekcie", () => {
		test("T1. Callout pojawia się przy zgłoszeniu zaakceptowanym (verified)", async ({ page }) => {
			await loginWithPassword(page, "main");
			await openProjectByTitle(page, VERIFIED_PROJECT);

			// Callout ma aria-label="Refleksja po projekcie" (ReflectionCallout <section>)
			const callout = page.getByRole("region", { name: "Refleksja po projekcie" });
			await expect(callout).toBeVisible({ timeout: 10_000 });

			// Callout ma interaktywną treść: CTA „Dodaj refleksję" (świeży seed) albo —
			// gdy refleksja już istnieje z wcześniejszego przebiegu — nagłówek edycji.
			await expect(
				callout
					.getByRole("button", { name: /Dodaj refleksję/i })
					.or(callout.getByRole("heading", { name: /Edytuj refleksję/i })),
			).toBeVisible();
		});

		test("T2. Callout NIE pojawia się przy zgłoszeniu 'submitted' (nie verified)", async ({
			page,
		}) => {
			await loginWithPassword(page, "main");
			await openProjectByTitle(page, SUBMITTED_PROJECT);

			// status='submitted' → REFLECTION_TRIGGER_STATUSES.has('submitted')=false → null
			const callout = page.getByRole("region", { name: "Refleksja po projekcie" });
			await expect(callout).not.toBeVisible({ timeout: 5_000 });
		});

		test("T3. Formularz: wypełnij 3 pytania i zapisz → Toast + Callout znika", async ({ page }) => {
			await loginWithPassword(page, "main");
			await openProjectByTitle(page, VERIFIED_PROJECT);

			const callout = page.getByRole("region", { name: "Refleksja po projekcie" });
			await expect(callout).toBeVisible({ timeout: 10_000 });

			// Stan prompt → rozwiń formularz CTA. Gdy refleksja już istnieje (powtórka),
			// formularz jest od razu otwarty — pomijamy klik.
			const cta = callout.getByRole("button", { name: /Dodaj refleksję/i });
			if (await cta.isVisible()) await cta.click();

			// 3 pola (labelki z QUESTION_LABELS, htmlFor → getByLabel)
			await page
				.getByLabel("Co cię w tym projekcie zaskoczyło?")
				.fill("Zaskoczył mnie zakres pracy.");
			await page
				.getByLabel("Co cię w nim wkurzyło albo zniechęciło?")
				.fill("Trudna konfiguracja środowiska.");
			await page.getByLabel("Czego dowiedziałeś się o sobie?").fill("Nauczyłem się cierpliwości.");

			await page.getByRole("button", { name: /Zapisz refleksję/i }).click();

			// Toast sukcesu (Sonner)
			await expect(page.getByText(/Refleksja zapisana/i)).toBeVisible({ timeout: 5_000 });

			// Callout znika po zapisie (stan A5 → hidden)
			await expect(callout).not.toBeVisible({ timeout: 5_000 });
		});

		test("T4. Upsert: ponowny zapis zmienionej treści → sukces (nie 500, nie duplikat)", async ({
			page,
		}) => {
			await loginWithPassword(page, "main");
			await openProjectByTitle(page, VERIFIED_PROJECT);

			// Refleksja istnieje (T3) → callout od razu w trybie formularza z wypełnionymi
			// polami. Gdyby (regres) był w stanie prompt — rozwiń CTA.
			const callout = page.getByRole("region", { name: "Refleksja po projekcie" });
			await expect(callout).toBeVisible({ timeout: 10_000 });
			const cta = callout.getByRole("button", { name: /Dodaj refleksję/i });
			if (await cta.isVisible()) await cta.click();

			// Zmień jedno pole i zapisz (upsert = UPDATE istniejącej, 200)
			await page
				.getByLabel("Co cię w tym projekcie zaskoczyło?")
				.fill("Zaktualizowana odpowiedź po edycji.");
			await page.getByRole("button", { name: /Zapisz refleksję/i }).click();

			await expect(page.getByText(/Refleksja zapisana/i)).toBeVisible({ timeout: 5_000 });

			// Brak komunikatu błędu zapisu z ReflectionForm (errorMessage()) — nie 500/409/duplikat.
			// Celujemy w konkretne teksty błędu, NIE w getByRole("alert"): Next.js renderuje pusty
			// <div role="alert" id="__next-route-announcer__"> (a11y ogłaszanie trasy), który
			// złapałby globalny selektor alertu i dał fałszywy fail.
			await expect(
				page.getByText(
					/Nie udało się zapisać|Nie udało się połączyć|Sesja wygasła|Nie znaleziono zgłoszenia|dostępna tylko po zaakceptowaniu|Dane są nieprawidłowe/i,
				),
			).not.toBeVisible({ timeout: 2_000 });
		});

		test("T5. Moja droga: /moja-droga wyświetla zapisaną refleksję z tytułem projektu", async ({
			page,
		}) => {
			await loginWithPassword(page, "main");
			await page.goto("/moja-droga");
			await expect(page).toHaveURL(/\/moja-droga/);

			await expect(page.getByRole("heading", { name: "Moja droga" })).toBeVisible();

			// Karta refleksji: tytuł projektu zaakceptowanego (B5)
			await expect(page.getByText(VERIFIED_PROJECT).first()).toBeVisible({ timeout: 10_000 });

			// Treść zgodna z ostatnim zapisem (T4 nadpisał T3)
			await expect(page.getByText(/Zaktualizowana odpowiedź po edycji/i)).toBeVisible({
				timeout: 5_000,
			});
		});

		test("T6. Prywatność R1: brak afordancji 'pokaż wykładowcy' w Mojej drodze", async ({
			page,
		}) => {
			await loginWithPassword(page, "main");
			await page.goto("/moja-droga");
			await expect(page.getByRole("heading", { name: "Moja droga" })).toBeVisible({
				timeout: 10_000,
			});

			await expect(page.getByText(/pokaż wykładowcy/i)).not.toBeVisible();
			await expect(page.getByText(/udostępnij wykładowcy/i)).not.toBeVisible();
			await expect(page.getByRole("button", { name: /share|udostępnij/i })).not.toBeVisible();
		});

		test("T7. A11y: label/aria na polach formularza, aria-live na Mojej drodze", async ({
			page,
		}) => {
			await loginWithPassword(page, "main");
			await openProjectByTitle(page, VERIFIED_PROJECT);

			const callout = page.getByRole("region", { name: "Refleksja po projekcie" });
			const cta = callout.getByRole("button", { name: /Dodaj refleksję/i });
			if (await cta.isVisible()) await cta.click();

			// Każde pole ma label (getByLabel szuka przez htmlFor/aria-labelledby)
			await expect(page.getByLabel("Co cię w tym projekcie zaskoczyło?")).toBeVisible();
			await expect(page.getByLabel("Co cię w nim wkurzyło albo zniechęciło?")).toBeVisible();
			await expect(page.getByLabel("Czego dowiedziałeś się o sobie?")).toBeVisible();

			// aria-describedby → licznik zdań (ReflectionQuestion)
			const surprised = page.getByLabel("Co cię w tym projekcie zaskoczyło?");
			expect(await surprised.getAttribute("aria-describedby")).toBeTruthy();

			// aria-live="polite" na kontenerze Mojej drogi (MyRoadView)
			await page.goto("/moja-droga");
			await expect(page.locator("[aria-live='polite']").first()).toBeVisible({ timeout: 10_000 });
		});
	});
