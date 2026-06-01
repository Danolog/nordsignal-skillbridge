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

	// Sprawa B (kontrakt Darka): na 9. (ostatnie) pytanie AI pole MUSI zostać —
	// student musi móc odpowiedzieć. CTA „Pokaż podsumowanie" NIE pojawia się tu.
	it("9. pytanie AI (turn=9, ostatnia wiadomość = AI): pole AKTYWNE, BRAK CTA", async () => {
		// GET zwraca historię kończącą się pytaniem AI → rozmowa NIE domknięta.
		stubSession({
			messages: [aiPlain("9. pytanie AI?")],
			turn: 9,
			status: "in_progress",
		});
		mockChat.status = "ready";
		mockChat.messages = [aiMsg("9. pytanie AI?")];
		render(<ChatScreen sessionId="s1" onShowSummary={vi.fn()} onRestart={vi.fn()} />);
		// Pole dostępne (student odpowiada na ostatnie pytanie).
		await waitFor(() =>
			expect(screen.getByLabelText("Napisz wiadomość do Pomocnika")).toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Napisz wiadomość do Pomocnika")).not.toBeDisabled();
		// CTA podsumowania jeszcze NIE ma — najpierw odpowiedź studenta.
		expect(screen.queryByRole("button", { name: /Pokaż podsumowanie/ })).not.toBeInTheDocument();
	});

	// Rozmowa DOMKNIĘTA odpowiedzią studenta: GET zwraca historię kończącą się turą
	// usera (odpowiedź na 9. pytanie, bez 10. pytania) → CTA, input schowany.
	it("domknięcie (turn=9, ostatnia wiadomość = user): pokazuje CTA, ukrywa input", async () => {
		stubSession({
			messages: [aiPlain("9. pytanie AI?"), { role: "user", content: "ostatnia odpowiedź" }],
			turn: 9,
			status: "in_progress",
		});
		mockChat.status = "ready";
		mockChat.messages = [aiMsg("9. pytanie AI?")];
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
				// GET /session: rozmowa domknięta odpowiedzią studenta (last = user)
				// → CTA „Pokaż podsumowanie" dostępne.
				return Promise.resolve({
					ok: true,
					json: async () => ({
						messages: [
							{ role: "ai", content: "9. pytanie AI?" },
							{ role: "user", content: "ostatnia odpowiedź" },
						],
						turn: 9,
						status: "in_progress",
					}),
				});
			}),
		);
		mockChat.status = "ready";
		mockChat.messages = [aiMsg("9. pytanie AI?")];
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
