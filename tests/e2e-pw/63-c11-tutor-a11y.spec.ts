import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { TUTOR_PROJECT_ID } from "./fixtures/a11y-fixture-ids";
import { loginWithPassword } from "./helpers/auth";

/**
 * C11/1.13 · a11y — SKAN DOSTĘPNOŚCI axe-core panelu tutora sokratycznego
 * (twarda bramka przed zapaleniem FLAG_SOCRATIC_TUTOR na prod). Analog bramki
 * 1E.3 (`62-1e3-exam-a11y.spec.ts`) — ten sam harness @axe-core/playwright,
 * te same tagi WCAG, ta sama zasada „mock zamiast żywego LLM".
 *
 * Wymaga serwera dev na BAZIE TESTOWEJ (localhost:5433) z flagą zapaloną:
 *   FLAG_SOCRATIC_TUTOR=1  (bez niej server component NIE renderuje <TutorPanel>
 *     — page.tsx:75 przekazuje tutorEnabled=false → panelu nie ma w DOM)
 *   DATABASE_URL → skillbridge_test (NIE prod Neon)
 *
 * ZAKRES axe = `.tutor-panel` (root panelu), świadome odejście od `main.db-main`
 * z 62-spec: bramka dotyczy TEGO panelu za flagą FLAG_SOCRATIC_TUTOR, więc
 * izolujemy ją od pozostałych sekcji widoku projektu (brief/zgłoszenie/refleksja),
 * których bazowa dostępność jest już na prodzie i nie jest przedmiotem tej flagi.
 * Panel siedzi wewnątrz landmarku `main.db-main` (layout dashboardu) — landmark
 * jest zapewniony przez powłokę, nie przez panel.
 *
 * BEZ MODELU: żadna ścieżka nie woła LLM. GET (rehydracja) i POST (tura) są
 * mockowane przez page.route — DOKŁADNIE jak 62-spec mockuje POST /api/exam/start
 * — więc skanujemy PRAWDZIWY DOM komponentu bez kosztu Sonnet+sędzia i bez
 * zapisu tur do bazy (żaden `tutor_turns` INSERT nie leci).
 *
 * Cztery realne stany:
 *   (a) panel początkowy   — pusta rozmowa (GET 200: turns=[], turnsUsed=0)
 *   (b) rozmowa + wysyłka   — GET pusty, POST 200 z odpowiedzią; po turze
 *       weryfikujemy powrót fokusu do pola i skanujemy stan z historią ORAZ
 *       aktywnym (nie-disabled) przyciskiem „Wyślij" — disabled kontrolki są
 *       zwolnione z reguły color-contrast, więc CTA skanujemy w stanie enabled.
 *   (c) limit rozmowy       — GET 200: turnsUsed>=maxTurns → panel pokazuje
 *       komunikat limitu (<output class="tutor-limit">), pole wejścia znika.
 *   (d) stan kryzysowy      — GET pusty, POST 200 {crisis:true} (filtr regułowy
 *       PRZED modelem, route.ts:138 — model NIE wołany). Front zdejmuje dymek
 *       studenta i renderuje statyczny komunikat wsparcia (116 123) w żywym
 *       regionie role="alert" (.tutor-crisis). NAJWYŻSZA STAWKA — zdrowie
 *       psychiczne studenta; kontrast czerwieni #dc2626 na jej tle liczony
 *       twardo (patrz nota nad testem (d)).
 *
 * Tagi WCAG: identyczne z bramką 1E.3.
 *
 * runAxe loguje TAKŻE `incomplete` (reguły, których axe nie rozstrzygnął —
 * m.in. color-contrast przy nietrywialnym, półprzezroczystym tle). „0 violations"
 * przy niepustym `incomplete[color-contrast]` NIE jest zieloną bramką: axe się
 * wstrzymał, a nie potwierdził. Dlatego stan (d) ma dodatkowo twardą asercję na
 * brak color-contrast w incomplete.
 */

const TUTOR_SCOPE = ".tutor-panel";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];
const TUTOR_API_GLOB = "**/api/projects/*/tutor";

const REHYDRATE_EMPTY = { turns: [], turnsUsed: 0, maxTurns: 30 };

const TURN_REPLY = {
	reply:
		"Zanim podam kierunek — co już sprawdziłeś? Wypisz, na czym dokładnie utknąłeś " +
		"i jaki był ostatni komunikat błędu. To pokaże, gdzie zacząć.",
	guarded: false,
	turnsUsed: 1,
	maxTurns: 30,
};

// Kontrakt kryzysowy z route.ts:138-140 — filtr regułowy `detectCrisis` PRZED
// modelem zwraca DOKŁADNIE `{crisis:true}` ze statusem 200 (bez `reply`, bez
// utrwalenia tury). Front (tutor-panel.tsx:145-148) czyta `data.crisis`, zdejmuje
// optymistyczny dymek studenta i renderuje .tutor-crisis role="alert".
const TURN_CRISIS = { crisis: true };

const REHYDRATE_LIMIT = {
	turns: [
		{ role: "user", content: "Nad czym powinienem popracować w tym module najpierw?" },
		{
			role: "ai",
			content: "A które kryterium rubryki wydaje Ci się najmniej domknięte? Zacznij od niego.",
		},
	],
	turnsUsed: 30,
	maxTurns: 30,
};

function mapNodes(nodes: { target: unknown; html: string }[]) {
	return nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 160) }));
}

async function runAxe(page: import("@playwright/test").Page, label: string) {
	const results = await new AxeBuilder({ page }).include(TUTOR_SCOPE).withTags(AXE_TAGS).analyze();
	const summary = results.violations.map((v) => ({
		id: v.id,
		impact: v.impact,
		help: v.help,
		nodes: mapNodes(v.nodes),
	}));
	// `incomplete` = reguły, których axe NIE rozstrzygnął (np. color-contrast na
	// półprzezroczystym tle, którego nie umie skomponować). Logujemy jawnie —
	// „0 violations" z niepustym incomplete[color-contrast] to NIE zielona bramka.
	const incompleteSummary = results.incomplete.map((v) => ({
		id: v.id,
		impact: v.impact,
		help: v.help,
		nodes: mapNodes(v.nodes),
	}));
	// Log pełen — trafia do stdout raportu go/no-go.
	console.log(`\n===== AXE [${label}] — naruszeń: ${results.violations.length} =====`);
	console.log(JSON.stringify(summary, null, 2));
	console.log(
		`----- AXE [${label}] — incomplete (nierozstrzygnięte): ${results.incomplete.length} -----`,
	);
	console.log(JSON.stringify(incompleteSummary, null, 2));
	return results;
}

/**
 * Wejście na detal projektu-fixture o STAŁYM UUID (TUTOR_PROJECT_ID), wstawionego
 * do bazy testowej przez seeder CI (`tools/fixtures/seed-a11y-fixtures.ts`).
 *
 * Poprzednio wchodziliśmy przez katalog (page.goto("/projects") → klik pierwszego
 * linku) — niedeterministycznie, bo zależnie od stanu seedu / filtra kierunku
 * kariery katalog mógł nie pokazać żadnego projektu albo inny. Bezpośredni goto
 * na znany UUID zdejmuje tę zmienną: bramka mierzy dostępność panelu, nie
 * przypadkowy stan katalogu. Panel istnieje wyłącznie gdy serwer ma
 * FLAG_SOCRATIC_TUTOR=1 (server component page.tsx:75).
 */
async function openTutorProject(page: import("@playwright/test").Page) {
	await page.goto(`/projects/${TUTOR_PROJECT_ID}`);
	await expect(page).toHaveURL(/\/projects\/[^/]+$/);
	await expect(page.getByRole("heading", { name: "Tutor projektu" })).toBeVisible();
}

test.describe("@safe C11 a11y — skan panelu tutora (bramka przed FLAG_SOCRATIC_TUTOR)", () => {
	test.beforeEach(async ({ page }) => {
		await loginWithPassword(page, "main");
	});

	test("(a) panel początkowy — pusta rozmowa", async ({ page }) => {
		await page.route(TUTOR_API_GLOB, (route) => {
			if (route.request().method() === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(REHYDRATE_EMPTY),
				});
			}
			return route.fallback();
		});
		await openTutorProject(page);
		// Rehydracja domknięta: pokazuje się zachęta pustej rozmowy, nie spinner.
		await expect(page.getByText("Utknąłeś? Opisz, co już próbowałeś")).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Wiadomość do tutora" })).toBeVisible();
		const { violations } = await runAxe(page, "a: panel pusty");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	test("(b) rozmowa + wysyłka tury (fokus wraca, CTA aktywne)", async ({ page }) => {
		await page.route(TUTOR_API_GLOB, (route) => {
			const method = route.request().method();
			if (method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(REHYDRATE_EMPTY),
				});
			}
			if (method === "POST") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(TURN_REPLY),
				});
			}
			return route.fallback();
		});
		await openTutorProject(page);

		const input = page.getByRole("textbox", { name: "Wiadomość do tutora" });
		await input.fill("Utknąłem na starcie — od czego zacząć ten projekt?");
		await page.getByRole("button", { name: "Wyślij wiadomość do tutora" }).click();

		// Odpowiedź tutora z mocka pojawia się w historii (bez „Tutor myśli").
		const aiBubble = page.locator(".tutor-msg-ai .tutor-msg-content").last();
		await expect(aiBubble).toBeVisible();
		await expect(aiBubble).toContainText("co już sprawdziłeś");

		// Kryterium fokusu (pkt 3 zadania): po turze fokus wraca do pola wejścia,
		// żeby student pisał dalej z klawiatury bez sięgania po mysz. Regresja tu =
		// fokus ucieka do <body> (focus() na wciąż-disabled textarea — patrz fix
		// useEffect w tutor-panel.tsx).
		await expect(input).toBeFocused();

		// CTA skanujemy AKTYWNE: disabled przyciski są zwolnione z color-contrast,
		// więc dopisujemy tekst, by przycisk „Wyślij" był enabled w chwili skanu.
		await input.fill("A jak rozbić to na mniejsze kroki?");
		await expect(page.getByRole("button", { name: "Wyślij wiadomość do tutora" })).toBeEnabled();

		const { violations } = await runAxe(page, "b: rozmowa + CTA aktywne");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	test("(c) limit rozmowy — komunikat, pole wejścia znika", async ({ page }) => {
		await page.route(TUTOR_API_GLOB, (route) => {
			if (route.request().method() === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(REHYDRATE_LIMIT),
				});
			}
			return route.fallback();
		});
		await openTutorProject(page);
		await expect(page.getByText("Limit rozmowy z tutorem dla tego projektu")).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Wiadomość do tutora" })).toHaveCount(0);
		const { violations } = await runAxe(page, "c: limit rozmowy");
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});

	// (d) STAN KRYZYSOWY — najwyższa stawka (zdrowie psychiczne studenta). Gdy
	// filtr regułowy wykryje sygnał autodestrukcji, route.ts oddaje {crisis:true}
	// (bez modelu), a panel renderuje statyczny komunikat wsparcia (116 123) w
	// żywym regionie role="alert" (.tutor-crisis).
	//
	// KONTRAST — stan PO #234 (fix kontrastu, globals.css:4835):
	//   tekst  #b91c1c (red-700)             = rgb(185, 28, 28)
	//   tło    rgba(239,68,68,0.08) NAD white(.proj-detail-section, globals.css:4394)
	//          → skomponowane = rgb(254, 240, 240)
	//   kontrast = 5.83:1  (14px, waga normalna → próg AA = 4.5:1)  → ZAPAS nad progiem.
	//   (poprzednio #dc2626 dawał 4.35:1 — różowy tint tła zbijał kontrast pod próg;
	//    #234 podniósł tekst do red-700 — realny fix koloru, nie obejście testu.)
	// Dlatego oczekiwana obserwacja: axe NIE zgłasza color-contrast — asercja niżej
	// wymaga ZERA naruszeń (toEqual([])). Ta bramka blokuje job, jeśli ktoś cofnie
	// fix kontrastu (regresja .tutor-crisis do <4.5:1) — pilnuje, by nie spadł ponownie.
	// Dodatkowo twardo pilnujemy, by color-contrast NIE schował się w `incomplete`
	// (axe bywa niepewny przy półprzezroczystym tle — a tu „nie wiem" != „zielone").
	test("(d) stan kryzysowy — komunikat wsparcia role=alert, kontrast liczony twardo", async ({
		page,
	}) => {
		await page.route(TUTOR_API_GLOB, (route) => {
			const method = route.request().method();
			if (method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(REHYDRATE_EMPTY),
				});
			}
			if (method === "POST") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(TURN_CRISIS),
				});
			}
			return route.fallback();
		});
		await openTutorProject(page);

		// Wyślij wiadomość → mock oddaje {crisis:true} → panel wchodzi w stan kryzysu.
		const input = page.getByRole("textbox", { name: "Wiadomość do tutora" });
		await input.fill("Nie widzę już sensu w niczym.");
		await page.getByRole("button", { name: "Wyślij wiadomość do tutora" }).click();

		// (a) Komunikat kryzysowy widoczny w żywym regionie role="alert" z numerem
		//     wsparcia. Optymistyczny dymek studenta zdjęty (tura nieutrwalona).
		//     Scope na `.tutor-panel`: Next wstrzykuje na poziomie <body> własny
		//     żywy region `__next-route-announcer__` (też role="alert"), więc gołe
		//     getByRole("alert") łapie 2 węzły. Bramka dotyczy alertu PANELU.
		const alert = page.locator(TUTOR_SCOPE).getByRole("alert");
		await expect(alert).toBeVisible();
		await expect(alert).toHaveClass(/tutor-crisis/);
		await expect(alert).toContainText("116 123");
		await expect(alert).toContainText("AI go nie generuje");

		// (b) axe na stanie kryzysowym — szczególnie color-contrast czerwieni.
		const { violations, incomplete } = await runAxe(page, "d: stan kryzysowy");

		// Twarda bramka: color-contrast NIE może być „nierozstrzygnięty" na
		// najwyższej stawce — jeśli axe się wstrzymał, traktujemy to jak brak
		// dowodu zieleni i pokazujemy nody, żeby Leo widział, czego axe nie policzył.
		const ccIncomplete = incomplete.filter((v) => v.id === "color-contrast");
		expect(
			ccIncomplete,
			`color-contrast trafił do incomplete (axe nie rozstrzygnął) — nie liczy się jako pass:\n${JSON.stringify(
				ccIncomplete.map((v) => v.nodes.map((n) => n.target)),
				null,
				2,
			)}`,
		).toEqual([]);

		// Bramka właściwa: zero naruszeń. Po #234 kontrast .tutor-crisis to 5.83:1
		// (≥4.5) — asercja jest ZIELONA. Jeśli ktoś cofnie fix kontrastu (regresja
		// <4.5:1), color-contrast wróci jako naruszenie i ta asercja pójdzie na
		// czerwono — sygnał dla Mili (token/kolor), nie do obejścia po stronie testu.
		expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
	});
});
