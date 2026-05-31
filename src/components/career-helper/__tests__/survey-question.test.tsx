// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SURVEY_QUESTIONS } from "@/lib/career-helper/types";
import { SurveyQuestion } from "../survey-question";

const q1 = SURVEY_QUESTIONS[0]; // single-choice
const q3 = SURVEY_QUESTIONS[2]; // multi-choice cap 3
const q4 = SURVEY_QUESTIONS[3]; // textarea min 10

describe("SurveyQuestion", () => {
	it("single-choice: radiogroup z opcjami, wybór woła onChange", async () => {
		const onChange = vi.fn();
		render(<SurveyQuestion def={q1} value="" onChange={onChange} />);
		expect(screen.getByRole("radiogroup")).toBeInTheDocument();
		await userEvent.click(screen.getByLabelText("Własna działalność / freelance"));
		expect(onChange).toHaveBeenCalledWith("Własna działalność / freelance");
	});

	it("multi-choice: cap blokuje czwarty wybór (max 3)", () => {
		const onChange = vi.fn();
		const three = q3.options?.slice(0, 3) ?? [];
		render(<SurveyQuestion def={q3} value={three} onChange={onChange} />);
		// Czwarta opcja jest disabled po osiągnięciu capa.
		const fourth = q3.options?.[3] as string;
		expect(screen.getByLabelText(fourth)).toBeDisabled();
	});

	it("textarea: aria-required oraz licznik znaków", () => {
		render(<SurveyQuestion def={q4} value="" onChange={vi.fn()} />);
		const ta = screen.getByRole("textbox");
		expect(ta).toHaveAttribute("aria-required", "true");
		expect(screen.getByText(/Zostało 280 znaków · min\. 10/)).toBeInTheDocument();
	});

	it("textarea: showError ustawia aria-invalid i komunikat min.", () => {
		render(<SurveyQuestion def={q4} value="krótko" onChange={vi.fn()} showError />);
		const ta = screen.getByRole("textbox");
		expect(ta).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByText("Min. 10 znaków")).toBeInTheDocument();
	});
});
