// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SummaryResponse } from "@/lib/career-helper/types";
import { SummaryScreen } from "../summary-screen";

const judged: SummaryResponse = {
	judged: true,
	judgedFor: "R2",
	summaryText: "Z tego, co powiedziałeś, ciągnie Cię do analizy i porządkowania danych.",
	careerPaths: [
		{ label: "Analityk danych", why: "Lubisz liczby i konkretne problemy." },
		{ label: "Product Manager", why: "Łączysz ludzi i organizujesz pracę." },
	],
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("SummaryScreen", () => {
	const handlers = {
		onSelectPathDone: vi.fn(),
		onBackToChat: vi.fn(),
		onRetrySummary: vi.fn(),
	};

	it("ready: disclaimer + streszczenie + karty, primary disabled do wyboru", () => {
		render(<SummaryScreen sessionId="s1" summary={judged} {...handlers} />);
		expect(screen.getByText("To NIE są rekomendacje")).toBeInTheDocument();
		expect(screen.getByText(/ciągnie Cię do analizy/)).toBeInTheDocument();
		expect(screen.getByText("Analityk danych")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Idź dalej do samooceny" })).toBeDisabled();
	});

	it("NIE pokazuje procentu ani rankingu na żadnej karcie", () => {
		const { container } = render(<SummaryScreen sessionId="s1" summary={judged} {...handlers} />);
		expect(container.textContent).not.toMatch(/%/);
		expect(container.querySelector('[role="progressbar"]')).toBeNull();
	});

	it("wybór karty włącza primary i zapisuje ścieżkę przez /select-path", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
		vi.stubGlobal("fetch", fetchMock);
		render(<SummaryScreen sessionId="s1" summary={judged} {...handlers} />);

		await userEvent.click(screen.getByRole("button", { name: /Wybieram ścieżkę Analityk danych/ }));
		const primary = screen.getByRole("button", { name: "Idź dalej do samooceny" });
		expect(primary).toBeEnabled();

		await userEvent.click(primary);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/career-helper/session/s1/select-path",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("judge_failed: pokazuje banner przeglądu wykładowcy, bez streszczenia", () => {
		const jf: SummaryResponse = {
			judged: false,
			judgedFor: "warstwa4_failed",
			summaryText: null,
			careerPaths: [{ label: "Analityk danych", why: "Lubisz liczby." }],
		};
		render(<SummaryScreen sessionId="s1" summary={jf} {...handlers} />);
		expect(screen.getByText("Przygotuję to za chwilę")).toBeInTheDocument();
		expect(screen.getByText(/sprawdzona przez opiekuna/)).toBeInTheDocument();
		expect(screen.queryByText("Co rozumiem z naszej rozmowy")).not.toBeInTheDocument();
	});

	it("summary_error: brak ścieżek → ekran błędu z retry", async () => {
		const onRetrySummary = vi.fn();
		const err: SummaryResponse = {
			judged: false,
			judgedFor: "warstwa4_failed",
			summaryText: null,
			careerPaths: [],
		};
		render(
			<SummaryScreen
				sessionId="s1"
				summary={err}
				onSelectPathDone={vi.fn()}
				onBackToChat={vi.fn()}
				onRetrySummary={onRetrySummary}
			/>,
		);
		expect(screen.getByText("Coś poszło nie tak z podsumowaniem")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: /Spróbuj ponownie/ }));
		expect(onRetrySummary).toHaveBeenCalledOnce();
	});
});
