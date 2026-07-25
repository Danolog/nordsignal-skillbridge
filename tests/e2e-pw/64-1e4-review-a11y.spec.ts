import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";

/**
 * 1E.4 · R6 — SKAN DOSTĘPNOŚCI axe-core sesji powtórek rozłożonych w czasie
 * (twarda bramka Leo przed zapaleniem FLAG_SPACED_REPETITION na prod). Analog
 * bramek 1E.3 (`62-1e3-exam-a11y.spec.ts`) i C11 (`63-c11-tutor-a11y.spec.ts`) —
 * ten sam harness @axe-core/playwright, te same tagi WCAG, ta sama zasada „mock
 * zamiast żywego LLM/DB".
 *
 * Wymaga serwera dev na BAZIE TESTOWEJ z flagą zapaloną:
 *   FLAG_SPACED_REPETITION=1  (bez niej strona /powtorki robi notFound() — deploy ≠
 *     release; trasy /api/review/* też są 404)
 *   DATABASE_URL → skillbridge_test (NIE prod Neon)
 *
 * ŚCIEŻKA /powtorki (NIE /review — to zajmuje kolejka recenzji człowieka B8;
 * kolizja tras zgłoszona Mili, patrz nagłówek powtorki/page.tsx).
 *
 * BEZ FIXTURE DB (odwrotnie niż spec 62/63): strona /powtorki nie czyta żadnego
 * wiersza domenowego — potrzebuje tylko zalogowanego studenta (redirect na
 * /onboarding bez niego), którego daje `seed:e2e` (konto „main"). Kolejkę i ocenę
 * wołamy PRZEZ MOCK page.route (GET /api/review/queue, POST /api/review/answer),
 * więc skanujemy PRAWDZIWY DOM ReviewRunner bez seedu banku pytań i BEZ zapisu do
 * review_states/review_logs (żaden INSERT nie leci, zero kosztu modelu).
 *
 * ZAKRES axe = `main.db-main` (UI powtórki w powłoce dashboardu), z pominięciem
 * sidebara — bramka Leo dotyczy ekranów sesji, nie całej powłoki (parytet z 62).
 *
 * Pięć realnych stanów (definicja Mili R6):
 *   (a) pytanie         — pierwsza karta pytania (mock /queue 200 z 1 pozycją)
 *   (b) werdykt-poprawny — po ocenie (mock /answer 200 isCorrect:true) w <output>
 *   (c) werdykt-błąd     — po ocenie (mock /answer 200 isCorrect:false), copy neutralny
 *   (d) koniec-sesji     — po „Zakończ sesję" na ostatniej pozycji
 *   (e) pusto            — kolejka pusta (mock /queue 200 queue:[])
 *
 * Tagi WCAG: identyczne z bramkami 1E.3 / C11.
 */

const REVIEW_SCOPE = "main.db-main";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];
const QUEUE_GLOB = "**/api/review/queue";
const ANSWER_GLOB = "**/api/review/answer";

const ONE_QUESTION = {
	queue: [
		{
			conceptId: "11111111-1111-4111-8111-111111111111",
			state: "review",
			due: "2026-07-25T00:00:00.000Z",
			reps: 3,
			lapses: 0,
			question: {
				questionItemId: "22222222-2222-4222-8222-222222222222",
				type: "single_choice",
				stem: "Która struktura danych w Pythonie jest niemutowalna?",
				options: ["lista", "słownik", "krotka", "zbiór"],
			},
		},
	],
	cap: 20,
};

const EMPTY_QUEUE = { queue: [], cap: 20 };

const ANSWER_CORRECT = {
	isCorrect: true,
	nextDue: "2026-08-05T00:00:00.000Z",
	feedback: {
		message: "Dobrze — ten koncept wróci w większym odstępie.",
		explanation: "Krotka (tuple) jest niemutowalna: po utworzeniu nie zmienisz jej elementów.",
	},
};

const ANSWER_WRONG = {
	isCorrect: false,
	nextDue: "2026-07-26T00:00:00.000Z",
	feedback: {
		message: "Ten koncept wrócił za wcześnie — pokażemy go znów niedługo.",
		explanation: "Krotka jest niemutowalna; lista i słownik są mutowalne.",
	},
};

function mapNodes(nodes: { target: unknown; html: string }[]) {
	return nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 160) }));
}

async function runAxe(page: import("@playwright/test").Page, label: string) {
	const results = await new AxeBuilder({ page }).include(REVIEW_SCOPE).withTags(AXE_TAGS).analyze();
	const summary = results.violations.map((v) => ({
		id: v.id,
		impact: v.impact,
		help: v.help,
		nodes: mapNodes(v.nodes),
	}));
	const incompleteSummary = results.incomplete.map((v) => ({
		id: v.id,
		impact: v.impact,
		help: v.help,
		nodes: mapNodes(v.nodes),
	}));
	console.log(`\n===== AXE [${label}] — naruszeń: ${results.violations.length} =====`);
	console.log(JSON.stringify(summary, null, 2));
	console.log(
		`----- AXE [${label}] — incomplete (nierozstrzygnięte): ${results.incomplete.length} -----`,
	);
	console.log(JSON.stringify(incompleteSummary, null, 2));
	return results;
}

/** Mock kolejki (GET) + oceny (POST). answerBody null → trasa answer nie jest mockowana. */
async function mockReviewApi(
	page: import("@playwright/test").Page,
	queueBody: unknown,
	answerBody: unknown | null,
) {
	await page.route(QUEUE_GLOB, (route) => {
		if (route.request().method() === "GET") {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(queueBody),
			});
		}
		return route.fallback();
	});
	if (answerBody !== null) {
		await page.route(ANSWER_GLOB, (route) => {
			if (route.request().method() === "POST") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(answerBody),
				});
			}
			return route.fallback();
		});
	}
}

test.describe("@safe 1E.4 R6 — skan a11y sesji powtórek (bramka przed FLAG_SPACED_REPETITION)", () => {
	test.beforeEach(async ({ page }) => {
		await loginWithPassword(page, "main");
	});

	test("(a) pytanie — pierwsza karta", async ({ page }) => {
		await mockReviewApi(page, ONE_QUESTION, null);
		await page.goto("/powtorki");
		await expect(page.getByRole("heading", { name: "Powtórka 1 z 1" })).toBeVisible();
		await expect(page.getByRole("radio", { name: "krotka" })).toBeVisible();
		const { violations } = await runAxe(page, "a: pytanie");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	test("(b) werdykt-poprawny — <output> po ocenie", async ({ page }) => {
		await mockReviewApi(page, ONE_QUESTION, ANSWER_CORRECT);
		await page.goto("/powtorki");
		await page.getByRole("radio", { name: "krotka" }).check();
		await page.getByRole("button", { name: "Sprawdź" }).click();
		await expect(page.getByText("Dobrze — ten koncept wróci w większym odstępie.")).toBeVisible();
		const { violations } = await runAxe(page, "b: werdykt-poprawny");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	test("(c) werdykt-błąd — copy neutralny (bez rose/XCircle)", async ({ page }) => {
		await mockReviewApi(page, ONE_QUESTION, ANSWER_WRONG);
		await page.goto("/powtorki");
		await page.getByRole("radio", { name: "lista" }).check();
		await page.getByRole("button", { name: "Sprawdź" }).click();
		await expect(
			page.getByText("Ten koncept wrócił za wcześnie — pokażemy go znów niedługo."),
		).toBeVisible();
		const { violations } = await runAxe(page, "c: werdykt-błąd");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	test("(d) koniec-sesji — po zakończeniu sesji", async ({ page }) => {
		await mockReviewApi(page, ONE_QUESTION, ANSWER_CORRECT);
		await page.goto("/powtorki");
		await page.getByRole("radio", { name: "krotka" }).check();
		await page.getByRole("button", { name: "Sprawdź" }).click();
		await page.getByRole("button", { name: "Zakończ sesję" }).click();
		await expect(page.getByRole("heading", { name: "Koniec sesji" })).toBeVisible();
		const { violations } = await runAxe(page, "d: koniec-sesji");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	test("(e) pusto — kolejka pusta", async ({ page }) => {
		await mockReviewApi(page, EMPTY_QUEUE, null);
		await page.goto("/powtorki");
		await expect(page.getByRole("heading", { name: "Nic do powtórzenia" })).toBeVisible();
		const { violations } = await runAxe(page, "e: pusto");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});
});
