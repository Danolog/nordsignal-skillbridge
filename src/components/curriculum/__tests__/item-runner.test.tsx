// @vitest-environment jsdom
/**
 * 1E.6a — pętla pytań pozycji (R13: błąd NIE jest stanem końcowym):
 *  - błędna odpowiedź → feedback natychmiast, TO SAMO pytanie zostaje,
 *    kolejna próba możliwa (bez limitu),
 *  - poprawna → wyjaśnienie + „Dalej"; ostatnie pytanie → panel „zaliczona",
 *  - podpowiedzi odsłaniane po jednej, głębokość leci do serwera (hintDepth),
 *  - pytania już zaliczone nie wracają w pętli.
 *
 * fetch mockowany na granicy — kontrakt trasy dowodzi test integracyjny.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurriculumQuestion } from "@/lib/curriculum/item-view";
import { ItemRunner } from "../item-runner";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const questions: CurriculumQuestion[] = [
	{
		id: "q-1",
		type: "single_choice",
		stem: "Co robi print?",
		options: ["Wypisuje na ekran", "Drukuje na drukarce"],
	},
	{ id: "q-2", type: "single_choice", stem: "Co to komórka?", options: ["Pole", "Plik"] },
];

function renderRunner(overrides: Partial<React.ComponentProps<typeof ItemRunner>> = {}) {
	return render(
		<ItemRunner
			itemId="i-1"
			moduleId="m-1"
			questions={questions}
			answeredCorrectQuestionIds={[]}
			hints={["Podpowiedź pierwsza", "Podpowiedź druga"]}
			initialStatus="available"
			confidenceProbeEnabled={false}
			{...overrides}
		/>,
	);
}

function mockAnswer(body: Record<string, unknown>) {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => ({
			explanationMd: null,
			optionFeedbackMd: null,
			itemCompleted: false,
			moduleCompleted: false,
			...body,
		}),
	});
}

describe("ItemRunner", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("błędna odpowiedź: feedback natychmiast, pytanie zostaje, próbujesz dalej (R13)", async () => {
		const user = userEvent.setup();
		const fetchMock = mockAnswer({
			correct: false,
			optionFeedbackMd: "Nie — drukarka tu nie gra.",
		});
		vi.stubGlobal("fetch", fetchMock);

		renderRunner();
		await user.click(screen.getByLabelText("Drukuje na drukarce"));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		await waitFor(() => expect(screen.getByText(/Jeszcze nie/)).toBeInTheDocument());
		expect(screen.getByText(/drukarka tu nie gra/)).toBeInTheDocument();
		// Pytanie NIE zmieniło się i nadal można spróbować.
		expect(screen.getByText("Co robi print?")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Dalej" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sprawdź" })).toBeInTheDocument();
	});

	it("poprawna odpowiedź: wyjaśnienie i przejście do kolejnego pytania", async () => {
		const user = userEvent.setup();
		const fetchMock = mockAnswer({ correct: true, explanationMd: "Zgadza się — tekst na ekran." });
		vi.stubGlobal("fetch", fetchMock);

		renderRunner();
		await user.click(screen.getByLabelText("Wypisuje na ekran"));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		await waitFor(() => expect(screen.getByText("Dobrze")).toBeInTheDocument());
		expect(screen.getByText(/Zgadza się/)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Dalej" }));
		expect(screen.getByText("Co to komórka?")).toBeInTheDocument();
	});

	it("ostatnie pytanie poprawnie → panel zaliczenia pozycji (decyduje serwer)", async () => {
		const user = userEvent.setup();
		const fetchMock = mockAnswer({ correct: true, itemCompleted: true, moduleCompleted: true });
		vi.stubGlobal("fetch", fetchMock);

		renderRunner({ answeredCorrectQuestionIds: ["q-1"] });
		// Pytanie zaliczone wcześniej nie wraca w pętli.
		expect(screen.queryByText("Co robi print?")).not.toBeInTheDocument();
		await user.click(screen.getByLabelText("Pole"));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		await waitFor(() => expect(screen.getByText("Pozycja zaliczona")).toBeInTheDocument());
		expect(screen.getByText(/cały moduł/)).toBeInTheDocument();
		expect(mockRefresh).toHaveBeenCalled();
	});

	it("podpowiedzi: odsłaniane po jednej, głębokość idzie do serwera", async () => {
		const user = userEvent.setup();
		const fetchMock = mockAnswer({ correct: false });
		vi.stubGlobal("fetch", fetchMock);

		renderRunner();
		await user.click(screen.getByRole("button", { name: /Pokaż podpowiedź \(1\/2\)/ }));
		expect(screen.getByText("Podpowiedź pierwsza")).toBeInTheDocument();
		expect(screen.queryByText("Podpowiedź druga")).not.toBeInTheDocument();

		await user.click(screen.getByLabelText("Wypisuje na ekran"));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body).toMatchObject({ questionItemId: "q-1", hintDepth: 1, answer: { selected: 0 } });
	});

	it("pozycja już zaliczona: od razu panel zaliczenia, bez pytań", () => {
		vi.stubGlobal("fetch", vi.fn());
		renderRunner({ initialStatus: "completed" });
		expect(screen.getByText("Pozycja zaliczona")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Sprawdź" })).not.toBeInTheDocument();
	});

	// MIS.1 — sonda pewności (za flagą confidenceProbe, przekazywaną propsem).
	it("sonda pewności: bez deklaracji „Sprawdź” nie rusza; wybór idzie do serwera", async () => {
		const user = userEvent.setup();
		const fetchMock = mockAnswer({ correct: true });
		vi.stubGlobal("fetch", fetchMock);

		renderRunner({ confidenceProbeEnabled: true });
		await user.click(screen.getByLabelText("Wypisuje na ekran"));
		// Odpowiedź wybrana, pewność nie — przycisk zablokowany.
		expect(screen.getByRole("button", { name: "Sprawdź" })).toBeDisabled();

		await user.click(screen.getByRole("button", { name: "Chyba wiem" }));
		expect(screen.getByRole("button", { name: "Sprawdź" })).toBeEnabled();
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body).toMatchObject({ questionItemId: "q-1", confidence: 2 });
	});

	it("flaga off: sonda nie istnieje w drzewie, body bez pola confidence", async () => {
		const user = userEvent.setup();
		const fetchMock = mockAnswer({ correct: true });
		vi.stubGlobal("fetch", fetchMock);

		renderRunner();
		expect(screen.queryByText(/Jak pewny/)).not.toBeInTheDocument();
		await user.click(screen.getByLabelText("Wypisuje na ekran"));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body).not.toHaveProperty("confidence");
	});
});
