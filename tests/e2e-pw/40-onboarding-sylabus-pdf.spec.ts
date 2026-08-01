import { expect } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import { resetOnboardingState } from "./helpers/db-reset";
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
 * Krok 0 „Cel kariery" (strumień E / #5) przez DETERMINISTYCZNY picker 23 realnych
 * ścieżek („lub wybierz z listy", D1 — onboarding-wizard.tsx:625–640).
 *
 * DLACZEGO NIE PRZEZ POMOCNIKA (zmiana 2026-08-01, naprawa defektu testu z przebiegu
 * CI 30579719642). Ten spec bada UPLOAD SYLABUSA, a nie Pomocnika. Przejeżdżanie
 * przez ankietę i 9 tur rozmowy tylko po to, żeby ustawić cel kariery, wnosiło tu
 * dwie rzeczy i obie złe: ~10 zbędnych wywołań modelu na test ORAZ cudzą losowość —
 * gdy model zwrócił obiekt niezgodny ze schematem, produkt uczciwie degradował
 * („Coś poszło nie tak z podsumowaniem"), a ten spec padał w miejscu, które z
 * sylabusem nie ma nic wspólnego (klikał kartę „Wybieram tę ścieżkę", której na
 * ekranie błędu nie ma). Picker zdejmuje tę zmienną — dokładnie tak, jak zrobił to
 * wcześniej spec 20 (20-b1-b4, komentarz „świadomie NIE przez czat Pomocnika").
 *
 * CZEGO TEN SPEC PRZEZ TO NIE PILNUJE: przepływu Pomocnika w trybie osadzonym.
 * Pilnuje go spec 10 (describe „Pomocnik jako Krok 0 onboardingu") — i to jest jego
 * praca, nie tego pliku. Tu nie ubywa pokrycia, ubywa duplikat z losowością.
 */
async function passKrok0CelKariery(page: import("@playwright/test").Page): Promise<void> {
	// Krok 0 — nagłówek wizarda nad Pomocnikiem i pickerem (spec §4).
	await expect(page.getByRole("heading", { name: /Zacznijmy od celu/i })).toBeVisible({
		timeout: 15_000,
	});
	// Pasek postępu: krok „Cel kariery" widoczny jako pierwszy (spec §2/§4).
	await expect(page.getByText("Cel kariery").first()).toBeVisible();

	// Picker 23 ścieżek: klik ustawia careerGoal w pamięci wizarda i przechodzi do Kroku 1.
	await page.getByRole("button", { name: "Data Analyst", exact: true }).click();

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
 * WYMAGA wcześniejszego przejścia Kroku 0 (passKrok0CelKariery) — bez ustalonego
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

	// „Dalej" DOKŁADNIE (nie /Dalej/i — to łapie też „Idź dalej…") i dopiero gdy
	// wizard uzna Profil za kompletny. Bez tej bramki nieudane wpisanie któregoś pola
	// dawało pad dopiero na braku nagłówka kroku 2 — komunikat mylący co do przyczyny
	// (wzorzec z 20-b1-b4, gdzie ta sama sekwencja jest już asertowana na enabled).
	const dalej = page.getByRole("button", { name: /^Dalej$/ });
	await expect(
		dalej,
		`Profil wypełniony, a „Dalej" wciąż nieaktywne — któreś pole (uczelnia / kierunek / semestr) nie zarejestrowało się w stanie wizarda.`,
	).toBeEnabled({ timeout: 15_000 });
	await dalej.click();
	// Nagłówek kroku 2 po redesignie „realny rynek" (Partia 4/D4): sylabus jest
	// OPCJONALNY i adnotuje katalog — stary nagłówek „Wgraj swój sylabus" nie istnieje.
	await expect(page.getByRole("heading", { name: /Sylabus \(opcjonalny\)/i })).toBeVisible({
		timeout: 15_000,
	});
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

// @llm na całym describe: drugi test realnie analizuje PDF modelem (parseSyllabus),
// więc bez klucza nie ma czego mierzyć. Krok 0 od 2026-08-01 modelu NIE woła (picker
// 23 ścieżek zamiast rozmowy Pomocnika — patrz passKrok0CelKariery), więc pierwszy
// test technicznie przeszedłby i bez klucza. Zostawiamy go pod tym samym guardem
// świadomie: nocny job wybiera testy przez --grep "@llm" i spec 40 nie biega w żadnym
// innym jobie — wyjęcie go z @llm oznaczałoby, że nie biega NIGDZIE. Przeniesienie
// do taniego joba e2e @dbwrite na PR = decyzja o topologii jobów (Ethan, ADR).
test.describe("@dbwrite @llm Onboarding — Krok 0 + upload sylabusa PDF (błędy #5, #2, warstwa klienta)", () => {
	test.skip(
		!process.env.ANTHROPIC_API_KEY && process.env.E2E_LLM_AVAILABLE !== "1",
		"Analiza sylabusa (krok 2) woła model. Ustaw E2E_LLM_AVAILABLE=1, gdy serwer ma ANTHROPIC_API_KEY.",
	);

	test("po naprawie: sam PDF (bez tekstu) odblokowuje analizę — klient NIE blokuje ścieżki plikowej", async ({
		page,
	}) => {
		// Krok 0 przez picker = zero wywołań modelu; budżet zostaje na wolne CI i upload.
		test.setTimeout(120_000);
		// Konto b4 współdzielone ze specami 10/20 — reset przywraca Krok 0 (db-reset.ts).
		await resetOnboardingState("b4");
		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		await passKrok0CelKariery(page);
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
		// Ścieżka woła model RAZ: parseSyllabus (upload). Krok 0 idzie deterministycznym
		// pickerem, więc losowość Pomocnika nie wchodzi już do testu o sylabusie. Bez klucza
		// API na serwerze cały describe się skipuje (guard wyżej).
		test.setTimeout(180_000);

		// Jak wyżej: samowystarczalność wobec współdzielonego konta b4.
		await resetOnboardingState("b4");
		await loginWithPassword(page, "b4");
		await page.goto("/onboarding");

		await passKrok0CelKariery(page);
		await fillProfileAndGoToSyllabus(page);
		await uploadPdfAndAnalyze(page);

		// Kotwica punktu pomiaru: potwierdza, że DOSZLIŚMY do miejsca asercji (krok sylabusa,
		// plik wgrany) — po naprawie przejście do kroku kompetencji ma wynikać z realnej analizy
		// PDF, nie z przeskoczenia kroku. Test charakteryzacji wyżej (sam-PDF-bez-tekstu) został
		// po stronie integracyjnej przeniesiony na kontrakt 200; tu dowodzimy pełnej ścieżki UI.
		await expect(page).toHaveURL(/\/onboarding/);

		// CEL: plik PDF realnie przeanalizowany → przejście do kroku kompetencji.
		//
		// Rozróżnienie „produkt odmówił" od „produkt wisi" (ta sama lekcja, co przy
		// podsumowaniu Pomocnika): analiza sylabusa NIE ma stanu uczciwego degrade'u,
		// który pozwalałby iść dalej — porażka to komunikat błędu i pozostanie na kroku 2.
		// Ścigamy więc nagłówek sukcesu z komunikatem błędu: gdy wygra błąd, pad mówi
		// WPROST, co się stało, zamiast po 60 s zgłaszać nierozróżnialny timeout.
		const krokKompetencji = page.getByRole("heading", { name: /Twoje kompetencje/i });
		const bladAnalizy = page.getByText(
			/Nie udało się przeanalizować sylabusa|Wgraj plik PDF albo wklej|Wypełnij wszystkie wymagane pola/i,
		);
		await expect(krokKompetencji.or(bladAnalizy).first()).toBeVisible({ timeout: 60_000 });
		await expect(
			krokKompetencji,
			`Analiza sylabusa nie powiodła się: wizard pokazał komunikat błędu i został na kroku 2. ` +
				`To NIE jest zawieszenie — trasa /api/syllabus/parse odpowiedziała odmową (log serwera: ` +
				`syllabus.parse). Sprawdź, czy PDF ma wyciągalny tekst i czy warstwa modelu odpowiada.`,
		).toBeVisible({ timeout: 30_000 });
	});
});
