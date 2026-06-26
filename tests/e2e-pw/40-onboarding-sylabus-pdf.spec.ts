import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { driveChatToSummaryCta } from "./helpers/b0-chat";
import { dbWriteTest as test } from "./helpers/guards";
import { fillSurveyAndContinue } from "./helpers/survey";

/**
 * @dbwrite — Z2 (Quinn, Agent QA): warstwa KLIENTA błędu #2 (upload sylabusa PDF).
 *
 * Para do testu integracyjnego serwera
 * (src/app/api/syllabus/parse/__tests__/syllabus-pdf-upload.integration.test.ts).
 * Tamten dowodzi, że SERWER nie umie pliku; ten dowodzi, że KLIENT go nie wysyła —
 * razem domykają „pozorne LUB" na całej ścieżce (lekcja split-frontend-backend:
 * test serwera zielony NIE znaczy, że interfejs realnie skonsumuje kontrakt).
 *
 * MECHANIKA BŁĘDU (onboarding-wizard.tsx handleAnalyze, step-syllabus.tsx):
 *   Krok 2 „Sylabus (opcjonalny)" pozwala wybrać PDF (przycisk „Analizuj sylabus"
 *   włącza się od samego pliku: canAnalyze = text>=100 || file). Ale handleAnalyze
 *   przy pustym polu tekstowym robi toast.error("co najmniej 100 znaków") i return —
 *   plik NIGDY nie jest czytany ani wysyłany. Upload PDF to ślepa uliczka.
 *
 * Konto: b4 (onboardingCompleted=FALSE) — jedyne, które wchodzi w /onboarding.
 * Koszt LLM: ŚCIEŻKA BŁĘDU NIE woła modelu (early return przed fetch) → NIE @llm.
 *   Po naprawie strumienia C upload zacznie wołać AI → wtedy dopisać @llm/skip.
 *
 * STRUKTURA (bliźniacza do testu integracyjnego):
 *   A. Charakteryzacja (ZIELONA dziś) — realne UI: upload-only → błąd + brak przejścia
 *      do kroku kompetencji. Dowodzi, że login+profil+nawigacja+upload działają, więc
 *      czerwień B to luka zachowania, nie flaky setup (de-ryzykuje masking test.fail).
 *   B. Kontrakt docelowy (test.fail — BRAMA strumienia C): upload PDF → krok 3
 *      „Twoje kompetencje". test.fail() jest zielony, DOPÓKI to nie działa; gdy
 *      strumień C naprawi wiring klient+serwer, test.fail SAM zmieni się w czerwone.
 *
 * Pole formularza / kontrakt uploadu — propozycja do potwierdzenia z Leo (G1).
 */

// Profil po #5 nie zbiera już celu kariery (przeniesiony do Kroku 0) — bez careerGoal.
const PROFILE = {
	university: "WSB Merito Gdańsk",
	fieldOfStudy: "Informatyka",
	semester: "4",
};

const SYLLABUS_TEXT =
	"Sylabus: Wprowadzenie do analizy danych. Python, biblioteka pandas, NumPy, " +
	"podstawy SQL i baz danych relacyjnych, statystyka opisowa, wizualizacja danych " +
	"(matplotlib), wersjonowanie kodu w Git oraz komunikacja wyników analizy.";

/** Realny PDF z wyciągalnym tekstem (jspdf, jak pdf-export.tsx) — Buffer dla setInputFiles. */
async function makeSyllabusPdfBuffer(text: string): Promise<Buffer> {
	// Interop ESM różni się między runnerami (vitest vs Playwright) — bierzemy named
	// export z fallbackiem na default, by konstruktor był stabilny w obu.
	const mod = (await import("jspdf")) as unknown as {
		jsPDF?: typeof import("jspdf").jsPDF;
		default?: typeof import("jspdf").jsPDF;
	};
	const JsPdf = mod.jsPDF ?? mod.default;
	if (!JsPdf) throw new Error("jspdf: brak konstruktora (ani named, ani default)");
	const doc = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
	doc.text(doc.splitTextToSize(text, 180), 10, 10);
	return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Krok 0 „Cel kariery" (strumień E / #5): Pomocnik osadzony w wizardzie ustala
 * careerGoal w pamięci. Przejście wymaga REALNEGO modelu (ankieta → czat 9 tur →
 * podsumowanie → wybór ścieżki) — Pomocnik nie ma deterministycznej zaślepki celu,
 * więc każda ścieżka przez Krok 0 jest @llm. Po wyborze karty wizard ustawia
 * profile.careerGoal i przechodzi do Kroku 1 (Profil — nagłówek „Opowiedz nam o sobie").
 */
async function passKrok0CareerHelper(page: import("@playwright/test").Page): Promise<void> {
	// Krok 0 — nagłówek wizarda nad osadzonym Pomocnikiem (spec §4).
	await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toBeVisible({
		timeout: 15_000,
	});
	// Pasek postępu: krok „Cel kariery" widoczny jako pierwszy (spec §2/§4).
	await expect(page.getByText("Cel kariery").first()).toBeVisible();

	// Pomocnik: ankieta → czat → podsumowanie (realny model).
	await fillSurveyAndContinue(page);
	await expect(page.getByRole("heading", { name: /krok 2 z 3: rozmowa/i })).toBeVisible({
		timeout: 45_000,
	});
	await driveChatToSummaryCta(page);
	await page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i }).click();

	// Ekran 3 — podsumowanie z kartami. Wybierz pierwszą ścieżkę i przejdź dalej.
	await expect(
		page.getByText(/Co rozumiem z naszej rozmowy/i).or(page.getByText(/Przygotuję to za chwilę/i)),
	).toBeVisible({ timeout: 150_000 });
	await page
		.getByText(/Wybieram tę ścieżkę/i)
		.first()
		.click();
	// „Idź dalej do samooceny" → tryb embedded woła onCareerGoalChosen (NIE select-path)
	// → wizard ustawia careerGoal w pamięci i przechodzi do Kroku 1 (Profil).
	await page.getByRole("button", { name: /Idź dalej do samooceny/i }).click();

	// Krok 1 — Profil. Mikrokopia HITL potwierdza, że cel z Kroku 0 jest w pamięci.
	await expect(page.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeVisible({
		timeout: 15_000,
	});
	await expect(page.getByText(/Twój cel kariery:/i)).toBeVisible();
}

/**
 * Wypełnia krok 1 (Profil) i przechodzi „Dalej" do kroku 2 (Sylabus).
 * Profil NIE ma już selecta celu kariery (przeniesiony do Kroku 0, spec §3.2):
 * tylko 2 radix-selecty w kolejności DOM — uczelnia(0), semestr(1).
 * WYMAGA wcześniejszego przejścia Kroku 0 (passKrok0CareerHelper) — bez ustalonego
 * celu wizard i tak nie wpuści do Profilu (isStep0Valid).
 */
async function fillProfileAndGoToSyllabus(page: import("@playwright/test").Page): Promise<void> {
	const combos = page.getByRole("combobox");
	await combos.nth(0).click();
	await page.getByRole("option", { name: PROFILE.university }).click();

	await page.getByPlaceholder(/Informatyka, Zarządzanie/i).fill(PROFILE.fieldOfStudy);

	await combos.nth(1).click();
	await page.getByRole("option", { name: PROFILE.semester, exact: true }).click();

	// Brak comboboxa celu kariery w Profilu (anti-regresja #5): potwierdzamy, że
	// pozostały tylko 2 selecty (cel zniknął z tego kroku).
	await expect(combos).toHaveCount(2);

	await page.getByRole("button", { name: /Dalej/i }).click();
	await expect(page.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeVisible();
}

/** Wgrywa PDF (bez wpisywania tekstu) i klika „Analizuj sylabus". */
async function uploadPdfAndAnalyze(page: import("@playwright/test").Page): Promise<void> {
	const pdf = await makeSyllabusPdfBuffer(SYLLABUS_TEXT);
	await page.locator('input[type="file"]').setInputFiles({
		name: "sylabus.pdf",
		mimeType: "application/pdf",
		buffer: pdf,
	});
	// Plik widoczny jako chip → przycisk analizy aktywny tylko dzięki plikowi (pole tekstowe puste).
	await expect(page.getByText("sylabus.pdf")).toBeVisible();
	await page.getByRole("button", { name: /Analizuj sylabus/i }).click();
}

// @llm na całym describe (zmiana strumienia E / #5): krok 2 „Sylabus" jest teraz
// osiągalny WYŁĄCZNIE przez Krok 0 (Pomocnik) → Profil → Sylabus. Krok 0 woła model
// (ankieta→czat→podsumowanie), nie ma deterministycznej zaślepki celu → cała ścieżka
// onboardingu od nowego studenta wymaga klucza. Bez ANTHROPIC_API_KEY oba testy skip
// (guard niżej). PRZED #5 pierwszy test był non-@llm (Profil był 1. ekranem); Krok 0
// to zmienił. Charakteryzacja „klient nie blokuje ścieżki plikowej" zostaje, ale jej
// punkt wejścia (krok Sylabus) jest już za bramą modelu.
test.describe("@dbwrite @llm Onboarding — Krok 0 + upload sylabusa PDF (błędy #5, #2, warstwa klienta)", () => {
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"Cała ścieżka onboardingu zaczyna się Krokiem 0 (Pomocnik — woła model). " +
			"Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma ANTHROPIC_API_KEY.",
	);

	test("po naprawie: sam PDF (bez tekstu) odblokowuje analizę — klient NIE blokuje ścieżki plikowej", async ({
		page,
	}) => {
		test.setTimeout(240_000); // Krok 0 to ~9 wywołań modelu (czat) + podsumowanie.
		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		await passKrok0CareerHelper(page);
		await fillProfileAndGoToSyllabus(page);

		const pdf = await makeSyllabusPdfBuffer(SYLLABUS_TEXT);
		await page.locator('input[type="file"]').setInputFiles({
			name: "sylabus.pdf",
			mimeType: "application/pdf",
			buffer: pdf,
		});

		// Plik widoczny jako chip; przycisk analizy aktywny od samego pliku (puste pole tekstowe).
		await expect(page.getByText("sylabus.pdf")).toBeVisible();
		await expect(page.getByRole("button", { name: /Analizuj sylabus/i })).toBeEnabled();
		// Stary błąd „atrapy" NIE pojawia się — nawet bez kliknięcia walidacja go nie pokazuje.
		await expect(page.getByText(/co najmniej 100 znaków/i)).toHaveCount(0);
		// Wciąż na kroku 2 (nie klikaliśmy analizy) — krok kompetencji osiąga test @llm niżej.
		await expect(page.getByRole("heading", { name: /Sylabus \(opcjonalny\)/i })).toBeVisible();
	});

	test("kontrakt docelowy: upload PDF zwraca krok kompetencji (po naprawie strumienia C)", async ({
		page,
	}) => {
		// test.fail() ZDJĘTY po naprawie strumienia C — upload PDF działa, test musi być zielony.
		// Ścieżka woła model dwukrotnie: Krok 0 (Pomocnik) + parseSyllabus (upload). Bez klucza
		// API na serwerze cały describe się skipuje (guard wyżej). Budżet duży: Krok 0 (czat) +
		// realna analiza PDF bywają wolne.
		test.setTimeout(300_000);

		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		await passKrok0CareerHelper(page);
		await fillProfileAndGoToSyllabus(page);
		await uploadPdfAndAnalyze(page);

		// Kotwica punktu pomiaru: potwierdza, że DOSZLIŚMY do miejsca asercji (krok sylabusa,
		// plik wgrany) — po naprawie przejście do kroku kompetencji ma wynikać z realnej analizy
		// PDF, nie z przeskoczenia kroku. Test charakteryzacji wyżej (sam-PDF-bez-tekstu) został
		// po stronie integracyjnej przeniesiony na kontrakt 200; tu dowodzimy pełnej ścieżki UI.
		await expect(page).toHaveURL(/\/onboarding/);

		// CEL: plik PDF realnie przeanalizowany → przejście do kroku kompetencji.
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible({
			timeout: 60_000,
		});
	});
});
