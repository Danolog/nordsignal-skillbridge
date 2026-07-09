// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * C11/1.14 — testy panelu tutora z ZAMOCKOWANYM fetch (zero realnego API).
 * Kontrakty backendu (1.13) odwzorowane per stan: rehydracja GET, tura POST,
 * crisis, limit 409, rate-limit 429, błąd 5xx.
 */

const toastError = vi.fn();
vi.mock("sonner", () => ({
	toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() },
}));

import { TutorPanel } from "../tutor-panel";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

type FetchStub = ReturnType<typeof vi.fn>;

/** GET rehydracji: pierwsza odpowiedź fetch; kolejne konfiguit test per POST. */
function stubFetch(get: {
	turns: { role: "ai" | "user"; content: string }[];
	turnsUsed: number;
	maxTurns: number;
}): FetchStub {
	const stub = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => get });
	vi.stubGlobal("fetch", stub);
	return stub;
}

function jsonResponse(status: number, body: unknown) {
	return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// jsdom nie ma Element.scrollTo — efekt auto-scrolla woła go przy każdej nowej
// wiadomości. Stub definiowany RAZ na cały plik i celowo NIE sprzątany w
// afterEach: rehydracja jest asynchroniczna, więc spóźniony passive effect
// potrafił trafić w okno PO delete z afterEach a PRZED beforeEach kolejnego
// testu → flaky „scrollTo is not a function" (~1/5 przebiegów). Vitest izoluje
// jsdom per plik — stub nie wycieka do innych plików testowych.
Object.defineProperty(HTMLElement.prototype, "scrollTo", {
	value: () => {},
	writable: true,
	configurable: true,
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("TutorPanel — rehydracja (GET)", () => {
	it("renderuje historię z bazy i licznik odpowiedzi", async () => {
		stubFetch({
			turns: [
				{ role: "user", content: "Nie umiem wczytać CSV" },
				{ role: "ai", content: "A jakiej biblioteki próbowałeś?" },
			],
			turnsUsed: 1,
			maxTurns: 30,
		});
		render(<TutorPanel projectId={PROJECT_ID} />);

		expect(await screen.findByText("Nie umiem wczytać CSV")).toBeInTheDocument();
		expect(screen.getByText("A jakiej biblioteki próbowałeś?")).toBeInTheDocument();
		expect(screen.getByText(/1\/30 odpowiedzi/)).toBeInTheDocument();
		expect(screen.getByLabelText("Wiadomość do tutora")).toBeEnabled();
	});

	it("pusta historia → zachęta do opisania problemu", async () => {
		stubFetch({ turns: [], turnsUsed: 0, maxTurns: 30 });
		render(<TutorPanel projectId={PROJECT_ID} />);
		expect(await screen.findByText(/Opisz, co już próbowałeś/)).toBeInTheDocument();
	});

	it("wyczerpany limit z rehydracji → pole nie istnieje, komunikat limitu", async () => {
		stubFetch({ turns: [{ role: "ai", content: "ostatnia" }], turnsUsed: 30, maxTurns: 30 });
		render(<TutorPanel projectId={PROJECT_ID} />);
		expect(await screen.findByText(/Limit rozmowy z tutorem/)).toBeInTheDocument();
		expect(screen.queryByLabelText("Wiadomość do tutora")).not.toBeInTheDocument();
	});
});

describe("TutorPanel — tura (POST)", () => {
	it("wysyła wiadomość, renderuje odpowiedź tutora, podbija licznik", async () => {
		const stub = stubFetch({ turns: [], turnsUsed: 0, maxTurns: 30 });
		stub.mockResolvedValueOnce(
			jsonResponse(200, {
				reply: "A co już próbowałeś?",
				guarded: false,
				turnsUsed: 1,
				maxTurns: 30,
			}),
		);
		render(<TutorPanel projectId={PROJECT_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Wiadomość do tutora"), "Od czego zacząć?");
		await user.click(screen.getByLabelText("Wyślij wiadomość do tutora"));

		expect(await screen.findByText("A co już próbowałeś?")).toBeInTheDocument();
		expect(screen.getByText("Od czego zacząć?")).toBeInTheDocument();
		expect(screen.getByText(/1\/30 odpowiedzi/)).toBeInTheDocument();

		const [, postCall] = stub.mock.calls;
		expect(postCall[0]).toBe(`/api/projects/${PROJECT_ID}/tutor`);
		expect(JSON.parse((postCall[1] as RequestInit).body as string)).toEqual({
			message: "Od czego zacząć?",
		});
	});

	it("Enter wysyła (Shift+Enter nie)", async () => {
		const stub = stubFetch({ turns: [], turnsUsed: 0, maxTurns: 30 });
		stub.mockResolvedValueOnce(
			jsonResponse(200, { reply: "Odp", guarded: false, turnsUsed: 1, maxTurns: 30 }),
		);
		render(<TutorPanel projectId={PROJECT_ID} />);
		const user = userEvent.setup();
		const input = await screen.findByLabelText("Wiadomość do tutora");

		await user.type(input, "linia 1{Shift>}{Enter}{/Shift}linia 2");
		expect(stub).toHaveBeenCalledTimes(1); // tylko GET rehydracji
		await user.type(input, "{Enter}");
		expect(await screen.findByText("Odp")).toBeInTheDocument();
	});

	it("crisis: statyczny komunikat wsparcia, dymek studenta zdjęty (tura nieutrwalona)", async () => {
		const stub = stubFetch({ turns: [], turnsUsed: 0, maxTurns: 30 });
		stub.mockResolvedValueOnce(jsonResponse(200, { crisis: true }));
		render(<TutorPanel projectId={PROJECT_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Wiadomość do tutora"), "trudna wiadomość");
		await user.click(screen.getByLabelText("Wyślij wiadomość do tutora"));

		expect(await screen.findByRole("alert")).toHaveTextContent(/116 123/);
		expect(screen.queryByText("trudna wiadomość")).not.toBeInTheDocument();
	});

	it("409 → limit: pole znika, komunikat limitu, dymek zdjęty", async () => {
		const stub = stubFetch({ turns: [], turnsUsed: 0, maxTurns: 30 });
		stub.mockResolvedValueOnce(jsonResponse(409, { error: "Turn limit reached", maxTurns: 30 }));
		render(<TutorPanel projectId={PROJECT_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Wiadomość do tutora"), "jeszcze jedno");
		await user.click(screen.getByLabelText("Wyślij wiadomość do tutora"));

		expect(await screen.findByText(/Limit rozmowy z tutorem/)).toBeInTheDocument();
		expect(screen.queryByLabelText("Wiadomość do tutora")).not.toBeInTheDocument();
		expect(screen.queryByText("jeszcze jedno")).not.toBeInTheDocument();
	});

	it("429 → toast, wiadomość wraca do pola", async () => {
		const stub = stubFetch({ turns: [], turnsUsed: 0, maxTurns: 30 });
		stub.mockResolvedValueOnce(jsonResponse(429, { error: "Too many requests" }));
		render(<TutorPanel projectId={PROJECT_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Wiadomość do tutora"), "szybkie pytanie");
		await user.click(screen.getByLabelText("Wyślij wiadomość do tutora"));

		await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/Za dużo/)));
		expect(screen.getByLabelText("Wiadomość do tutora")).toHaveValue("szybkie pytanie");
	});

	it("5xx → toast o niedostępności, wiadomość wraca do pola", async () => {
		const stub = stubFetch({ turns: [], turnsUsed: 0, maxTurns: 30 });
		stub.mockResolvedValueOnce(jsonResponse(502, { error: "boom" }));
		render(<TutorPanel projectId={PROJECT_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Wiadomość do tutora"), "pytanie");
		await user.click(screen.getByLabelText("Wyślij wiadomość do tutora"));

		await waitFor(() =>
			expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/niedostępny/)),
		);
		expect(screen.getByLabelText("Wiadomość do tutora")).toHaveValue("pytanie");
		expect(screen.queryByText(/Tutor myśli/)).not.toBeInTheDocument();
	});

	it("osiągnięcie limitu odpowiedzią → pole znika po turze", async () => {
		const stub = stubFetch({ turns: [], turnsUsed: 29, maxTurns: 30 });
		stub.mockResolvedValueOnce(
			jsonResponse(200, {
				reply: "Ostatnia wskazówka",
				guarded: false,
				turnsUsed: 30,
				maxTurns: 30,
			}),
		);
		render(<TutorPanel projectId={PROJECT_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Wiadomość do tutora"), "finał");
		await user.click(screen.getByLabelText("Wyślij wiadomość do tutora"));

		expect(await screen.findByText("Ostatnia wskazówka")).toBeInTheDocument();
		expect(screen.getByText(/Limit rozmowy z tutorem/)).toBeInTheDocument();
		expect(screen.queryByLabelText("Wiadomość do tutora")).not.toBeInTheDocument();
	});
});
