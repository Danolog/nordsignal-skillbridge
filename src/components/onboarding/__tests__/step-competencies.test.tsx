// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type CompetencyItem, createCompetencyItem, StepCompetencies } from "../step-competencies";

function makeItems(names: string[]): CompetencyItem[] {
	return names.map((name) => createCompetencyItem(name));
}

describe("StepCompetencies", () => {
	it("renders all competency items", () => {
		const items = makeItems(["Python", "SQL", "React"]);
		render(<StepCompetencies competencies={items} onChange={vi.fn()} />);

		expect(screen.getByDisplayValue("Python")).toBeInTheDocument();
		expect(screen.getByDisplayValue("SQL")).toBeInTheDocument();
		expect(screen.getByDisplayValue("React")).toBeInTheDocument();
	});

	it("shows correct filled count against the minimum threshold", () => {
		const items = makeItems(["Python", "", "React"]);
		render(<StepCompetencies competencies={items} onChange={vi.fn()} />);

		// 2 wypełnione kompetencje, poniżej progu 5 → licznik 2/5 + komunikat progu
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText(/\/5/)).toBeInTheDocument();
		expect(screen.getByText(/Pracodawcy oczekują min\. 5 kompetencji/)).toBeInTheDocument();
	});

	it("shows the success hint once the minimum is met", () => {
		const items = makeItems(["A", "B", "C", "D", "E"]);
		render(<StepCompetencies competencies={items} onChange={vi.fn()} />);

		expect(screen.getByText("5")).toBeInTheDocument();
		expect(
			screen.getByText(/Masz komplet 5.*podnosi Twoje szanse u pracodawcy/),
		).toBeInTheDocument();
	});

	it("calls onChange when editing a competency name", () => {
		const items = makeItems(["Python"]);
		const onChange = vi.fn();
		render(<StepCompetencies competencies={items} onChange={onChange} />);

		const input = screen.getByDisplayValue("Python");
		fireEvent.change(input, { target: { value: "Python 3" } });

		expect(onChange).toHaveBeenCalledOnce();
		const updated = onChange.mock.calls[0][0] as CompetencyItem[];
		expect(updated[0].name).toBe("Python 3");
		expect(updated[0].id).toBe(items[0].id);
	});

	it("calls onChange with item removed when delete is clicked", () => {
		const items = makeItems(["Python", "SQL"]);
		const onChange = vi.fn();
		render(<StepCompetencies competencies={items} onChange={onChange} />);

		const deleteButtons = screen.getAllByTitle("Usuń");
		fireEvent.click(deleteButtons[0]);

		expect(onChange).toHaveBeenCalledOnce();
		const remaining = onChange.mock.calls[0][0] as CompetencyItem[];
		expect(remaining).toHaveLength(1);
		expect(remaining[0].name).toBe("SQL");
	});

	it("calls onChange with new empty item when add button is clicked", () => {
		const items = makeItems(["Python"]);
		const onChange = vi.fn();
		render(<StepCompetencies competencies={items} onChange={onChange} />);

		fireEvent.click(screen.getByText("Dodaj kompetencję"));

		expect(onChange).toHaveBeenCalledOnce();
		const updated = onChange.mock.calls[0][0] as CompetencyItem[];
		expect(updated).toHaveLength(2);
		expect(updated[1].name).toBe("");
	});

	it("renders empty state with zero count", () => {
		render(<StepCompetencies competencies={[]} onChange={vi.fn()} />);

		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("Dodaj kompetencję")).toBeInTheDocument();
	});
});

describe("createCompetencyItem", () => {
	it("creates item with unique id and given name", () => {
		const item = createCompetencyItem("Python");
		expect(item.name).toBe("Python");
		expect(item.id).toBeTruthy();
	});

	it("creates items with unique ids", () => {
		const a = createCompetencyItem("A");
		const b = createCompetencyItem("B");
		expect(a.id).not.toBe(b.id);
	});
});
