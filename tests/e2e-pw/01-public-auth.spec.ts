import { expect, test } from "@playwright/test";

/**
 * @safe — publiczne, read-only. ZERO zapisu do bazy, ZERO kosztu LLM.
 *
 * Pokrywa: landing, logowanie (Google + e-mail/hasło), rejestracja, panel
 * wykładowcy oraz BRAMKĘ auth (niezalogowany na trasie Bety → redirect /login).
 * Te testy wolno odpalać nawet przy .env.local celującym w prod — nie tworzą
 * sesji ani wierszy studenta (renderują tylko publiczne strony i sprawdzają
 * przekierowanie middleware ZANIM jakiekolwiek zapytanie do danych studenta).
 */

test.describe("@safe Strona publiczna i bramka auth", () => {
	test("Landing /: hero + CTA Paszport, link logowania i panel wykładowcy", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { level: 1 })).toContainText("rynkiem pracy");
		await expect(page.getByRole("link", { name: /Stwórz swój Paszport/i }).first()).toBeVisible();
		await expect(page.getByRole("link", { name: /Panel wykładowcy/i }).first()).toBeVisible();
	});

	test("Logowanie /login: Google + formularz e-mail/hasło obecne", async ({ page }) => {
		await page.goto("/login");
		await expect(page.getByRole("heading", { name: /Witaj ponownie/i })).toBeVisible();
		// Google OAuth (świeży wymóg „Google działa").
		await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
		// E-mail/hasło — pola i przycisk.
		await expect(page.getByLabel("Email")).toBeVisible();
		await expect(page.getByLabel("Hasło", { exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: /Zaloguj się/i })).toBeVisible();
	});

	test("Logowanie: złe dane → komunikat błędu (bez utworzenia sesji)", async ({ page }) => {
		// Czyste read-only: better-auth zwróci błąd, nic nie zapisujemy.
		// Dwa możliwe komunikaty zależne od środowiska:
		//  - z bazą testową → better-auth odpowiada: „Nieprawidłowy email lub hasło"
		//  - bez bazy (DATABASE_URL="", środowisko CI/safe) → catch: „Coś poszło nie tak"
		// Oba są poprawnym zachowaniem: sesja nie została utworzona.
		await page.goto("/login");
		await page.getByLabel("Email").fill("nie-istnieje@example.com");
		await page.getByLabel("Hasło", { exact: true }).fill("zle-haslo-123");
		await page.getByRole("button", { name: /Zaloguj się/i }).click();
		await expect(
			page.getByText(/Nieprawidłowy email lub hasło/i).or(page.getByText(/Coś poszło nie tak/i)),
		).toBeVisible({ timeout: 15_000 });
	});

	test("Rejestracja /signup: formularz dostępny", async ({ page }) => {
		await page.goto("/signup");
		await expect(page.getByLabel("Email")).toBeVisible();
		await expect(page.getByLabel("Hasło", { exact: true })).toBeVisible();
	});

	test("Panel wykładowcy /faculty/login: formularz logowania", async ({ page }) => {
		await page.goto("/faculty/login");
		// Strona logowania kampusowego — pole hasła musi istnieć.
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});
});

test.describe("@safe Bramka auth na trasach CareerEDGE Bety", () => {
	// Każda z tych tras jest za loginem. Niezalogowany → middleware/layout
	// przekierowuje na /login ZANIM doleci do zapytania o studenta. To potwierdza,
	// że dane Bety są chronione i że nieautoryzowany ruch nie dotyka bazy student.
	const protectedRoutes = [
		{ name: "B0 Pomocnik kariery", path: "/pomocnik-kariery" },
		{ name: "B1 Paszport", path: "/passport" },
		{ name: "B4 Samoocena (onboarding)", path: "/onboarding" },
		{ name: "Dashboard", path: "/dashboard" },
		{ name: "Projekty (marketplace)", path: "/projects" },
		{ name: "Skill-map", path: "/skill-map" },
		{ name: "Gap-analysis", path: "/gap-analysis" },
		{ name: "Profil", path: "/profil" },
	];

	for (const route of protectedRoutes) {
		test(`${route.name} (${route.path}) → przekierowanie na /login`, async ({ page }) => {
			await page.goto(route.path);
			await expect(page).toHaveURL(/\/login/);
		});
	}
});
