// @vitest-environment jsdom
/**
 * Brama #3 (front) — granica progu 4→5 kompetencji w kroku 3 wizarda onboardingu.
 *
 * Testujemy REALNY render OnboardingWizard (RTL, nie atrapa logiki):
 * - przycisk "Zatwierdź i przejdź dalej" disabled przy 4 wypełnionych, enabled przy 5
 *   (to jest sedno #3: isStep3Valid = filledCount >= MIN_COMPETENCIES w wizardzie);
 * - licznik "X/5" i komunikat progu / sukcesu (StepCompetencies, renderowany przez wizard);
 * - whitespace/pusta nazwa NIE liczy się do progu (4 realne + 1 pusta = wciąż disabled,
 *   bo filter używa c.name.trim()).
 *
 * Dotarcie do kroku 3: przez realną ścieżkę wizarda
 *   krok 1 (profil, Radix Select przez userEvent) → krok 2 (sylabus) →
 *   handleAnalyze (mock POST /api/syllabus/parse zwraca N kompetencji) → krok 3.
 * Nie wstrzykujemy stanu — wizard sam ustawia competencies z odpowiedzi analizy,
 * więc liczność kompetencji w kroku 3 = liczność z mocka (sterujemy granicą 4 vs 5).
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §1 (próg min. 5).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "../onboarding-wizard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

// Krok 0 (Pomocnik) ma własny przepływ sieciowy (ankieta→czat→podsumowanie); nie jest
// przedmiotem tego testu (brama #3 = próg kompetencji w kroku 3). Stub CareerHelperFlow
// natychmiast oddaje cel przez callback — tak jak po wyborze ścieżki przez studenta.
vi.mock("@/components/career-helper/career-helper-flow", () => ({
	CareerHelperFlow: ({ onCareerGoalChosen }: { onCareerGoalChosen?: (l: string) => void }) => (
		<button type="button" onClick={() => onCareerGoalChosen?.("Data Analyst")}>
			Wybierz cel (stub)
		</button>
	),
}));

// Radix Select w jsdom wymaga tych stubów (pointer capture + scrollIntoView).
beforeAll(() => {
	if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
	Element.prototype.scrollIntoView = vi.fn();
	if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = vi.fn();
	if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = vi.fn();
});

/** Mock fetch: POST /api/syllabus/parse zwraca `count` kompetencji (sterowanie granicą). */
function mockSyllabusParse(competencyNames: string[]) {
	const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
		// Autosave kroków 1–2 (fala B): „Dalej" (profil) i „Analizuj" (sylabus) wołają PATCH /progress.
		if (url === "/api/onboarding/progress" && opts?.method === "PATCH") {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true }),
			} as Response);
		}
		if (url === "/api/syllabus/parse" && opts?.method === "POST") {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ competencies: competencyNames }),
			} as Response);
		}
		return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

/** Przeprowadza wizard z kroku 0 (Pomocnik stub) do kroku 3 (analiza sylabusa daje kompetencje). */
async function goToStep3(user: ReturnType<typeof userEvent.setup>) {
	// Krok 0 — Pomocnik (stub): klik oddaje cel kariery, wizard przechodzi do Profilu.
	await user.click(screen.getByRole("button", { name: /Wybierz cel \(stub\)/i }));

	// Krok 1 — profil (Radix Select przez userEvent + input kierunku). Bez celu kariery:
	// tylko 2 comboboxy (uczelnia [0], semestr [1]).
	await user.click(screen.getAllByRole("combobox")[0]);
	await user.click(await screen.findByRole("option", { name: "WSB Merito Gdańsk" }));
	await user.type(screen.getByPlaceholderText(/np\. Informatyka/), "Informatyka");
	await user.click(screen.getAllByRole("combobox")[1]);
	await user.click(await screen.findByRole("option", { name: "4" }));
	await user.click(screen.getByRole("button", { name: /Dalej/i }));

	// Krok 2 — sylabus (≥100 znaków, żeby handleAnalyze nie odrzucił), klik "Analizuj".
	const syllabus = "x".repeat(150);
	const textarea = screen.getByRole("textbox");
	await user.click(textarea);
	await user.paste(syllabus);
	// Przycisk analizy — etykieta z StepSyllabus.
	const analyzeBtn = screen.getByRole("button", { name: /Analizuj|Przeanalizuj/i });
	await user.click(analyzeBtn);

	// Krok 3 — nagłówek "Twoje kompetencje".
	await screen.findByText("Twoje kompetencje");
}

function submitButton() {
	return screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i });
}

beforeEach(() => {
	vi.clearAllMocks();
});

// Pełna ścieżka wizarda przez userEvent (Radix Select + analiza sylabusa) jest
// kosztowna; przy równoległym przebiegu całego suite domyślne 5 s bywa za mało.
// Hojny limit per test eliminuje flake bez maskowania realnego renderu.
const TEST_TIMEOUT = 20_000;

describe("Brama #3 front — krok 3 wizarda, granica progu 4→5", () => {
	it(
		"4 kompetencje: przycisk Zatwierdź disabled, licznik 4/5, komunikat progu widoczny",
		async () => {
			mockSyllabusParse(["A", "B", "C", "D"]); // 4 realne
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);

			// Przycisk zablokowany poniżej progu (isStep3Valid = false).
			expect(submitButton()).toBeDisabled();
			// Licznik 4/5 — czytamy z tekstu dla czytnika ekranu (jednoznaczny, w odróżnieniu
			// od gołego "4", które koliduje z numerem kroku 4 w pasku postępu).
			expect(screen.getByText(/wybrano 4 z wymaganych 5 kompetencji/)).toBeInTheDocument();
			// Komunikat progu.
			expect(screen.getByText(/Pracodawcy oczekują min\. 5 kompetencji/)).toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		"5 kompetencji: przycisk Zatwierdź enabled, licznik 5/5, komunikat sukcesu",
		async () => {
			mockSyllabusParse(["A", "B", "C", "D", "E"]); // 5 realnych
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);

			expect(submitButton()).toBeEnabled();
			// Licznik 5/5 — tekst dla czytnika ekranu (minimum spełnione).
			expect(screen.getByText(/wybrano 5 kompetencji, minimum 5 spełnione/)).toBeInTheDocument();
			// Komunikat sukcesu (powyżej progu) zamiast progu.
			expect(
				screen.getByText(/Masz komplet 5.*podnosi Twoje szanse u pracodawcy/),
			).toBeInTheDocument();
			expect(screen.queryByText(/Pracodawcy oczekują min\. 5 kompetencji/)).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		"whitespace/pusta nazwa NIE liczy się do progu: 4 realne + 1 pusta = wciąż disabled, licznik 4/5",
		async () => {
			mockSyllabusParse(["A", "B", "C", "D", "   "]); // 4 realne + 1 whitespace
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);

			// 5 pól wejściowych w UI, ale tylko 4 liczą się do progu (trim()).
			const inputs = screen.getAllByPlaceholderText("Nazwa kompetencji...");
			expect(inputs).toHaveLength(5);

			// Przycisk wciąż disabled (filledCount = 4 < 5).
			expect(submitButton()).toBeDisabled();
			expect(screen.getByText(/wybrano 4 z wymaganych 5 kompetencji/)).toBeInTheDocument();
			expect(screen.getByText(/Pracodawcy oczekują min\. 5 kompetencji/)).toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		"przejście 4→5 na żywo: dopisanie 5. kompetencji odblokowuje przycisk",
		async () => {
			mockSyllabusParse(["A", "B", "C", "D"]); // start: 4
			const user = userEvent.setup();
			render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);
			await goToStep3(user);

			expect(submitButton()).toBeDisabled();

			// Dodaj 5. kompetencję i wpisz nazwę — przekroczenie progu.
			await user.click(screen.getByRole("button", { name: /Dodaj kompetencję/i }));
			const inputs = screen.getAllByPlaceholderText("Nazwa kompetencji...");
			expect(inputs).toHaveLength(5);
			await user.type(inputs[4], "E");

			// Teraz 5 realnych → enabled, licznik 5/5, komunikat sukcesu.
			expect(submitButton()).toBeEnabled();
			expect(screen.getByText(/wybrano 5 kompetencji, minimum 5 spełnione/)).toBeInTheDocument();
			expect(
				screen.getByText(/Masz komplet 5.*podnosi Twoje szanse u pracodawcy/),
			).toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);
});
