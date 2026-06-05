// @vitest-environment jsdom
/**
 * Strumień E (#5) — front-seam: cel ustalony w Kroku 0 (Pomocnik) dociera do body
 * POST /api/onboarding (a NIE z usuniętego pola Profilu).
 *
 * To druga warstwa testu realnej ścieżki (split-frontend-backend): tu front (realny
 * OnboardingWizard) z przechwyconym fetch; styk z bazą pokrywa
 * src/app/api/onboarding/__tests__/onboarding-career-goal-krok0.integration.test.ts.
 *
 * Stub Pomocnika oddaje cel przez onCareerGoalChosen — jak wybór ścieżki przez studenta.
 * Dowodzimy też: numeracja kroków przesunięta o Krok 0 (wizard startuje na Kroku 0,
 * Profil nie ma już selektu celu — tylko 2 comboboxy: uczelnia + semestr).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "../onboarding-wizard";

const KROK0_GOAL = "Data Analyst";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

// Pomocnik (Krok 0) ma własny przepływ sieciowy — tu stub oddający cel callbackiem.
vi.mock("@/components/career-helper/career-helper-flow", () => ({
	CareerHelperFlow: ({ onCareerGoalChosen }: { onCareerGoalChosen?: (l: string) => void }) => (
		<button type="button" onClick={() => onCareerGoalChosen?.(KROK0_GOAL)}>
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

beforeEach(() => {
	vi.clearAllMocks();
});

describe("OnboardingWizard — Krok 0 (Pomocnik) → cel kariery dociera do submitu", () => {
	it("body /api/onboarding niesie careerGoal ustalony w Kroku 0 (nie z Profilu)", async () => {
		let onboardingBody: Record<string, unknown> | null = null;
		const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
			if (url === "/api/syllabus/parse" && opts?.method === "POST") {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ competencies: ["A", "B", "C", "D", "E"] }),
				} as Response);
			}
			if (url === "/api/onboarding" && opts?.method === "POST") {
				onboardingBody = JSON.parse(opts.body as string);
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true, studentId: "stu-1" }),
				} as Response);
			}
			return Promise.resolve({
				ok: false,
				status: 404,
				json: () => Promise.resolve({}),
			} as Response);
		});
		vi.stubGlobal("fetch", fetchMock);

		const user = userEvent.setup();
		render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);

		// Krok 0 — Pomocnik (stub) oddaje cel kariery → wizard wchodzi w Profil.
		await user.click(screen.getByRole("button", { name: /Wybierz cel \(stub\)/i }));

		// Krok 1 — Profil BEZ celu: tylko 2 comboboxy (uczelnia [0], semestr [1]).
		const combos = screen.getAllByRole("combobox");
		expect(combos).toHaveLength(2);
		await user.click(combos[0]);
		await user.click(await screen.findByRole("option", { name: "WSB Merito Gdańsk" }));
		await user.type(screen.getByPlaceholderText(/np\. Informatyka/), "Informatyka");
		await user.click(screen.getAllByRole("combobox")[1]);
		await user.click(await screen.findByRole("option", { name: "4" }));
		await user.click(screen.getByRole("button", { name: /Dalej/i }));

		// Krok 2 — Sylabus (≥100 znaków) → Analizuj → kompetencje → Krok 3.
		const textarea = screen.getByRole("textbox");
		await user.click(textarea);
		await user.paste("x".repeat(150));
		await user.click(screen.getByRole("button", { name: /Analizuj|Przeanalizuj/i }));
		await screen.findByText("Twoje kompetencje");

		// Krok 3 — submit.
		await user.click(screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }));

		// DOWÓD (anty-mask): body submitu ma wartość celu z Kroku 0, nie pusty/inny.
		await vi.waitFor(() => {
			expect(onboardingBody).not.toBeNull();
		});
		expect((onboardingBody as unknown as Record<string, unknown>).careerGoal).toBe(KROK0_GOAL);
	});

	it("powrót Krok 1 → Krok 0: przycisk Wstecz wraca do Pomocnika (cel edytowalny, HITL §3.3)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) }),
		);
		const user = userEvent.setup();
		render(<OnboardingWizard user={{ id: "u1", name: "T", email: "t@t.pl" }} />);

		// Krok 0 → Krok 1.
		await user.click(screen.getByRole("button", { name: /Wybierz cel \(stub\)/i }));
		// Mikrokopia HITL widoczna na Profilu: cel z Kroku 0.
		expect(screen.getByText(new RegExp(KROK0_GOAL))).toBeInTheDocument();
		// Wstecz → Krok 0 (Pomocnik stub znów widoczny).
		await user.click(screen.getByRole("button", { name: /Wstecz/i }));
		expect(screen.getByRole("button", { name: /Wybierz cel \(stub\)/i })).toBeInTheDocument();
	});
});
