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
			hintsByQuestion={{}}
			hintsTotal={2}
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

/**
 * ADR-018 — runner woła DWA endpointy: `/answer` (ocena) i `/hint` (odsłonięcie).
 * Mock routuje po URL-u: `/hint` zwraca serwerową głębokość + treść, `/answer`
 * zwraca `answerBody`. `hintStatus` pozwala wymusić 429.
 */
function mockRoutedFetch(opts: {
	answerBody?: Record<string, unknown>;
	hintStatus?: number;
	hintBody?: { depth: number; hints: string[]; hasMore: boolean };
}) {
	return vi.fn().mockImplementation((url: string, _init?: RequestInit) => {
		if (String(url).endsWith("/hint")) {
			const status = opts.hintStatus ?? 200;
			return Promise.resolve({
				ok: status >= 200 && status < 300,
				status,
				json: async () =>
					opts.hintBody ?? { depth: 1, hints: ["Podpowiedź pierwsza"], hasMore: true },
			});
		}
		return Promise.resolve({
			ok: true,
			status: 200,
			json: async () => ({
				correct: false,
				explanationMd: null,
				optionFeedbackMd: null,
				itemCompleted: false,
				moduleCompleted: false,
				...opts.answerBody,
			}),
		});
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

	it("ADR-018: klik → POST /hint, render treści z serwera; ciało /answer BEZ hintDepth", async () => {
		const user = userEvent.setup();
		const fetchMock = mockRoutedFetch({});
		vi.stubGlobal("fetch", fetchMock);

		renderRunner();
		await user.click(screen.getByRole("button", { name: /Pokaż podpowiedź \(1\/2\)/ }));

		// Treść przyszła z serwera (`/hint`), nie z propsów pełnej listy.
		await waitFor(() => expect(screen.getByText("Podpowiedź pierwsza")).toBeInTheDocument());
		const hintCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/hint"));
		expect(hintCall).toBeDefined();
		expect(JSON.parse(hintCall?.[1].body)).toEqual({ questionItemId: "q-1" });

		// Odpowiedź: ciało NIE zawiera hintDepth (głębokość liczy serwer).
		await user.click(screen.getByLabelText("Wypisuje na ekran"));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));
		await waitFor(() =>
			expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/answer"))).toBe(true),
		);
		const answerCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/answer"));
		const body = JSON.parse(answerCall?.[1].body);
		expect(body).toMatchObject({ questionItemId: "q-1", answer: { selected: 0 } });
		expect(body).not.toHaveProperty("hintDepth");
	});

	it("ADR-018: 429 z /hint → komunikat po polsku (nie cicha cisza)", async () => {
		const user = userEvent.setup();
		const fetchMock = mockRoutedFetch({ hintStatus: 429 });
		vi.stubGlobal("fetch", fetchMock);

		renderRunner();
		await user.click(screen.getByRole("button", { name: /Pokaż podpowiedź \(1\/2\)/ }));
		await waitFor(() => expect(screen.getByText(/Za dużo podpowiedzi naraz/)).toBeInTheDocument());
	});

	it("ADR-018 (W-8b): zdanie o zapisie odsłonięć obecne przy pierwszym renderze, w aria-live", () => {
		vi.stubGlobal("fetch", mockRoutedFetch({}));
		renderRunner();
		const note = screen.getByText(/Odsłonięcie podpowiedzi zapisujemy/);
		expect(note).toBeInTheDocument();
		expect(note.closest("[aria-live]")).not.toBeNull();
	});

	it("ADR-018: już przyznane podpowiedzi (hintsByQuestion) widoczne bez klikania", () => {
		vi.stubGlobal("fetch", mockRoutedFetch({}));
		renderRunner({ hintsByQuestion: { "q-1": ["Podpowiedź pierwsza"] } });
		expect(screen.getByText("Podpowiedź pierwsza")).toBeInTheDocument();
		// Zostaje jeszcze 1 z 2 do odsłonięcia.
		expect(screen.getByRole("button", { name: /Pokaż podpowiedź \(2\/2\)/ })).toBeInTheDocument();
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

	// D-a11y-1 — po asynchronicznym odsłonięciu fokus przenosi się na nową
	// podpowiedź (tabIndex={-1} + ref), inaczej spadłby na <body>.
	it("D-a11y-1: po odsłonięciu podpowiedzi fokus trafia na nową podpowiedź (tabIndex -1)", async () => {
		const user = userEvent.setup();
		vi.stubGlobal("fetch", mockRoutedFetch({}));

		renderRunner();
		await user.click(screen.getByRole("button", { name: /Pokaż podpowiedź \(1\/2\)/ }));

		const hint = await screen.findByText("Podpowiedź pierwsza");
		const hintBox = hint.closest("[tabindex]");
		expect(hintBox).not.toBeNull();
		expect(hintBox).toHaveAttribute("tabindex", "-1");
		await waitFor(() => expect(hintBox).toHaveFocus());
	});

	// D-a11y-1 — region podpowiedzi niesie aria-busy (po odsłonięciu = false).
	it("D-a11y-1: region podpowiedzi ma aria-busy", () => {
		vi.stubGlobal("fetch", mockRoutedFetch({}));
		renderRunner();
		const note = screen.getByText(/Odsłonięcie podpowiedzi zapisujemy/);
		expect(note.closest("[aria-busy]")).not.toBeNull();
	});

	// D-a11y-2 — błąd hinta to przerwanie: role="alert" (assertive), a nie polite,
	// i wyjęty z regionu aria-live="polite", który go tłumił.
	it("D-a11y-2: błąd hinta (429) ogłaszany role=alert, poza regionem polite", async () => {
		const user = userEvent.setup();
		vi.stubGlobal("fetch", mockRoutedFetch({ hintStatus: 429 }));

		renderRunner();
		await user.click(screen.getByRole("button", { name: /Pokaż podpowiedź \(1\/2\)/ }));

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(/Za dużo podpowiedzi naraz/);
		expect(alert.closest('[aria-live="polite"]')).toBeNull();
	});
});
