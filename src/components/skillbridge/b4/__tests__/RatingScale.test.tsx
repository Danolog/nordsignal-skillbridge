// @vitest-environment jsdom
/**
 * Testy jednostkowe RatingScale (B4).
 *
 * Pokrycie: skala słowna PRD, ARIA, klawiatura, onChange, disabled.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RATING_OPTIONS, RatingScale } from "../RatingScale";

describe("RatingScale — skala słowna PRD", () => {
	it("renderuje 4 segmenty z etykietami PRD (nie golden)", () => {
		render(
			<RatingScale
				value={null}
				name="sql"
				ariaLabel="Poziom kompetencji: SQL"
				onChange={vi.fn()}
			/>,
		);
		// Etykiety PRD 1:1 (spec §5.2, §8.1) — NIGDY golden "Podstawy/Średnio/Dobrze/Biegle"
		expect(screen.getByText("nie znam")).toBeInTheDocument();
		expect(screen.getByText("uczę się")).toBeInTheDocument();
		expect(screen.getByText("znam")).toBeInTheDocument();
		expect(screen.getByText("dobrze znam")).toBeInTheDocument();
	});

	it("golden etykiety NIE są renderowane (spec §8.1 — PRD wygrywa)", () => {
		render(
			<RatingScale
				value={null}
				name="sql"
				ariaLabel="Poziom kompetencji: SQL"
				onChange={vi.fn()}
			/>,
		);
		expect(screen.queryByText("Podstawy")).not.toBeInTheDocument();
		expect(screen.queryByText("Średnio")).not.toBeInTheDocument();
		expect(screen.queryByText("Dobrze")).not.toBeInTheDocument();
		expect(screen.queryByText("Biegle")).not.toBeInTheDocument();
	});

	it("radiogroup ma aria-label z nazwą kompetencji", () => {
		render(
			<RatingScale
				value={null}
				name="sql"
				ariaLabel="Poziom kompetencji: SQL"
				onChange={vi.fn()}
			/>,
		);
		const group = screen.getByRole("radiogroup");
		expect(group).toHaveAttribute("aria-label", "Poziom kompetencji: SQL");
	});

	it("każdy segment ma role=radio (natywny input), zaznaczony ma checked=true", () => {
		render(
			<RatingScale value={3} name="sql" ariaLabel="Poziom kompetencji: SQL" onChange={vi.fn()} />,
		);
		const radios = screen.getAllByRole("radio");
		expect(radios).toHaveLength(4);

		// Natywny input[type=radio] — stan przez `checked` (nie aria-checked)
		// Tylko input z value=3 ("znam") jest zaznaczony
		const checked = radios.filter((r) => (r as HTMLInputElement).checked);
		expect(checked).toHaveLength(1);
		// Aria-label na natywnym inpucie zawiera etykietę poziomu
		expect(checked[0]).toHaveAttribute("aria-label", expect.stringContaining("znam"));
	});

	it("onClick wywołuje onChange z poprawną wartością", () => {
		const onChange = vi.fn();
		render(
			<RatingScale
				value={null}
				name="sql"
				ariaLabel="Poziom kompetencji: SQL"
				onChange={onChange}
			/>,
		);
		const radios = screen.getAllByRole("radio");
		fireEvent.click(radios[1]); // klik "uczę się" (value=2)
		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith(2);
	});

	it("disabled: input jest wyłączony (disabled=true), onChange NIE jest wołany przez fireEvent.change", () => {
		const onChange = vi.fn();
		render(
			<RatingScale
				value={null}
				name="sql"
				ariaLabel="Poziom kompetencji: SQL"
				disabled={true}
				onChange={onChange}
			/>,
		);
		const radios = screen.getAllByRole("radio");
		// Natywny input[disabled] — sprawdzamy że jest wyłączony
		expect(radios[0]).toBeDisabled();
		// fireEvent.change na disabled input — React nie propaguje onChange dla disabled
		fireEvent.change(radios[0], { target: { checked: true } });
		expect(onChange).not.toHaveBeenCalled();
	});

	it("klawisz ArrowRight zmienia fokus i wołuje onChange z następną wartością", () => {
		const onChange = vi.fn();
		render(
			<RatingScale value={2} name="sql" ariaLabel="Poziom kompetencji: SQL" onChange={onChange} />,
		);
		const radios = screen.getAllByRole("radio");
		// ArrowRight na elemencie z value=2 → value=3
		fireEvent.keyDown(radios[1], { key: "ArrowRight" });
		expect(onChange).toHaveBeenCalledWith(3);
	});

	it("klawisz ArrowLeft zmienia fokus i wołuje onChange z poprzednią wartością", () => {
		const onChange = vi.fn();
		render(
			<RatingScale value={3} name="sql" ariaLabel="Poziom kompetencji: SQL" onChange={onChange} />,
		);
		const radios = screen.getAllByRole("radio");
		// ArrowLeft na elemencie z value=3 → value=2
		fireEvent.keyDown(radios[2], { key: "ArrowLeft" });
		expect(onChange).toHaveBeenCalledWith(2);
	});

	it("ArrowRight na value=4 wraca do value=1 (wrap-around)", () => {
		const onChange = vi.fn();
		render(
			<RatingScale value={4} name="sql" ariaLabel="Poziom kompetencji: SQL" onChange={onChange} />,
		);
		const radios = screen.getAllByRole("radio");
		fireEvent.keyDown(radios[3], { key: "ArrowRight" });
		expect(onChange).toHaveBeenCalledWith(1);
	});

	it("RATING_OPTIONS ma dokładnie 4 pozycje z wartościami 1–4", () => {
		const values = RATING_OPTIONS.map((o) => o.value);
		expect(values).toEqual([1, 2, 3, 4]);
	});
});
