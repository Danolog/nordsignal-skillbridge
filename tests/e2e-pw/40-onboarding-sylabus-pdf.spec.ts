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
	// Po naprawie strumienia C: charakteryzacja „atrapy" (sam PDF → błąd, brak generacji) już
	// NIEAKTUALNA. Ten test (BEZ @llm — nie woła modelu) dowodzi STRUKTURALNIE, że klient już
	// NIE blokuje ścieżki plikowej: po wgraniu PDF (puste pole tekstowe) przycisk analizy jest
	// aktywny i NIE pokazuje starego błędu „co najmniej 100 znaków". To kotwica de-mask dla testu
	// @llm niżej: ścieżka do realnej analizy jest osiągalna, więc ew. czerwień @llm to luka modelu,
	// nie zablokowany klient. NIE klikamy „Analizuj" tutaj — to wywołałoby model (osobny segment @llm).
	test("po naprawie: sam PDF (bez tekstu) odblokowuje analizę — klient NIE blokuje ścieżki plikowej", async ({
		page,
	}) => {
		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

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
		await expect(page.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeVisible();
	});

	test("@llm kontrakt docelowy: upload PDF zwraca krok kompetencji (po naprawie strumienia C)", async ({
		page,
	}) => {
		// test.fail() ZDJĘTY po naprawie strumienia C — upload PDF działa, test musi być zielony.
		// Tag @llm: po naprawie upload realnie woła model (parseSyllabus). Bez klucza API na
		// serwerze segment @llm się skipuje (konwencja e2e). Tu nie odpalany na żywo (wymaga
		// klucza) — flip strukturalny. Tag @dbwrite zostaje (describe): onboarding pisze do bazy.
		// Budżet testu > timeout asercji (60s): realne wywołanie modelu bywa wolne.
		test.setTimeout(90_000);

		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

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
