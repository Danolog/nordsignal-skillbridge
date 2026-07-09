// @vitest-environment jsdom
/**
 * StepDiagnosis (A5/1.12) — logika klienta testu adaptacyjnego:
 *  - odpowiedzi per typ pytania budują właściwy kształt answer_json
 *    (single: {selected}, multi: {selected[]}, numeric: {value string}),
 *  - „Dalej" zablokowane bez odpowiedzi; ZERO feedbacku w trakcie,
 *  - done → complete → onFinished (bez uncovered) ALBO faza mini-samooceny,
 *  - mini-samoocena uncovered przekazuje wybrane poziomy w outcome,
 *  - 409 z answer → ekran desync z „Wznów test" (onRestart).
 *
 * fetch mockowany na granicy — kontrakty tras dowodzą testy integracyjne.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssessmentResult } from "@/lib/assessment/types";
import { type DiagnosisQuestion, StepDiagnosis } from "../step-diagnosis";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

const Q_SINGLE: DiagnosisQuestion = {
	itemId: "item-d2",
	competencyName: "Python",
	type: "single_choice",
	stem: "Pytanie pojedynczego wyboru?",
	options: ["Opcja A", "Opcja B", "Opcja C"],
	position: 0,
	total: 2,
};

const Q_MULTI: DiagnosisQuestion = {
	itemId: "item-d3",
	competencyName: "Python",
	type: "multi_choice",
	stem: "Zaznacz wszystkie poprawne?",
	options: ["M1", "M2", "M3", "M4"],
	position: 1,
	total: 2,
};

const RESULT: AssessmentResult = {
	schemaVersion: 1,
	kind: "diagnostic",
	concepts: { "ds-python": { asked: 2, correct: 2, level: 4 } },
	competencies: { Python: 4 },
	uncovered: [],
};

const noop = () => {};

beforeEach(() => {
	fetchMock.mockReset();
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("StepDiagnosis — przepływ pytań i kształty odpowiedzi", () => {
	it("single→multi→numeric: właściwe answer_json, zero feedbacku, complete → onFinished", async () => {
		const user = userEvent.setup();
		const onFinished = vi.fn();

		// answer #1 (single) → zwraca multi; answer #2 (multi) → done; complete → result.
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ accepted: true, done: false, question: Q_MULTI }))
			.mockResolvedValueOnce(jsonResponse({ accepted: true, done: true, question: null }))
			.mockResolvedValueOnce(jsonResponse({ result: RESULT }));

		render(
			<StepDiagnosis
				sessionId="ses-1"
				total={2}
				initialQuestion={Q_SINGLE}
				uncoveredNames={[]}
				onFinished={onFinished}
				onRestart={noop}
				onBack={noop}
			/>,
		);

		// Bez odpowiedzi „Dalej" zablokowane.
		const next = screen.getByRole("button", { name: /dalej/i });
		expect(next).toBeDisabled();

		await user.click(screen.getByRole("button", { name: "Opcja B" }));
		await user.click(screen.getByRole("button", { name: /dalej/i }));

		// Kształt odpowiedzi single: {selected: 1}; trasa answer sesji ses-1.
		const [url1, init1] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url1).toBe("/api/assessment/ses-1/answer");
		expect(JSON.parse(String(init1.body))).toEqual({
			questionItemId: "item-d2",
			answer: { selected: 1 },
		});

		// Zero feedbacku: żadnego „dobrze/źle" po odpowiedzi — od razu następne pytanie.
		await screen.findByText("Zaznacz wszystkie poprawne?");
		expect(screen.queryByText(/dobrze|poprawnie|źle|błędnie/i)).toBeNull();

		await user.click(screen.getByRole("button", { name: "M1" }));
		await user.click(screen.getByRole("button", { name: "M3" }));
		await user.click(screen.getByRole("button", { name: /dalej/i }));

		const [, init2] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(JSON.parse(String(init2.body))).toEqual({
			questionItemId: "item-d3",
			answer: { selected: [0, 2] },
		});

		// done → complete → onFinished z wynikiem (bez fazy uncovered).
		await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
		expect(fetchMock.mock.calls[2][0]).toBe("/api/assessment/ses-1/complete");
		expect(onFinished).toHaveBeenCalledWith({ result: RESULT, uncoveredLevels: {} });
	});

	it("numeric: wysyła {value: string} (normalizacja przecinka po stronie serwera)", async () => {
		const user = userEvent.setup();
		fetchMock.mockResolvedValueOnce(
			jsonResponse({ accepted: true, done: false, question: Q_MULTI }),
		);

		render(
			<StepDiagnosis
				sessionId="ses-2"
				total={2}
				initialQuestion={{ ...Q_SINGLE, type: "numeric", options: null, stem: "Podaj wynik?" }}
				uncoveredNames={[]}
				onFinished={noop}
				onRestart={noop}
				onBack={noop}
			/>,
		);

		await user.type(screen.getByLabelText("Twoja odpowiedź"), "3,14");
		await user.click(screen.getByRole("button", { name: /dalej/i }));

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			questionItemId: "item-d2",
			answer: { value: "3,14" },
		});
	});

	it("uncovered: po complete faza mini-samooceny; poziomy trafiają do outcome", async () => {
		const user = userEvent.setup();
		const onFinished = vi.fn();
		const resultWithUncovered: AssessmentResult = { ...RESULT, uncovered: ["Terraform"] };

		fetchMock
			.mockResolvedValueOnce(jsonResponse({ accepted: true, done: true, question: null }))
			.mockResolvedValueOnce(jsonResponse({ result: resultWithUncovered }));

		render(
			<StepDiagnosis
				sessionId="ses-3"
				total={2}
				initialQuestion={Q_SINGLE}
				uncoveredNames={["Terraform"]}
				onFinished={onFinished}
				onRestart={noop}
				onBack={noop}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: /dalej/i }));

		// Faza uncovered: jawny komunikat + selektor poziomów dla Terraform.
		await screen.findByText(/oceń je samodzielnie/i);
		expect(screen.getByText("Terraform")).toBeInTheDocument();

		// Wybór poziomu 3 („znam" dla kind=null — dokładna etykieta, nie „dobrze znam").
		await user.click(screen.getByRole("button", { name: /^znam$/i }));
		await user.click(screen.getByRole("button", { name: /zapisz i zobacz wnioski/i }));

		expect(onFinished).toHaveBeenCalledOnce();
		const outcome = onFinished.mock.calls[0][0];
		expect(outcome.result).toEqual(resultWithUncovered);
		expect(outcome.uncoveredLevels).toEqual({ Terraform: 3 });
	});

	it("409 z answer → ekran desync z przyciskiem wznowienia (onRestart)", async () => {
		const user = userEvent.setup();
		const onRestart = vi.fn();
		fetchMock.mockResolvedValueOnce(jsonResponse({ error: "conflict" }, 409));

		render(
			<StepDiagnosis
				sessionId="ses-4"
				total={2}
				initialQuestion={Q_SINGLE}
				uncoveredNames={[]}
				onFinished={noop}
				onRestart={onRestart}
				onBack={noop}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Opcja A" }));
		await user.click(screen.getByRole("button", { name: /dalej/i }));

		await screen.findByText(/stracił synchronizację/i);
		await user.click(screen.getByRole("button", { name: /wznów test/i }));
		expect(onRestart).toHaveBeenCalledOnce();
	});
});
