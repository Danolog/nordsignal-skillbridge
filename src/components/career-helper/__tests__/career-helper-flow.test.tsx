// @vitest-environment jsdom
/**
 * CareerHelperFlow — wybór trybu po „wybrano ścieżkę" (G + onboarding).
 * Stubujemy 3 ekrany, sterujemy fazą i sprawdzamy WIRING:
 *   - standalone w trakcie onboardingu → push("/onboarding") (select-path robi SummaryScreen),
 *   - standalone PO ukończeniu (zmiana kierunku) → push("/onboarding?mode=change&goal=…")
 *     i persistOnSelect=false (NIE nadpisujemy celu bez przeliczenia),
 *   - embedded → callback, bez push.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CareerHelperFlow } from "../career-helper-flow";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Survey nieużywany (startujemy z initialSessionId → faza chat).
vi.mock("../survey-screen", () => ({ SurveyScreen: () => <div>survey</div> }));

// ChatScreen stub: przycisk „pokaż podsumowanie" wywołuje onShowSummary.
vi.mock("../chat-screen", () => ({
	ChatScreen: ({ onShowSummary }: { onShowSummary: (s: unknown) => void }) => (
		<button type="button" onClick={() => onShowSummary({ judged: true, careerPaths: [] })}>
			pokaż podsumowanie
		</button>
	),
}));

// SummaryScreen stub: ujawnia persistOnSelect i wywołuje onSelectPathDone z etykietą.
vi.mock("../summary-screen", () => ({
	SummaryScreen: ({
		persistOnSelect,
		onSelectPathDone,
	}: {
		persistOnSelect?: boolean;
		onSelectPathDone: (l: string) => void;
	}) => (
		<div>
			<span data-testid="persist">{String(persistOnSelect)}</span>
			<button type="button" onClick={() => onSelectPathDone("Backend Developer")}>
				wybierz ścieżkę
			</button>
		</div>
	),
}));

beforeEach(() => {
	vi.clearAllMocks();
});

// Faza startowa = „chat" (initialSessionId). Najpierw przejdź do podsumowania,
// dopiero wtedy SummaryScreen (i testid „persist") jest w DOM.
async function goToSummary() {
	await userEvent.click(screen.getByRole("button", { name: "pokaż podsumowanie" }));
}

describe("CareerHelperFlow — routing po wyborze ścieżki", () => {
	it("standalone PO ukończeniu (G) → push do wizarda w trybie change z celem, persistOnSelect=false", async () => {
		render(<CareerHelperFlow initialSessionId="s1" onboardingCompleted={true} />);
		await goToSummary();
		expect(screen.getByTestId("persist")).toHaveTextContent("false");
		await userEvent.click(screen.getByRole("button", { name: "wybierz ścieżkę" }));
		expect(push).toHaveBeenCalledWith("/onboarding?mode=change&goal=Backend%20Developer");
	});

	it("standalone w trakcie onboardingu → push('/onboarding'), persistOnSelect=true", async () => {
		render(<CareerHelperFlow initialSessionId="s1" onboardingCompleted={false} />);
		await goToSummary();
		expect(screen.getByTestId("persist")).toHaveTextContent("true");
		await userEvent.click(screen.getByRole("button", { name: "wybierz ścieżkę" }));
		expect(push).toHaveBeenCalledWith("/onboarding");
	});

	it("embedded → callback z etykietą, bez push (cel płynie do POST /api/onboarding)", async () => {
		const onCareerGoalChosen = vi.fn();
		render(<CareerHelperFlow initialSessionId="s1" onCareerGoalChosen={onCareerGoalChosen} />);
		await goToSummary();
		expect(screen.getByTestId("persist")).toHaveTextContent("false");
		await userEvent.click(screen.getByRole("button", { name: "wybierz ścieżkę" }));
		expect(onCareerGoalChosen).toHaveBeenCalledWith("Backend Developer");
		expect(push).not.toHaveBeenCalled();
	});
});
