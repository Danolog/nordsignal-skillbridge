// @vitest-environment jsdom
/**
 * 1E.3 · P5 — ExamRunner: maszyna stanów S1→R*→W1–W3 (spec Mili rozdz. 4–6):
 *  - /start NIE woła się na wejściu (dopiero po kliknięciu),
 *  - zaznaczona opcja = sky, nie emerald (5.1 — brak fałszywego „dobrze"),
 *  - jawne domknięcie R5 (nie auto-complete),
 *  - W1 zdany / W2 oblany z retry / W3 correctives (bez retry),
 *  - 423 correctives_required z /start → Ekran 5 bez retry (Sophia D2),
 *  - S2 (422) bez „spróbuj ponownie"; R3 zachowuje wybór.
 *
 * fetch mockowany na granicy — kontrakt tras dowodzi test integracyjny backendu.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamResultJson } from "@/lib/assessment/exam";
import { ExamRunner } from "../exam-runner";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

function jsonResponse(status: number, body: unknown): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as Response;
}

function question(position: number, total = 2) {
	return {
		slotRef: `e${position + 1}`,
		stem: `Pytanie o pozycji ${position}`,
		options: ["Opcja A", "Opcja B", "Opcja C", "Opcja D"],
		position,
		total,
	};
}

const passedResult: ExamResultJson = {
	schemaVersion: 1,
	kind: "module_exam",
	questionCount: 2,
	maxErrors: 1,
	correctCount: 2,
	errorCount: 0,
	passed: true,
	attempt: 1,
	failedConcepts: [],
	correctives: false,
};

beforeEach(() => {
	mockRefresh.mockReset();
	vi.restoreAllMocks();
});

describe("ExamRunner — wejście i start", () => {
	it("NIE woła /start na wejściu (efekt uboczny dopiero po kliknięciu)", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python od zera" />);
		expect(screen.getByText("Egzamin: Python od zera")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Rozpocznij egzamin" })).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("start pokazuje pierwsze pytanie; zaznaczenie = sky, nie emerald (5.1)", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockResolvedValueOnce(
			jsonResponse(201, {
				sessionId: "s1",
				resumed: false,
				attempt: 1,
				total: 2,
				question: question(0),
			}),
		);
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));

		expect(await screen.findByText("Pytanie 1 z 2")).toBeInTheDocument();
		const optionA = screen.getByRole("radio", { name: "Opcja A" });
		await user.click(optionA);
		const label = optionA.closest("label");
		expect(label?.className).toMatch(/sky/);
		expect(label?.className).not.toMatch(/emerald/);
	});
});

describe("ExamRunner — pełny przebieg do W1", () => {
	it("odpowiada, domyka jawnie (R5) i pokazuje wynik zdany (W1)", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(201, {
					sessionId: "s1",
					resumed: false,
					attempt: 1,
					total: 2,
					question: question(0),
				}),
			)
			// answer q1 → next question q2
			.mockResolvedValueOnce(
				jsonResponse(200, { accepted: true, done: false, question: question(1) }),
			)
			// answer q2 (ostatnie) → done
			.mockResolvedValueOnce(jsonResponse(200, { accepted: true, done: true, question: null }))
			// complete → passed
			.mockResolvedValueOnce(jsonResponse(200, { completed: true, result: passedResult }));
		vi.stubGlobal("fetch", fetchMock);

		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));

		await screen.findByText("Pytanie 1 z 2");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Dalej" }));

		// Ostatnie pytanie: przycisk „Zakończ egzamin" (nie „Dalej")
		await screen.findByText("Pytanie 2 z 2");
		await user.click(screen.getByRole("radio", { name: "Opcja B" }));
		await user.click(screen.getByRole("button", { name: "Zakończ egzamin" }));

		// R5 — jawne domknięcie, nie auto-complete
		expect(await screen.findByText(/To były wszystkie pytania/)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Zakończ egzamin i zobacz wynik" }));

		// W1
		expect(await screen.findByText(/Zdałeś\(-aś\) egzamin/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Wróć do ścieżki nauki" })).toHaveAttribute(
			"href",
			"/curriculum",
		);
	});
});

describe("ExamRunner — warianty wyniku", () => {
	async function runToResult(result: ExamResultJson) {
		const user = userEvent.setup();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(201, {
					sessionId: "s1",
					resumed: false,
					attempt: 1,
					total: 1,
					question: question(0, 1),
				}),
			)
			.mockResolvedValueOnce(jsonResponse(200, { accepted: true, done: true, question: null }))
			.mockResolvedValueOnce(jsonResponse(200, { completed: true, result }));
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));
		await screen.findByText("Pytanie 1 z 1");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Zakończ egzamin" }));
		await user.click(await screen.findByRole("button", { name: "Zakończ egzamin i zobacz wynik" }));
		return user;
	}

	it("W2: oblany z retry — przycisk „Spróbuj ponownie” prowadzi do /exam", async () => {
		await runToResult({
			...passedResult,
			passed: false,
			correctCount: 0,
			errorCount: 2,
			correctives: false,
		});
		expect(await screen.findByText("Nie tym razem")).toBeInTheDocument();
		// Sophia D5.10.2: N = errorCount(2) − maxErrors(1) = 1 → „1 pytania do zaliczenia".
		expect(screen.getByText(/Zabrakło Ci 1 pytania do zaliczenia/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Spróbuj ponownie" })).toHaveAttribute(
			"href",
			"/curriculum/m1/exam",
		);
	});

	it("W3: oblany cap-2 → correctives (Ekran 5), BEZ przycisku retry (Sophia D2)", async () => {
		await runToResult({
			...passedResult,
			passed: false,
			correctCount: 0,
			errorCount: 2,
			attempt: 2,
			correctives: true,
			correctivesPackage: {
				message: "Zabrakło Ci 1 pytania do zaliczenia — 1 koncept do odświeżenia, ~15 min",
				concepts: [{ concept: "fstring", conceptName: "f-string", atoms: [] }],
			},
		});
		expect(await screen.findByText(/Czas na uzupełnienie materiału/)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Spróbuj ponownie/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Spróbuj ponownie/ })).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Wróć do modułu" })).toBeInTheDocument();
	});
});

describe("ExamRunner — 423 correctives_required z /start (S-C)", () => {
	it("renderuje Ekran 5 z paczki 423, bez przycisku retry", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockResolvedValueOnce(
			jsonResponse(423, {
				state: "correctives_required",
				correctivesPackage: {
					message: "Zabrakło Ci 2 pytań do zaliczenia — 2 koncepty do odświeżenia, ~15 min",
					concepts: [{ concept: "petle", conceptName: "Pętle", atoms: [] }],
				},
			}),
		);
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));

		expect(await screen.findByText(/Czas na uzupełnienie materiału/)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Rozpocznij|Spróbuj/ })).not.toBeInTheDocument();
	});

	// I3 (Leo): evaluateExamCycle może zwrócić correctivesRequired bez paczki →
	// start route serializuje `correctivesPackage: undefined` (klucz znika z JSON).
	// isCorrectivesRequired → false. Kontrakt: NIE crash, NIE Ekran 5, NIE wpuszcza
	// do egzaminu (żadna sesja nie powstała — 423). Degradacja do błędu startu,
	// nie do fałszywego „start OK". Ten test przygważdża tę granicę (Quinn/QA).
	it("423 bez paczki (I3) → NIE crash, NIE Ekran 5, brak wejścia do egzaminu", async () => {
		const user = userEvent.setup();
		// 423 bez pola correctivesPackage (kształt po JSON.stringify undefined).
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(423, { state: "correctives_required" }));
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));

		// Blokada trzyma: brak Ekranu 5 (nie ma paczki do pokazania) i brak pytania —
		// nie weszliśmy do egzaminu. Komunikat błędu startu zamiast wywrotki.
		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(screen.queryByText(/Czas na uzupełnienie materiału/)).not.toBeInTheDocument();
		expect(screen.queryByText(/^Pytanie 1 z/)).not.toBeInTheDocument();
		// Dokładnie jedno wywołanie /start — 423 nie wywołało pętli ani complete.
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe("ExamRunner — błędy startu i odpowiedzi", () => {
	it("S2 (422): brak przycisku „Spróbuj ponownie” (ponowienie da ten sam 422)", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(422, { error: "Moduł nie ma skonfigurowanego egzaminu." }),
			);
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(/Ten moduł nie ma jeszcze gotowego egzaminu/);
		expect(screen.queryByRole("button", { name: /Spróbuj ponownie/ })).not.toBeInTheDocument();
		// W karcie błędu (nie górny back-link) jest jedyny sensowny ruch: powrót.
		expect(within(alert).getByRole("link", { name: "Wróć do modułu" })).toBeInTheDocument();
	});

	it("R3 (błąd zapisu): wybór zostaje, komunikat alert, retry lokalny", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(201, {
					sessionId: "s1",
					resumed: false,
					attempt: 1,
					total: 2,
					question: question(0),
				}),
			)
			.mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));
		await screen.findByText("Pytanie 1 z 2");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Dalej" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/Nie udało się zapisać odpowiedzi/);
		// Wybór studenta NIE znika (stan lokalny draft nie czyści się przy błędzie).
		expect(screen.getByRole("radio", { name: "Opcja A" })).toBeChecked();
	});

	it("R2 wznowienie: baner „wracasz” (status) nad pytaniem", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockResolvedValueOnce(
			jsonResponse(200, {
				sessionId: "s1",
				resumed: true,
				attempt: 1,
				total: 2,
				question: question(0),
			}),
		);
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));

		const status = await screen.findByRole("status");
		expect(status).toHaveTextContent(/Wracasz do egzaminu/);
	});
});

describe("ExamRunner — a11y progres + fokus", () => {
	it("pasek postępu ma role=progressbar z aria-valuenow", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockResolvedValueOnce(
			jsonResponse(201, {
				sessionId: "s1",
				resumed: false,
				attempt: 1,
				total: 2,
				question: question(0),
			}),
		);
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));

		const bar = await screen.findByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuenow", "1");
		expect(bar).toHaveAttribute("aria-valuemax", "2");
	});

	it("po przejściu do kolejnego pytania fokus trafia na jego nagłówek", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(201, {
					sessionId: "s1",
					resumed: false,
					attempt: 1,
					total: 2,
					question: question(0),
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse(200, { accepted: true, done: false, question: question(1) }),
			);
		vi.stubGlobal("fetch", fetchMock);
		render(<ExamRunner moduleId="m1" moduleTitle="Python" />);
		await user.click(screen.getByRole("button", { name: "Rozpocznij egzamin" }));
		await screen.findByText("Pytanie 1 z 2");
		await user.click(screen.getByRole("radio", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: "Dalej" }));

		const heading = await screen.findByRole("heading", { name: "Pytanie 2 z 2" });
		await waitFor(() => expect(heading).toHaveFocus());
	});
});
