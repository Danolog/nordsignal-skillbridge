import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { driveChatToSummaryCta } from "./helpers/b0-chat";
import { wyczyscSesjePomocnika, zasiejDomknietaRozmowe } from "./helpers/b0-session-seed";
import { domknijPodsumowanieZeSciezkami, poczekajNaEkran3 } from "./helpers/b0-summary";
import { resetOnboardingState } from "./helpers/db-reset";
import { dbWriteTest as test } from "./helpers/guards";
import { fillSurveyAndContinue } from "./helpers/survey";

/**
 * @dbwrite + KOSZT LLM — B0 „Pomocnik kariery" (LIVE).
 *
 * UWAGA KOSZT: pełny czat (~9 tur) + podsumowanie wołają model Claude przez
 * /turn i /summary. Każdy przebieg to realny koszt API i zapis sesji/tur do bazy.
 * Trzymamy minimum: jeden pełny przejazd czatu + 1 test fokusu + 3× podsumowanie
 * (bug #57 bywał kapryśny — powtarzamy, by złapać niestabilność).
 *
 * Mechanika i selektory wprost z kodu:
 *  - ankieta (krok 1 z 3): helper fillSurveyAndContinue (q1/q2 radio, q3 checkbox
 *    max 3, q4 textarea ≥10 znaków) — asertuje „Idź dalej" enabled.
 *  - czat: helper driveChatToSummaryCta — odpowiada aż do CTA „Pokaż podsumowanie"
 *    (pole DISABLED w trakcie streamingu; rozmowa domyka się po 9. pytaniu AI).
 *  - podsumowanie: helper domknijPodsumowanieZeSciezkami (helpers/b0-summary.ts) —
 *    zna TRZY stany końcowe ekranu 3 i domyka ścieżkę do „karty są".
 *
 * ROZDZIELENIE WŁAŚCIWOŚCI (naprawa defektu z przebiegu CI 30579719642). Ten plik
 * pilnuje DWÓCH różnych rzeczy DWOMA różnymi torami:
 *  A. „podsumowanie realnie się generuje" — testy @llm niżej, realny model, bez atrap.
 *     Uczciwy degrade nie jest wynikiem akceptowanym: korzystamy z afordancji
 *     produktu (ponów) i dopiero po wyczerpaniu prób padamy — z komunikatem, który
 *     mówi, GDZIE szukać (log .no-object-retry / .exhausted).
 *  B. „uczciwy degrade ma wyjście" — osobny describe na końcu pliku, DETERMINISTYCZNY
 *     (atrapa wyłącznie na poziomie kontraktu naszego endpointu /summary, zero atrap
 *     na modelu i na bazie). Bez niego strata z punktu A byłaby niewidoczna: nikt
 *     nie sprawdzał, czy ekran błędu w ogóle prowadzi z powrotem do podsumowania.
 *
 * Konto: "main" (onboardingCompleted=TRUE). B0 wymaga tylko zalogowanego studenta.
 * Czas: każdy pełny przejazd to ~9 wywołań modelu — podnosimy budżet testu.
 */

test.describe("@dbwrite @llm B0 Pomocnik kariery — czat i podsumowanie", () => {
	// B0 czat i podsumowanie wołają model. Serwer musi mieć ANTHROPIC_API_KEY.
	// Sygnalizujemy to flagą E2E_LLM_AVAILABLE=1 (klucz po stronie serwera, nie
	// w transkrypcie Playwright) lub obecnością klucza w procesie Playwright.
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"B0 wymaga LLM (serwer musi mieć ANTHROPIC_API_KEY). Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma klucz.",
	);

	// Sufit 10 sesji Pomocnika na dobę per student (MAX_SESSIONS_PER_DAY) vs 5 sesji,
	// które ten plik zakłada na koncie „main" — przy ponowieniach Playwrighta (CI
	// retries: 1) resztki z poprzedniego przebiegu dobijają do sufitu i kolejny test
	// dostaje 429 zamiast ekranu Pomocnika. Czyścimy stan wejściowy raz, na starcie.
	test.beforeAll(async () => {
		await wyczyscSesjePomocnika("main");
	});

	test("Ankieta → czat (AI odzywa się pierwszy) → 9 tur → podsumowanie", async ({ page }) => {
		// Budżet: rozmowa (~9 wywołań) + do 3 podejść do /summary po ≤100 s każde.
		test.setTimeout(420_000);
		await loginWithPassword(page);
		await page.goto("/pomocnik-kariery");

		await fillSurveyAndContinue(page);

		// Ekran 2 — czat.
		await expect(page.getByRole("heading", { name: /krok 2 z 3: rozmowa/i })).toBeVisible();
		await driveChatToSummaryCta(page);

		await page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i }).click();

		// Ekran 3 — wynik musi zawierać ŚCIEŻKI (podsumowanie judged=true albo
		// przegląd opiekuna judged=false z obszarami). Sam ekran błędu = ponawiamy
		// przyciskiem produktu; po wyczerpaniu prób pad z diagnozą. Szczegóły i lista
		// rzeczy, których ten tor NIE pilnuje: helpers/b0-summary.ts.
		await domknijPodsumowanieZeSciezkami(page);
	});

	test("Fix #55: po wysłaniu wiadomości fokus wraca do pola wejścia", async ({ page }) => {
		test.setTimeout(120_000);
		await loginWithPassword(page);
		await page.goto("/pomocnik-kariery");
		await fillSurveyAndContinue(page);

		const input = page.getByRole("textbox");
		await expect(page.getByText(/Tura \d+ z 9/)).toBeVisible({ timeout: 45_000 });
		await expect(input).toBeEnabled({ timeout: 45_000 });
		await input.fill("Pierwsza odpowiedź — sprawdzam powrót fokusu.");
		await page.getByRole("button", { name: /Wyślij wiadomość/i }).click();
		// Po zakończeniu odpowiedzi AI (status ready) komponent przywraca fokus do textarea.
		await expect(input).toBeEnabled({ timeout: 45_000 });
		await expect(input).toBeFocused({ timeout: 10_000 });
	});

	// Fix #57 bywał kapryśny → 3 przebiegi samego /summary. Każdy: świeża sesja,
	// domknięcie czatu, generacja podsumowania. 3 = kompromis pokrycie/koszt LLM.
	//
	// PO NAPRAWIE DEFEKTU TESTU (przebieg CI 30579719642): warunkiem zaliczenia jest
	// wynik ZE ŚCIEŻKAMI, a nie sam nagłówek — inaczej ekran „Coś poszło nie tak
	// z podsumowaniem" (uczciwy degrade produktu) czekał do końca budżetu i raportował
	// się jako zawieszenie. Koszt rośnie wyłącznie wtedy, gdy model faktycznie
	// degraduje: w zdrowym przebiegu to nadal jedno POST /summary na test.
	for (let run = 1; run <= 3; run++) {
		test(`Fix #57: /summary generuje wynik — przebieg ${run}/3`, async ({ page }) => {
			// Budżet: rozmowa + do 3 podejść do /summary po ≤100 s (kontrakt A4 klienta).
			test.setTimeout(420_000);
			await loginWithPassword(page);
			await page.goto("/pomocnik-kariery");
			await fillSurveyAndContinue(page);

			await driveChatToSummaryCta(page);
			await page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i }).click();

			await domknijPodsumowanieZeSciezkami(page);
		});
	}
});

/**
 * @dbwrite — „uczciwy degrade podsumowania ma wyjście" (DETERMINISTYCZNIE, bez modelu).
 *
 * DRUGA POŁOWA rozdzielenia właściwości (patrz nagłówek pliku, punkt B). Tor @llm
 * wyżej pilnuje, że podsumowanie się generuje — ale toleruje po drodze degrade.
 * Ten test pilnuje dokładnie tego, co tamten przestał: że degrade jest uczciwy
 * (mówi studentowi prawdę, nie udaje sukcesu) i że PROWADZI GDZIEŚ (ponowienie
 * realnie wraca do podsumowania). Do 2026-08-01 tej właściwości nie pilnował
 * ŻADEN test e2e — przycisk „Spróbuj ponownie" był sprawdzony tylko na poziomie
 * komponentu (summary-screen.test.tsx), gdzie „wraca do czatu" to atrapa callbacku.
 *
 * GDZIE JEST ATRAPA I DLACZEGO TYLKO TAM. Podstawiamy WYŁĄCZNIE odpowiedź naszego
 * własnego endpointu POST /summary — na poziomie kontraktu (dokładnie kształt
 * SummaryResponse z src/lib/career-helper/types.ts), nie logiki. Realne zostają:
 * przeglądarka, trasa Next, sesja logowania, baza (sesja i tury czytane przez
 * GET /session z RLS), oba przejścia ekranów i rehydracja czatu. Model NIE jest
 * atrapowany — on jest tu nieistotny: degrade jest z definicji stanem, w którym
 * model nic sensownego nie zwrócił. Sterowanie kolejnością odpowiedzi (1. próba
 * degrade, 2. próba sukces) jest jedynym sposobem, żeby ta ścieżka była pewna,
 * a nie zależna od szczęścia.
 *
 * @llm w tytule mimo ZERO wywołań modelu: nocny job e2e-llm wybiera testy przez
 * --grep "@llm", a spec 10 nie biega w żadnym innym jobie. Bez tego tagu test byłby
 * martwy (nigdy nieuruchamiany). Docelowo: przenieść do taniego joba e2e @dbwrite
 * na PR — decyzja o topologii jobów należy do Ethana (ADR), nie do tego pliku.
 */
test.describe("@dbwrite @llm B0 — uczciwy degrade /summary (bez kosztu modelu, atrapa kontraktu)", () => {
	const SUMMARY_GLOB = "**/api/career-helper/session/*/summary";

	/** Degrade z trasy: generator wyczerpał próby/budżet → 200 z pustymi ścieżkami. */
	const ODPOWIEDZ_DEGRADE = {
		judged: false,
		judgedFor: "warstwa4_failed",
		summaryText: null,
		careerPaths: [],
	};

	/** Poprawne podsumowanie po ponowieniu (etykieta z katalogu 23 ścieżek). */
	const ODPOWIEDZ_SUKCES = {
		judged: true,
		judgedFor: "R2",
		summaryText:
			"Z tego, co powiedziałeś: lubisz rozkładać problem na części i sprawdzać hipotezy na danych.",
		careerPaths: [
			{
				label: "Data Analyst",
				why: "Wracałeś do pracy z liczbami i do sprawdzania, czy wnioski trzymają się danych.",
			},
		],
	};

	test("ekran błędu mówi prawdę i wraca do podsumowania (ponowienie realnie działa)", async ({
		page,
	}) => {
		test.setTimeout(120_000);

		// Rozmowa domknięta zasiana w bazie — wchodzimy prosto na czat z CTA,
		// bez ankiety i bez 9 wywołań modelu (helpers/b0-session-seed.ts).
		const sessionId = await zasiejDomknietaRozmowe("main");

		let wywolania = 0;
		await page.route(SUMMARY_GLOB, async (route) => {
			if (route.request().method() !== "POST") return route.fallback();
			wywolania += 1;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(wywolania === 1 ? ODPOWIEDZ_DEGRADE : ODPOWIEDZ_SUKCES),
			});
		});

		await loginWithPassword(page);
		await page.goto(`/pomocnik-kariery?sessionId=${sessionId}`);

		// Rehydracja z bazy: rozmowa domknięta → CTA zamiast pola wpisywania.
		const cta = page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i });
		await expect(cta).toBeVisible({ timeout: 30_000 });
		await cta.click();

		// (1) Degrade jest UCZCIWY: nazywa problem, nie udaje sukcesu, nie gubi rozmowy.
		expect(await poczekajNaEkran3(page)).toBe("blad_generacji");
		await expect(page.getByText(/Twoja rozmowa jest zapisana, nic nie zginęło/i)).toBeVisible();
		// Nie podszywa się pod wynik: żadnych kart wyboru ścieżki na ekranie błędu.
		await expect(page.getByText(/Wybieram tę ścieżkę/i)).toHaveCount(0);
		const ponow = page.getByRole("button", { name: /Spróbuj ponownie/i });
		await expect(ponow).toBeVisible();

		// (2) Wyjście PROWADZI GDZIEŚ: ponowienie wraca na czat z CTA (rehydracja
		// GET /session ustawia stan „rozmowa domknięta"), a nie w pustkę.
		await ponow.click();
		await expect(cta).toBeVisible({ timeout: 30_000 });
		await cta.click();

		// (3) Druga próba się udaje → student dostaje podsumowanie i karty.
		expect(await poczekajNaEkran3(page)).toBe("podsumowanie");
		await expect(page.getByText(/Wybieram tę ścieżkę/i).first()).toBeVisible();
		expect(
			wywolania,
			"Ponowienie musi wysłać NOWE POST /summary, nie odtworzyć starej odpowiedzi",
		).toBe(2);
	});
});

/**
 * @dbwrite + KOSZT LLM — Pomocnik jako KROK 0 onboardingu (strumień E / #5, NOWY).
 *
 * Druga ścieżka Pomocnika (obok standalone wyżej): osadzony w wizardzie onboardingu
 * dla NOWEGO studenta (onboardingCompleted=FALSE, konto "b4"). To sedno naprawy #5 —
 * przed nią Pomocnik był sierotą nieosiągalną przed onboardingiem (spec §1.3).
 *
 * Co dowodzi (tryb embedded, spec §3.1):
 *  - Pomocnik renderuje się jako Krok 0 wizarda (nagłówek „Zacznijmy od celu",
 *    pasek „Cel kariery") — nie jako osobna trasa.
 *  - Po wyborze ścieżki onCareerGoalChosen ustawia careerGoal w pamięci i przechodzi
 *    do Kroku 1 (Profil) — NIE woła select-path (brak rekordu studenta), NIE robi
 *    router.push("/onboarding"). Cel widoczny w mikrokopii HITL na Profilu.
 *  - Profil NIE ma już selecta celu kariery (przeniesiony do Kroku 0).
 *
 * @llm: cały przepływ Pomocnika woła model (ankieta→czat→podsumowanie). Bez klucza
 * serwerowego — skip (guard). Standalone (describe wyżej) zostaje nietknięty.
 */
test.describe("@dbwrite @llm Pomocnik jako Krok 0 onboardingu (#5, nowy student)", () => {
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"Krok 0 (Pomocnik osadzony) woła model. Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma ANTHROPIC_API_KEY.",
	);

	test("Krok 0: wybór ścieżki ustawia cel w pamięci i przechodzi do Profilu (bez select-path)", async ({
		page,
	}) => {
		// Krok 0 = ~9 wywołań modelu (czat) + do 2 podejść do podsumowania.
		test.setTimeout(420_000);
		// Konto "b4": onboardingCompleted=FALSE → /onboarding wpuszcza w wizard od Kroku 0.
		// Reset stanu PRZED wejściem: specy 10/20/40 współdzielą konto b4, a każdy
		// zakłada Krok 0 — bez resetu pierwszy przebieg zostawia wizard dalej
		// i sesję Pomocnika (modal wznowienia). Znalezisko biegu nr 3 nocnego toru.
		await resetOnboardingState("b4");
		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		// Krok 0 — Pomocnik osadzony w wizardzie (nie trasa /pomocnik-kariery).
		await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.getByText("Cel kariery").first()).toBeVisible(); // pasek postępu

		// Pełny przepływ Pomocnika: ankieta → czat → podsumowanie.
		await fillSurveyAndContinue(page);
		await expect(page.getByRole("heading", { name: /krok 2 z 3: rozmowa/i })).toBeVisible({
			timeout: 45_000,
		});
		await driveChatToSummaryCta(page);
		await page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i }).click();
		// Tu podsumowanie jest ŚRODKIEM, nie celem (celem jest wpięcie Kroku 0), więc
		// budżet prób węższy niż w testach dedykowanych /summary: 2 zamiast 3.
		await domknijPodsumowanieZeSciezkami(page, { maxProby: 2 });

		// Wybór ścieżki + „Idź dalej do samooceny" → tryb embedded (onCareerGoalChosen).
		await page
			.getByText(/Wybieram tę ścieżkę/i)
			.first()
			.click();
		await page.getByRole("button", { name: /Idź dalej do samooceny/i }).click();

		// DOWÓD wpięcia: trafiamy do Kroku 1 (Profil) WEWNĄTRZ /onboarding (nie redirect
		// na osobną trasę), cel jest w pamięci (mikrokopia HITL), a Profil nie ma już celu.
		await expect(page).toHaveURL(/\/onboarding/);
		await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.getByText(/Twój cel kariery:/i)).toBeVisible();
		// Profil po #5: tylko 2 selecty (uczelnia, semestr) — cel zniknął z tego kroku.
		await expect(page.getByRole("combobox")).toHaveCount(2);
	});
});
