// @vitest-environment jsdom
/**
 * Krok 3 wizarda po PRZEBUDOWIE Partii 4 — scalony wybór kompetencji RYNKU + poziom.
 *
 * FLIP bramy #3: dawniej przycisk „Zatwierdź" był zablokowany poniżej 5 kompetencji.
 * Teraz próg ZNIESIONY (D5): student domyka krok z 0 zaznaczeń (0% pokrycia = uczciwy
 * start juniora, cały rynek jako luki). Przycisk blokuje TYLKO ładowanie/zapis katalogu.
 *
 * Testujemy REALNY render OnboardingWizard (RTL), dochodząc do kroku 3 realną ścieżką
 * (picker celu → profil → pominięcie sylabusa) i karmiąc krok 3 katalogiem z mocka
 * GET /api/onboarding/market-catalog. Sprawdzamy:
 *   - przycisk „Zatwierdź" ENABLED przy 0 zaznaczeń (sedno flipu);
 *   - nagłówek pokrycia (9c B1) 0% przy starcie + pusty stan zachęcający (nie „0/5");
 *   - zaznaczenie poziomu podnosi pokrycie i licznik „Zaznaczono X z N";
 *   - cel spoza 23 realnych ścieżek (isRealCareerGoal=false) → prośba o wybór realnej;
 *   - trwające ładowanie katalogu blokuje przycisk (catalogLoading).
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "../onboarding-wizard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

// Pomocnik (Krok 0) ma własny przepływ sieciowy — stub oddaje cel przez callback.
vi.mock("@/components/career-helper/career-helper-flow", () => ({
	CareerHelperFlow: ({ onCareerGoalChosen }: { onCareerGoalChosen?: (l: string) => void }) => (
		<button type="button" onClick={() => onCareerGoalChosen?.("Data Analyst")}>
			Wybierz cel (stub)
		</button>
	),
}));

beforeAll(() => {
	if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
	Element.prototype.scrollIntoView = vi.fn();
	if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = vi.fn();
	if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = vi.fn();
});

const CATALOG_ITEMS = [
	{ competencyName: "SQL", demandPercentage: 90, category: "Dane" },
	{ competencyName: "Python", demandPercentage: 70, category: "Język" },
	{ competencyName: "Pandas", demandPercentage: 40, category: "Biblioteka" },
	{ competencyName: "Statystyka", demandPercentage: 30, category: "Teoria" },
];

type CatalogResponse = {
	isRealCareerGoal: boolean;
	items: { competencyName: string; demandPercentage: number; category: string }[];
};

/**
 * Mock fetch: PATCH /progress (autosave) + GET market-catalog. `catalog` = odpowiedź
 * katalogu; `pending` (opcjonalnie) zwraca nigdy-nierozwiązujący się GET (stan ładowania).
 */
function mockFetch(
	catalog: CatalogResponse,
	opts?: { pending?: boolean; syllabusNames?: string[] },
) {
	const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
		if (url === "/api/onboarding/progress" && init?.method === "PATCH") {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true }),
			} as Response);
		}
		// Analiza sylabusa → ADNOTACJA (nazwy „w programie"), nie generator listy (D4).
		if (url === "/api/syllabus/parse" && init?.method === "POST") {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ competencies: opts?.syllabusNames ?? [] }),
			} as Response);
		}
		if (url.startsWith("/api/onboarding/market-catalog")) {
			if (opts?.pending) return new Promise<Response>(() => {}); // nigdy nie rozwiązany
			return Promise.resolve({ ok: true, json: () => Promise.resolve(catalog) } as Response);
		}
		return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

/** Picker (stub) → profil → ANALIZA sylabusa (≥100 znaków) → krok 3 (adnotacja). */
async function goToStep3ViaAnalyze(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: /Wybierz cel \(stub\)/i }));
	await user.click(screen.getAllByRole("combobox")[0]);
	await user.click(await screen.findByRole("option", { name: "WSB Merito Gdańsk" }));
	await user.type(screen.getByPlaceholderText(/np\. Informatyka/), "Informatyka");
	await user.click(screen.getAllByRole("combobox")[1]);
	await user.click(await screen.findByRole("option", { name: "4" }));
	await user.click(screen.getByRole("button", { name: /Dalej/i }));

	// Krok 2 — wklej sylabus (≥100 znaków) i kliknij „Analizuj sylabus".
	const textarea = screen.getByRole("textbox");
	await user.click(textarea);
	await user.paste("x".repeat(150));
	await user.click(await screen.findByRole("button", { name: /Analizuj sylabus/i }));
}

/** Picker celu (stub) → profil → pominięcie sylabusa → krok 3 (Kompetencje). */
async function goToStep3(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: /Wybierz cel \(stub\)/i }));

	// Krok 1 — profil (bez celu: 2 comboboxy — uczelnia [0], semestr [1]).
	await user.click(screen.getAllByRole("combobox")[0]);
	await user.click(await screen.findByRole("option", { name: "WSB Merito Gdańsk" }));
	await user.type(screen.getByPlaceholderText(/np\. Informatyka/), "Informatyka");
	await user.click(screen.getAllByRole("combobox")[1]);
	await user.click(await screen.findByRole("option", { name: "4" }));
	await user.click(screen.getByRole("button", { name: /Dalej/i }));

	// Krok 2 — sylabus opcjonalny: pomijamy (katalog rynku i tak dostajemy).
	await user.click(await screen.findByRole("button", { name: /Pomiń sylabus/i }));
}

function submitButton() {
	return screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i });
}

beforeEach(() => {
	vi.clearAllMocks();
});

const TEST_TIMEOUT = 20_000;

describe("Krok 3 (Partia 4) — próg min-5 zniesiony, wybór z katalogu rynku", () => {
	it(
		"0 zaznaczeń: przycisk Zatwierdź ENABLED, pokrycie 0%, pusty stan zachęcający (nie „0/5”)",
		async () => {
			mockFetch({ isRealCareerGoal: true, items: CATALOG_ITEMS });
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);

			// Katalog wczytany — nagłówek pokrycia widoczny.
			await screen.findByText(/pokrycia kompetencji wymaganych przez rynek dla roli Data Analyst/i);

			// SEDNO FLIPU: 0 zaznaczeń, a przycisk i tak aktywny (dawniej disabled < 5).
			expect(submitButton()).toBeEnabled();
			// Pokrycie 0% (nagłówek 9c B1) — region z aria-label.
			expect(
				screen.getByRole("region", {
					name: /Pokrycie kompetencji wymaganych przez rynek: 0 procent/i,
				}),
			).toBeInTheDocument();
			// Pusty stan = zachęta, nie „0/5".
			expect(screen.getByText(/Zaznacz to, co już potrafisz/i)).toBeInTheDocument();
			expect(screen.getByText(/Zaznaczono 0 z 4 kompetencji rynku/i)).toBeInTheDocument();
			// Brak jakiegokolwiek komunikatu progu „min. 5".
			expect(screen.queryByText(/min\.?\s*5 kompetencji/i)).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		"zaznaczenie poziomu podnosi pokrycie i licznik; przycisk pozostaje aktywny",
		async () => {
			mockFetch({ isRealCareerGoal: true, items: CATALOG_ITEMS });
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);
			await screen.findByText(/pokrycia kompetencji wymaganych przez rynek/i);

			// Zaznacz „Średni" (poziom 3 → waga 1.0) dla SQL: 1/4 → 25% pokrycia.
			const sqlGroup = screen.getByRole("group", { name: "Poziom: SQL" });
			await user.click(within(sqlGroup).getByRole("button", { name: "Średni" }));

			expect(
				screen.getByRole("region", {
					name: /Pokrycie kompetencji wymaganych przez rynek: 25 procent/i,
				}),
			).toBeInTheDocument();
			expect(screen.getByText(/Zaznaczono 1 z 4 kompetencji rynku/i)).toBeInTheDocument();
			expect(submitButton()).toBeEnabled();
		},
		TEST_TIMEOUT,
	);

	it(
		"cel spoza 23 realnych ścieżek (isRealCareerGoal=false) → prośba o wybór realnej, brak listy",
		async () => {
			mockFetch({ isRealCareerGoal: false, items: [] });
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);

			// Komunikat „nie mamy katalogu — wróć i wybierz realną ścieżkę".
			expect(
				await screen.findByText(/nie mamy jeszcze katalogu kompetencji z rynku/i),
			).toBeInTheDocument();
			// Brak nagłówka pokrycia (lista się nie renderuje).
			expect(screen.queryByText(/Zaznaczono \d+ z \d+ kompetencji rynku/i)).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		"MUST-FIX: cel spoza 23 ścieżek / pusty katalog → przycisk Zatwierdź DISABLED (zakaz submit-on-empty)",
		async () => {
			// Wejście Pomocnikiem z celem spoza 23 ścieżek → katalog pusty, isRealCareerGoal=false.
			mockFetch({ isRealCareerGoal: false, items: [] });
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);

			// Krok pokazuje bursztynowy komunikat (katalog pusty / cel nierealny) zamiast listy.
			await screen.findByText(/nie mamy jeszcze katalogu kompetencji z rynku/i);

			// SEDNO: nie wolno domknąć onboardingu pustym paszportem + nierealnym careerGoal.
			// Warunek wyłączenia = pusty katalog / nierealny cel, NIE liczba zaznaczeń (≠ flip min-5→0).
			expect(submitButton()).toBeDisabled();
		},
		TEST_TIMEOUT,
	);

	it(
		"trwające ładowanie katalogu blokuje przycisk Zatwierdź (catalogLoading)",
		async () => {
			mockFetch({ isRealCareerGoal: true, items: CATALOG_ITEMS }, { pending: true });
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);

			// GET katalogu wisi → catalogLoading=true → przycisk zablokowany, szkielet aria-busy.
			expect(submitButton()).toBeDisabled();
			expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
		},
		TEST_TIMEOUT,
	);

	it(
		"analiza sylabusa → przejście do kroku 3 + adnotacja „w programie studiów” (D4, bez NPE annotacji)",
		async () => {
			// Sylabus zwraca SQL → tylko SQL z katalogu dostaje plakietkę „w programie studiów".
			mockFetch({ isRealCareerGoal: true, items: CATALOG_ITEMS }, { syllabusNames: ["SQL"] });
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3ViaAnalyze(user);

			// Doszliśmy do kroku 3 (analiza → advanceTo(3)); katalog wczytany.
			await screen.findByText(/pokrycia kompetencji wymaganych przez rynek/i);

			// Plakietka „w programie studiów" TYLKO w wierszu SQL (z sylabusa) — annotateWithSyllabus
			// zadziałało i NIE wywaliło się na pustym/undefined wejściu (regresja R1). Szukamy w
			// obrębie <li>, bo sama fraza pada też w opisie nagłówka (poza wierszami).
			const sqlRow = screen.getByRole("group", { name: "Poziom: SQL" }).closest("li");
			const pythonRow = screen.getByRole("group", { name: "Poziom: Python" }).closest("li");
			expect(within(sqlRow as HTMLElement).getByText(/w programie studiów/i)).toBeInTheDocument();
			expect(
				within(pythonRow as HTMLElement).queryByText(/w programie studiów/i),
			).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);
});
