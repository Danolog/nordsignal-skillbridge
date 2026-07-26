// @vitest-environment jsdom
/**
 * 1E.4 · R6 — ReviewRunner: maszyna stanów sesji powtórek (spec Mili):
 *  - kolejka to CZYSTY ODCZYT (GET na montażu, bez ekranu potwierdzenia),
 *  - werdykt w <output> (nie role="alert"); treść WPROST z API (nie duplikat stringów),
 *  - fokus programowy: <h2> po zmianie pytania, „Dalej" po werdykcie,
 *  - mapowanie kodów: 409 → auto-dalej, 429 dzienny → koniec sesji, 429 burst → retry,
 *    sieć/500 → retry z zachowaniem wyboru,
 *  - stany brzegowe: pusto, błąd wczytania.
 *
 * fetch mockowany na granicy — kontrakt tras dowodzi test integracyjny (Quinn).
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewRunner } from "../review-runner";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

function jsonResponse(
	status: number,
	body: unknown,
	headers: Record<string, string> = {},
): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
		json: async () => body,
	} as unknown as Response;
}

function entry(n: number) {
	return {
		conceptId: `c${n}`,
		question: {
			questionItemId: `qi${n}`,
			type: "single_choice",
			stem: `Pytanie ${n}`,
			options: ["Opcja A", "Opcja B", "Opcja C"],
		},
	};
}

const queueResp = (entries: ReturnType<typeof entry>[]) =>
	jsonResponse(200, { queue: entries, cap: 20 });

const answerOk = (isCorrect: boolean, message: string, explanation: string | null = null) =>
	jsonResponse(200, {
		isCorrect,
		nextDue: "2026-08-01T00:00:00.000Z",
		feedback: { message, explanation },
	});

/** Router fetch: GET /queue → `queue`, POST /answer → `answer` (kolejne wywołania). */
function routeFetch(queue: () => Response, answers: (() => Response)[]) {
	let ai = 0;
	return vi.fn(async (url: string) => {
		if (url === "/api/review/queue") return queue();
		if (url === "/api/review/answer") {
			const h = answers[Math.min(ai, answers.length - 1)];
			ai += 1;
			return h();
		}
		throw new Error(`nieoczekiwane fetch: ${url}`);
	});
}

beforeEach(() => {
	vi.restoreAllMocks();
});

describe("ReviewRunner — wczytanie kolejki", () => {
	it("GET /queue na montażu → pierwsze pytanie (bez ekranu potwierdzenia)", async () => {
		vi.stubGlobal(
			"fetch",
			routeFetch(() => queueResp([entry(1)]), []),
		);
		render(<ReviewRunner />);
		expect(await screen.findByText("Powtórka 1 z 1")).toBeInTheDocument();
		// legend niesie treść pytania (grupa opcji fieldset/legend).
		expect(screen.getByText("Pytanie 1")).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Opcja A" })).toBeInTheDocument();
	});

	it("pusta kolejka → komunikat Nic do powtórzenia bez CTA startu", async () => {
		vi.stubGlobal(
			"fetch",
			routeFetch(() => queueResp([]), []),
		);
		render(<ReviewRunner />);
		expect(await screen.findByText("Nic do powtórzenia")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Sprawdź" })).not.toBeInTheDocument();
	});

	it("błąd wczytania (500) → alert + retry", async () => {
		vi.stubGlobal(
			"fetch",
			routeFetch(() => jsonResponse(500, { error: "boom" }), []),
		);
		render(<ReviewRunner />);
		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(/Nie udało się wczytać powtórek/);
		expect(screen.getByRole("button", { name: "Spróbuj ponownie" })).toBeInTheDocument();
	});
});

describe("ReviewRunner — ocena i werdykt", () => {
	it("poprawna odpowiedź → werdykt w <output> z treścią WPROST z API", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(
				() => queueResp([entry(1)]),
				[() => answerOk(true, "Dobrze — wróci w większym odstępie.", "Bo X to Y.")],
			),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		const out = await screen.findByText("Dobrze — wróci w większym odstępie.");
		// Werdykt siedzi w <output> (aria-live), NIE w role="alert".
		expect(out.closest("output")).not.toBeNull();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.getByText("Bo X to Y.")).toBeInTheDocument();
	});

	it("błędna odpowiedź: NEUTRALNY werdykt z API (bez rose/XCircle), fokus na przycisku dalej", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(
				() => queueResp([entry(1)]),
				[() => answerOk(false, "Ten koncept wrócił za wcześnie — pokażemy go znów niedługo.")],
			),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja B" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		expect(
			await screen.findByText("Ten koncept wrócił za wcześnie — pokażemy go znów niedługo."),
		).toBeInTheDocument();
		// Ostatnie pytanie → przycisk „Zakończ sesję", fokus na nim (spec: fokus po werdykcie).
		const next = screen.getByRole("button", { name: "Zakończ sesję" });
		await waitFor(() => expect(next).toHaveFocus());
	});

	it("Dalej przechodzi do kolejnego pytania i przenosi fokus na jego nagłówek", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(() => queueResp([entry(1), entry(2)]), [() => answerOk(true, "Dobrze.")]),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 2");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));
		await user.click(await screen.findByRole("button", { name: "Dalej" }));

		const heading = await screen.findByRole("heading", { name: "Powtórka 2 z 2" });
		await waitFor(() => expect(heading).toHaveFocus());
	});

	it("werdykt ostatniego pytania: Zakończ sesję prowadzi do Koniec sesji", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(() => queueResp([entry(1)]), [() => answerOk(true, "Dobrze.")]),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));
		await user.click(await screen.findByRole("button", { name: "Zakończ sesję" }));
		expect(await screen.findByText("Koniec sesji")).toBeInTheDocument();
	});
});

describe("ReviewRunner — mapowanie kodów błędów", () => {
	it("409 (koncept już nie czeka) → auto-przejście do następnego z notą", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(
				() => queueResp([entry(1), entry(2)]),
				[() => jsonResponse(409, { error: "Ten koncept nie jest w Twojej kolejce powtórek." })],
			),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 2");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		// Przeszliśmy do pytania 2, nota transientowa nad nim.
		expect(await screen.findByText("Powtórka 2 z 2")).toBeInTheDocument();
		expect(screen.getByText(/już nie czekał na powtórkę/)).toBeInTheDocument();
	});

	it("409 na OSTATNIM pytaniu → koniec sesji (nie błąd)", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(
				() => queueResp([entry(1)]),
				[() => jsonResponse(409, { error: "spoza kolejki" })],
			),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));
		expect(await screen.findByText("Koniec sesji")).toBeInTheDocument();
	});

	it("429 scope=daily → reframe na koniec sesji (nie błąd), niezależnie od Retry-After", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(
				() => queueResp([entry(1), entry(2)]),
				// Retry-After MAŁE (30 s) — pod starą heurystyką „burst"; scope="daily"
				// wygrywa → dowód, że runner czyta scope, nie próg Retry-After.
				[
					() =>
						jsonResponse(
							429,
							{ error: "Too many requests", scope: "daily" },
							{ "retry-after": "30" },
						),
				],
			),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 2");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));
		expect(await screen.findByText("Koniec sesji")).toBeInTheDocument();
		// NIE alert — dzienny cap to nie błąd.
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("429 scope=burst → komunikat retry, wybór zostaje, niezależnie od Retry-After", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(
				() => queueResp([entry(1)]),
				// Retry-After DUŻE (3600 s) — pod starą heurystyką „daily"; scope="burst"
				// wygrywa → wybór zostaje, brak „koniec sesji".
				[
					() =>
						jsonResponse(
							429,
							{ error: "Too many requests", scope: "burst" },
							{ "retry-after": "3600" },
						),
				],
			),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/Za szybko/);
		// Wybór studenta NIE znika (może ponowić).
		expect(screen.getByRole("radio", { name: "Opcja A" })).toBeChecked();
		// Nie weszliśmy w werdykt ani koniec sesji.
		expect(screen.queryByText("Koniec sesji")).not.toBeInTheDocument();
	});

	it("429 bez scope (fallback defensywny) → traktowane jak burst, wybór zostaje", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(
				() => queueResp([entry(1)]),
				// Brak pola scope (np. starszy serwer) → fallback = burst, NIE koniec sesji.
				[() => jsonResponse(429, { error: "Too many requests" }, { "retry-after": "3600" })],
			),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/Za szybko/);
		expect(screen.getByRole("radio", { name: "Opcja A" })).toBeChecked();
		expect(screen.queryByText("Koniec sesji")).not.toBeInTheDocument();
	});

	it("sieć/500 na ocenie → komunikat retry, wybór zostaje", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			routeFetch(() => queueResp([entry(1)]), [() => jsonResponse(500, { error: "boom" })]),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/Nie udało się zapisać odpowiedzi/);
		expect(screen.getByRole("radio", { name: "Opcja A" })).toBeChecked();
	});
});

describe("ReviewRunner — a11y struktura", () => {
	it("pasek postępu ma role=progressbar z aria-valuenow/max", async () => {
		vi.stubGlobal(
			"fetch",
			routeFetch(() => queueResp([entry(1), entry(2)]), []),
		);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 2");
		const bar = screen.getByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuenow", "1");
		expect(bar).toHaveAttribute("aria-valuemin", "1");
		expect(bar).toHaveAttribute("aria-valuemax", "2");
	});

	it("nagłówek pytania to <h2 tabIndex=-1> (fokusowalny programowo)", async () => {
		vi.stubGlobal(
			"fetch",
			routeFetch(() => queueResp([entry(1)]), []),
		);
		render(<ReviewRunner />);
		const heading = await screen.findByRole("heading", { name: "Powtórka 1 z 1" });
		expect(heading.tagName).toBe("H2");
		expect(heading).toHaveAttribute("tabindex", "-1");
	});

	it("radia są disabled w trakcie oceny (answering)", async () => {
		const user = userEvent.setup();
		let resolveAnswer!: (r: Response) => void;
		const pending = new Promise<Response>((res) => {
			resolveAnswer = res;
		});
		const fetchMock = vi.fn(async (url: string) => {
			if (url === "/api/review/queue") return queueResp([entry(1)]);
			if (url === "/api/review/answer") return pending;
			throw new Error(url);
		});
		vi.stubGlobal("fetch", fetchMock);
		render(<ReviewRunner />);
		await screen.findByText("Powtórka 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Sprawdź" }));

		// W trakcie oceny (odpowiedź jeszcze nie wróciła) radia są zablokowane.
		await waitFor(() => expect(screen.getByRole("radio", { name: "Opcja A" })).toBeDisabled());
		resolveAnswer(answerOk(true, "Dobrze."));
	});
});
