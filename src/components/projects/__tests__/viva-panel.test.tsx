// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * B7/1.16b — testy panelu obrony z ZAMOCKOWANYM fetch (zero realnego API).
 * Kontrakty backendu (1.16a) odwzorowane per stan: rehydracja GET (null/
 * pending/in_progress/końcowe), start POST, odpowiedź POST (następne pytanie /
 * rozstrzygnięcie / crisis / 409 expiry / 429).
 */

const toastError = vi.fn();
vi.mock("sonner", () => ({
	toast: {
		error: (...a: unknown[]) => toastError(...a),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: routerRefresh }),
}));

import { VivaPanel } from "../viva-panel";

const SUBMISSION_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";

type FetchStub = ReturnType<typeof vi.fn>;

function jsonResponse(status: number, body: unknown) {
	return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** Stan GET rehydracji; kolejne odpowiedzi konfigurowane per test. */
function stubFetch(state: unknown): FetchStub {
	const stub = vi.fn().mockResolvedValueOnce(jsonResponse(200, state));
	vi.stubGlobal("fetch", stub);
	return stub;
}

function futureIso(minutes: number): string {
	return new Date(Date.now() + minutes * 60_000).toISOString();
}

const PENDING_STATE = {
	state: "pending",
	sessionId: SESSION_ID,
	position: 0,
	totalQuestions: 3,
	question: { position: 0, question: "Dlaczego wybrałeś pandas do wczytania danych?" },
	expiresAt: null,
	result: null,
	restartable: false,
};

const IN_PROGRESS_STATE = {
	state: "in_progress",
	sessionId: SESSION_ID,
	position: 0,
	totalQuestions: 3,
	question: {
		position: 0,
		question: "Dlaczego wybrałeś pandas do wczytania danych?",
		filePath: "analiza.py",
	},
	expiresAt: futureIso(60),
	result: null,
	restartable: false,
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("VivaPanel — rehydracja (GET)", () => {
	it("brak sesji (state null) → panel nie istnieje w drzewie", async () => {
		const stub = stubFetch({
			state: null,
			sessionId: null,
			position: 0,
			totalQuestions: 3,
			question: null,
			expiresAt: null,
			result: null,
			restartable: false,
		});
		const { container } = render(<VivaPanel submissionId={SUBMISSION_ID} />);
		await waitFor(() => expect(stub).toHaveBeenCalled());
		expect(container).toBeEmptyDOMElement();
	});

	it("pending → baner zaproszenia z zasadami i przyciskiem startu", async () => {
		stubFetch(PENDING_STATE);
		render(<VivaPanel submissionId={SUBMISSION_ID} />);

		expect(await screen.findByText("Obrona ustna pracy")).toBeInTheDocument();
		expect(screen.getByText(/po zdanej obronie/)).toBeInTheDocument();
		expect(screen.getByText(/3 pytania o konkretne decyzje/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Rozpocznij obronę/ })).toBeEnabled();
		// Zero feedbacku w trakcie — pytanie NIE renderuje się przed startem.
		expect(screen.queryByText(/Dlaczego wybrałeś pandas/)).not.toBeInTheDocument();
	});

	it("in_progress (wznowienie po refresh) → pytanie, licznik pozycji i czasu", async () => {
		stubFetch(IN_PROGRESS_STATE);
		render(<VivaPanel submissionId={SUBMISSION_ID} />);

		expect(await screen.findByText(/Dlaczego wybrałeś pandas/)).toBeInTheDocument();
		expect(screen.getByText(/Pytanie 1 z 3/)).toBeInTheDocument();
		expect(screen.getByText(/Dotyczy: analiza\.py/)).toBeInTheDocument();
		expect(screen.getByRole("timer")).toBeInTheDocument();
		expect(screen.getByLabelText("Odpowiedź na pytanie obrony")).toBeEnabled();
	});

	it("passed z rehydracji → ekran wyniku bez pola odpowiedzi", async () => {
		stubFetch({
			...PENDING_STATE,
			state: "passed",
			question: null,
			result: { totalPoints: 5, maxPoints: 6, passThreshold: 4 },
		});
		render(<VivaPanel submissionId={SUBMISSION_ID} />);

		expect(await screen.findByText(/Obrona zdana/)).toBeInTheDocument();
		expect(screen.getByText(/5\/6 pkt/)).toBeInTheDocument();
		expect(screen.queryByLabelText("Odpowiedź na pytanie obrony")).not.toBeInTheDocument();
	});

	it("superseded → uczciwy komunikat o nieaktualnej obronie", async () => {
		stubFetch({ ...PENDING_STATE, state: "superseded", question: null });
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		expect(await screen.findByText(/nieaktualna/)).toBeInTheDocument();
	});
});

describe("VivaPanel — start (POST /viva/start)", () => {
	it("klik startu → POST i przejście do pierwszego pytania", async () => {
		const stub = stubFetch(PENDING_STATE);
		stub.mockResolvedValueOnce(jsonResponse(200, IN_PROGRESS_STATE));
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		await user.click(await screen.findByRole("button", { name: /Rozpocznij obronę/ }));

		expect(await screen.findByText(/Dlaczego wybrałeś pandas/)).toBeInTheDocument();
		const [, postCall] = stub.mock.calls;
		expect(postCall[0]).toBe(`/api/submissions/${SUBMISSION_ID}/viva/start`);
		expect((postCall[1] as RequestInit).method).toBe("POST");
	});

	it("409 przy starcie (np. decyzja człowieka) → toast + refetch prawdy z GET", async () => {
		const stub = stubFetch(PENDING_STATE);
		stub.mockResolvedValueOnce(
			jsonResponse(409, { error: "Decyzja człowieka już zapadła — obrona bezprzedmiotowa." }),
		);
		stub.mockResolvedValueOnce(
			jsonResponse(200, { ...PENDING_STATE, state: "superseded", question: null }),
		);
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		await user.click(await screen.findByRole("button", { name: /Rozpocznij obronę/ }));

		await waitFor(() =>
			expect(toastError).toHaveBeenCalledWith(expect.stringContaining("Decyzja człowieka")),
		);
		expect(await screen.findByText(/nieaktualna/)).toBeInTheDocument();
	});

	it("expired z restartable → przycisk ponownego startu (te same pytania)", async () => {
		const stub = stubFetch({
			...PENDING_STATE,
			state: "expired",
			question: null,
			restartable: true,
		});
		stub.mockResolvedValueOnce(jsonResponse(200, IN_PROGRESS_STATE));
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		expect(await screen.findByText(/Czas obrony minął/)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /Rozpocznij ponownie/ }));
		expect(await screen.findByText(/Dlaczego wybrałeś pandas/)).toBeInTheDocument();
	});
});

describe("VivaPanel — odpowiedź (POST /viva/[sid]/answer)", () => {
	it("wysyła odpowiedź → następne pytanie, pole wyczyszczone, zero werdyktu w trakcie", async () => {
		const stub = stubFetch(IN_PROGRESS_STATE);
		stub.mockResolvedValueOnce(
			jsonResponse(200, {
				state: "in_progress",
				position: 1,
				question: { position: 1, question: "Jak zweryfikowałeś jakość danych wejściowych?" },
			}),
		);
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		const input = await screen.findByLabelText("Odpowiedź na pytanie obrony");
		await user.type(input, "Pandas ma read_csv z obsługą typów.");
		await user.click(screen.getByRole("button", { name: /Wyślij odpowiedź/ }));

		expect(await screen.findByText(/Jak zweryfikowałeś jakość/)).toBeInTheDocument();
		expect(screen.getByText(/Pytanie 2 z 3/)).toBeInTheDocument();
		expect(screen.getByLabelText("Odpowiedź na pytanie obrony")).toHaveValue("");

		const [, postCall] = stub.mock.calls;
		expect(postCall[0]).toBe(`/api/submissions/${SUBMISSION_ID}/viva/${SESSION_ID}/answer`);
		expect(JSON.parse((postCall[1] as RequestInit).body as string)).toEqual({
			answer: "Pandas ma read_csv z obsługą typów.",
		});
	});

	it("ostatnia odpowiedź → passed: ekran wyniku + router.refresh (status 'verified')", async () => {
		const stub = stubFetch({ ...IN_PROGRESS_STATE, position: 2 });
		stub.mockResolvedValueOnce(
			jsonResponse(200, {
				state: "passed",
				position: 3,
				result: { totalPoints: 5, maxPoints: 6, passThreshold: 4 },
			}),
		);
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		await user.type(
			await screen.findByLabelText("Odpowiedź na pytanie obrony"),
			"Uzasadnienie decyzji.",
		);
		await user.click(screen.getByRole("button", { name: /Wyślij odpowiedź/ }));

		expect(await screen.findByText(/Obrona zdana/)).toBeInTheDocument();
		expect(screen.getByText(/5\/6 pkt/)).toBeInTheDocument();
		expect(routerRefresh).toHaveBeenCalled();
	});

	it("failed → wynik z progiem i informacją o recenzji człowieka, bez refresh", async () => {
		const stub = stubFetch({ ...IN_PROGRESS_STATE, position: 2 });
		stub.mockResolvedValueOnce(
			jsonResponse(200, {
				state: "failed",
				position: 3,
				result: { totalPoints: 3, maxPoints: 6, passThreshold: 4 },
			}),
		);
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Odpowiedź na pytanie obrony"), "Nie wiem.");
		await user.click(screen.getByRole("button", { name: /Wyślij odpowiedź/ }));

		expect(await screen.findByText(/Obrona niezaliczona/)).toBeInTheDocument();
		expect(screen.getByText(/3\/6 pkt \(próg: 4\)/)).toBeInTheDocument();
		expect(screen.getByText(/recenzji człowieka/)).toBeInTheDocument();
		expect(routerRefresh).not.toHaveBeenCalled();
	});

	it("inconclusive (awaria sędziego, fail-closed) → komunikat o człowieku", async () => {
		const stub = stubFetch(IN_PROGRESS_STATE);
		stub.mockResolvedValueOnce(jsonResponse(200, { state: "inconclusive", position: 0 }));
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Odpowiedź na pytanie obrony"), "Odpowiedź.");
		await user.click(screen.getByRole("button", { name: /Wyślij odpowiedź/ }));

		expect(await screen.findByText(/nie udało się rozstrzygnąć automatycznie/)).toBeInTheDocument();
	});

	it("crisis → statyczny komunikat wsparcia, odpowiedź ZOSTAJE w polu", async () => {
		const stub = stubFetch(IN_PROGRESS_STATE);
		stub.mockResolvedValueOnce(jsonResponse(200, { crisis: true }));
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		await user.type(
			await screen.findByLabelText("Odpowiedź na pytanie obrony"),
			"trudna odpowiedź",
		);
		await user.click(screen.getByRole("button", { name: /Wyślij odpowiedź/ }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/116 123/);
		expect(screen.getByLabelText("Odpowiedź na pytanie obrony")).toHaveValue("trudna odpowiedź");
		// Sesja bez zmian — dalej to samo pytanie.
		expect(screen.getByText(/Dlaczego wybrałeś pandas/)).toBeInTheDocument();
	});

	it("409 (TTL minął w trakcie, 0 odp.) → toast + stan expired z restartem", async () => {
		const stub = stubFetch(IN_PROGRESS_STATE);
		stub.mockResolvedValueOnce(
			jsonResponse(409, {
				error: "Czas sesji minął — możesz rozpocząć obronę ponownie.",
				state: "expired",
				restartable: true,
			}),
		);
		stub.mockResolvedValueOnce(
			jsonResponse(200, { ...PENDING_STATE, state: "expired", question: null, restartable: true }),
		);
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Odpowiedź na pytanie obrony"), "Spóźniona.");
		await user.click(screen.getByRole("button", { name: /Wyślij odpowiedź/ }));

		await waitFor(() =>
			expect(toastError).toHaveBeenCalledWith(expect.stringContaining("Czas sesji minął")),
		);
		expect(await screen.findByRole("button", { name: /Rozpocznij ponownie/ })).toBeInTheDocument();
	});

	it("429 → toast, odpowiedź wraca do pola", async () => {
		const stub = stubFetch(IN_PROGRESS_STATE);
		stub.mockResolvedValueOnce(jsonResponse(429, { error: "Too many requests" }));
		render(<VivaPanel submissionId={SUBMISSION_ID} />);
		const user = userEvent.setup();

		await user.type(await screen.findByLabelText("Odpowiedź na pytanie obrony"), "Szybko.");
		await user.click(screen.getByRole("button", { name: /Wyślij odpowiedź/ }));

		await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/Za dużo/)));
		expect(screen.getByLabelText("Odpowiedź na pytanie obrony")).toHaveValue("Szybko.");
	});
});
