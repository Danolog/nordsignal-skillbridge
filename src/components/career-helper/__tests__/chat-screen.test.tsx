// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionStateResponse } from "@/lib/career-helper/types";

/**
 * Testy ekranu 2 (rozmowa) z ZAMOCKOWANYM useChat i fetch — zero realnego API,
 * zero realnego streamingu. Mock pozwala sterować messages + status.
 */

type MockChat = {
	messages: { id: string; role: "assistant" | "user"; parts: { type: "text"; text: string }[] }[];
	status: "ready" | "submitted" | "streaming" | "error";
	sendMessage: ReturnType<typeof vi.fn>;
	regenerate: ReturnType<typeof vi.fn>;
};

let mockChat: MockChat;

vi.mock("@ai-sdk/react", () => ({
	useChat: () => mockChat,
}));

vi.mock("ai", () => ({
	DefaultChatTransport: class {},
}));

import { ChatScreen } from "../chat-screen";

function aiMsg(text: string) {
	return { id: `ai-${text}`, role: "assistant" as const, parts: [{ type: "text" as const, text }] };
}

function stubSession(state: Partial<SessionStateResponse>) {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			json: async () =>
				({ messages: [], turn: 0, status: "in_progress", ...state }) as SessionStateResponse,
		}),
	);
}

beforeEach(() => {
	mockChat = {
		messages: [],
		status: "ready",
		sendMessage: vi.fn(),
		regenerate: vi.fn(),
	};
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ChatScreen", () => {
	it("pokazuje nagłówek HITL i licznik tur", async () => {
		stubSession({ messages: [aiPlain("Cześć!")], turn: 1, status: "in_progress" });
		mockChat.messages = [aiMsg("Cześć! O czym chcesz dziś pogadać?")];
		render(<ChatScreen sessionId="s1" onShowSummary={vi.fn()} onRestart={vi.fn()} />);
		expect(screen.getByText(/AI nie wybiera za Ciebie zawodu/)).toBeInTheDocument();
		await waitFor(() => expect(screen.getByText(/Tura 1 z 9/)).toBeInTheDocument());
	});

	it("stan streaming: input zablokowany (placeholder „Pomocnik pisze”)", () => {
		stubSession({ messages: [], turn: 1, status: "in_progress" });
		mockChat.status = "streaming";
		mockChat.messages = [aiMsg("Piszę odpowiedź")];
		render(<ChatScreen sessionId="s1" onShowSummary={vi.fn()} onRestart={vi.fn()} />);
		const input = screen.getByLabelText("Napisz wiadomość do Pomocnika");
		expect(input).toBeDisabled();
		expect(input).toHaveAttribute("placeholder", "Pomocnik pisze odpowiedź…");
	});

	it("limit tur (turn=9, ready): pokazuje CTA „Pokaż podsumowanie”, ukrywa input", async () => {
		stubSession({ messages: [], turn: 9, status: "in_progress" });
		mockChat.status = "ready";
		mockChat.messages = [aiMsg("Mam już dobry obraz.")];
		render(<ChatScreen sessionId="s1" onShowSummary={vi.fn()} onRestart={vi.fn()} />);
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /Pokaż podsumowanie/ })).toBeInTheDocument(),
		);
		expect(screen.queryByLabelText("Napisz wiadomość do Pomocnika")).not.toBeInTheDocument();
	});

	it("kliknięcie „Pokaż podsumowanie” woła /summary i przekazuje wynik", async () => {
		const onShowSummary = vi.fn();
		const summary = {
			judged: true,
			judgedFor: "R2",
			summaryText: "x",
			careerPaths: [{ label: "A", why: "b" }],
		};
		vi.stubGlobal(
			"fetch",
			vi.fn((url: string) => {
				if (typeof url === "string" && url.endsWith("/summary")) {
					return Promise.resolve({ ok: true, json: async () => summary });
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({ messages: [], turn: 9, status: "in_progress" }),
				});
			}),
		);
		mockChat.status = "ready";
		mockChat.messages = [aiMsg("Mam już dobry obraz.")];
		render(<ChatScreen sessionId="s1" onShowSummary={onShowSummary} onRestart={vi.fn()} />);
		const cta = await screen.findByRole("button", { name: /Pokaż podsumowanie/ });
		cta.click();
		await waitFor(() => expect(onShowSummary).toHaveBeenCalledWith(summary));
	});

	it("stan error po retry: pokazuje toast Ponów", async () => {
		stubSession({ messages: [], turn: 1, status: "in_progress" });
		mockChat.status = "error";
		mockChat.messages = [aiMsg("częściowa")];
		render(<ChatScreen sessionId="s1" onShowSummary={vi.fn()} onRestart={vi.fn()} />);
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /Ponów wiadomość AI/ })).toBeInTheDocument(),
		);
	});

	it("nie renderuje disclaimera ekranu 3 na czacie (rozdzielenie ekranów)", () => {
		stubSession({ messages: [], turn: 1, status: "in_progress" });
		render(<ChatScreen sessionId="s1" onShowSummary={vi.fn()} onRestart={vi.fn()} />);
		expect(screen.queryByText("To NIE są rekomendacje")).not.toBeInTheDocument();
	});
});

function aiPlain(content: string) {
	return { role: "ai" as const, content };
}
