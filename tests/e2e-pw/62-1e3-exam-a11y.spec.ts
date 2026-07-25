import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { EXAM_MODULE_ID } from "./fixtures/a11y-fixture-ids";
import { loginWithPassword } from "./helpers/auth";

/**
 * 1E.3 · P5 — SKAN DOSTĘPNOŚCI axe-core na 3 krytycznych ścieżkach UI egzaminu
 * modułowego (twarda bramka Leo przed zapaleniem FLAG_MASTERY_GATE na prod).
 *
 * Wymaga serwera dev na BAZIE TESTOWEJ z flagami zapalonymi:
 *   FLAG_MASTERY_GATE=1 FLAG_CURRICULUM_PATH=1  (obie — exam page bramkuje AND)
 *   DATABASE_URL → skillbridge_test (NIE prod)
 *
 * Trzy realne stany (definicja „3 ścieżek" Leo):
 *   (a) wejście na bramkę egzaminu  — ExamRunner faza „confirm" (ekran startowy)
 *   (b) runner z pierwszym pytaniem — ExamRunner faza „running" (mock /start 200)
 *   (c) panel korekt                — CorrectivesPanel (mock /start 423)
 *
 * (b) i (c) mockują POST /api/exam/start (page.route) — skanujemy PRAWDZIWY DOM
 * komponentów bez seedu banku pytań i BEZ zapisu sesji egzaminu do bazy.
 * Zakres axe zawężony do `main.db-main` (UI egzaminu), z pominięciem sidebara
 * dashboardu — bramka Leo dotyczy ekranów egzaminu, nie całej powłoki.
 *
 * Tagi WCAG: wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice.
 */

// UUID modułu „Moduł A" — JEDNO ŹRÓDŁO: tests/e2e-pw/fixtures/a11y-fixture-ids.ts
// (ten sam, który seeder CI wstawia do bazy testowej). Zmiana UUID = zmiana tam.
const MODULE_ID = EXAM_MODULE_ID;
const EXAM_URL = `/curriculum/${MODULE_ID}/exam`;
const EXAM_SCOPE = "main.db-main";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const START_OK = {
	sessionId: "11111111-1111-4111-8111-111111111111",
	resumed: false,
	attempt: 1,
	total: 15,
	question: {
		slotRef: "slot-0",
		stem: "Która struktura danych w Pythonie jest niemutowalna?",
		options: ["lista", "słownik", "krotka", "zbiór"],
		position: 0,
		total: 15,
	},
};

const START_CORRECTIVES = {
	state: "correctives_required",
	correctivesPackage: {
		message: "Dwa podejścia za Tobą. Odśwież poniższe tematy, a otworzymy nowe podejście.",
		concepts: [
			{
				concept: "kolekcje-niemutowalne",
				conceptName: "Kolekcje niemutowalne",
				atoms: [
					{ slug: "krotki-teoria", title: "Krotki w praktyce", kind: "theory" },
					{ slug: "krotki-cwiczenie", title: "Ćwiczenie: krotki", kind: "exercise" },
				],
			},
			{
				concept: "slowniki-podstawy",
				conceptName: "Słowniki — podstawy",
				atoms: [],
			},
		],
	},
};

async function runAxe(page: import("@playwright/test").Page, label: string) {
	const results = await new AxeBuilder({ page }).include(EXAM_SCOPE).withTags(AXE_TAGS).analyze();
	const summary = results.violations.map((v) => ({
		id: v.id,
		impact: v.impact,
		help: v.help,
		nodes: v.nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 160) })),
	}));
	// Log pełen — trafia do stdout raportu go/no-go.
	console.log(`\n===== AXE [${label}] — naruszeń: ${results.violations.length} =====`);
	console.log(JSON.stringify(summary, null, 2));
	return results.violations;
}

test.describe("@safe 1E.3 P5 — skan a11y egzaminu (bramka Leo)", () => {
	test.beforeEach(async ({ page }) => {
		await loginWithPassword(page, "main");
	});

	test("(a) wejście na bramkę egzaminu — ekran startowy", async ({ page }) => {
		await page.goto(EXAM_URL);
		await expect(page.getByRole("button", { name: /Rozpocznij egzamin/i })).toBeVisible();
		const violations = await runAxe(page, "a: confirm/start");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	test("(b) runner z pierwszym pytaniem", async ({ page }) => {
		await page.route("**/api/exam/start", (route) =>
			route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify(START_OK),
			}),
		);
		await page.goto(EXAM_URL);
		await page.getByRole("button", { name: /Rozpocznij egzamin/i }).click();
		await expect(page.getByRole("heading", { name: /Pytanie 1 z 15/i })).toBeVisible();
		const violations = await runAxe(page, "b: runner/pytanie");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	test("(c) panel korekt", async ({ page }) => {
		await page.route("**/api/exam/start", (route) =>
			route.fulfill({
				status: 423,
				contentType: "application/json",
				body: JSON.stringify(START_CORRECTIVES),
			}),
		);
		await page.goto(EXAM_URL);
		await page.getByRole("button", { name: /Rozpocznij egzamin/i }).click();
		await expect(
			page.getByRole("heading", { name: /Czas na uzupełnienie materiału/i }),
		).toBeVisible();
		const violations = await runAxe(page, "c: correctives");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});
});
