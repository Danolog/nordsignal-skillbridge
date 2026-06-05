import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { dbWriteTest as test } from "./helpers/guards";

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
 *   Krok 2 „Wgraj swój sylabus" pozwala wybrać PDF (przycisk „Analizuj sylabus"
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

const PROFILE = {
	university: "WSB Merito Gdańsk",
	fieldOfStudy: "Informatyka",
	semester: "4",
	careerGoal: "Data Analyst",
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

/** Wypełnia krok 1 (Profil) i przechodzi „Dalej" do kroku 2 (Sylabus). */
async function fillProfileAndGoToSyllabus(page: import("@playwright/test").Page): Promise<void> {
	// 3 radix-selecty w kolejności DOM: uczelnia(0), semestr(1), cel kariery(2).
	const combos = page.getByRole("combobox");
	await combos.nth(0).click();
	await page.getByRole("option", { name: PROFILE.university }).click();

	await page.getByPlaceholder(/Informatyka, Zarządzanie/i).fill(PROFILE.fieldOfStudy);

	await combos.nth(1).click();
	await page.getByRole("option", { name: PROFILE.semester, exact: true }).click();

	await combos.nth(2).click();
	await page.getByRole("option", { name: PROFILE.careerGoal, exact: true }).click();

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

test.describe("@dbwrite Onboarding — upload sylabusa PDF (błąd #2, warstwa klienta)", () => {
	test("stan obecny: sam PDF (bez tekstu) → błąd, kompetencje NIE generowane (pozorne LUB)", async ({
		page,
	}) => {
		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		await fillProfileAndGoToSyllabus(page);
		await uploadPdfAndAnalyze(page);

		// Klient ignoruje plik: walidacja tekstu blokuje, mimo wgranego PDF.
		await expect(page.getByText(/co najmniej 100 znaków/i)).toBeVisible();
		// Pozostajemy na kroku 2 — krok „Twoje kompetencje" NIE został osiągnięty.
		await expect(page.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeVisible();
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toHaveCount(0);
	});

	test("kontrakt docelowy: upload PDF zwraca krok kompetencji (brama strumienia C)", async ({
		page,
	}) => {
		// test.fail(): znany defekt. Zielony, DOPÓKI upload nie działa; po naprawie
		// strumienia C ta asercja przejdzie → test.fail zmieni się w czerwone (sygnał
		// „zdejmij test.fail, potwierdź naprawę"). Charakteryzacja wyżej (zielona)
		// dowodzi, że ścieżka do tego kroku działa — więc to luka zachowania, nie setup.
		test.fail();
		// Budżet testu > timeout asercji (60s), inaczej test.fail nie złapie czystego
		// failu asercji (config ma timeout 30s — za mało na 60s oczekiwanie).
		test.setTimeout(90_000);

		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		await fillProfileAndGoToSyllabus(page);
		await uploadPdfAndAnalyze(page);

		// Kotwica punktu pomiaru (N1, review Leo): potwierdza, że DOSZLIŚMY do miejsca
		// asercji (krok sylabusa, plik wgrany), więc czerwień docelowa bierze się z luki
		// zachowania, nie z błędu setupu zamaskowanego przez test.fail(). Strukturalny
		// de-mask pełni test charakteryzacji wyżej (osobny, BEZ test.fail). Przy zdejmowaniu
		// test.fail() po naprawie strumienia C: potwierdź, że czerwień to brak nagłówka
		// kompetencji, nie wcześniejszy krok.
		await expect(page).toHaveURL(/\/onboarding/);

		// CEL: plik PDF realnie przeanalizowany → przejście do kroku kompetencji.
		await expect(page.getByRole("heading", { name: /Twoje kompetencje/i })).toBeVisible({
			timeout: 60_000,
		});
	});
});
