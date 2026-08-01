// @vitest-environment jsdom
/**
 * 1E.3 · P5 — linia bramki egzaminu (E3) na drabinie (Mila 3.1):
 *  - moduł z egzaminem, wszystkie pozycje zrobione, in_progress → linia CTA,
 *  - bez flagi (hasExam undefined) → linia się NIE renderuje (drabina jak dziś),
 *  - link „Podejdź do egzaminu" prowadzi do /exam z aria-label pełnym.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type LadderModuleWithProgress, LadderView } from "../ladder-view";

const gateModule = (over: Partial<LadderModuleWithProgress> = {}): LadderModuleWithProgress => ({
	id: "m1",
	slug: "l1-python",
	title: "Python od zera",
	description: null,
	position: 1,
	status: "in_progress",
	verifiedByMethod: null,
	openedByPlacementEver: false,
	itemCount: 5,
	completedItems: 5,
	hasExam: true,
	...over,
});

describe("LadderView — linia bramki egzaminu E3", () => {
	it("pokazuje linię CTA, gdy egzamin + wszystkie pozycje zrobione", () => {
		render(<LadderView modules={[gateModule()]} />);
		expect(screen.getByText(/Wszystkie pozycje zrobione — zdaj egzamin/)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: "Podejdź do egzaminu modułu Python od zera" });
		expect(link).toHaveAttribute("href", "/curriculum/m1/exam");
	});

	it("BEZ hasExam (flaga OFF) linia się nie renderuje — drabina jak dziś", () => {
		render(<LadderView modules={[gateModule({ hasExam: undefined })]} />);
		expect(screen.queryByText(/zdaj egzamin, by odblokować/)).not.toBeInTheDocument();
	});

	it("nie pokazuje linii, gdy nie wszystkie pozycje zrobione", () => {
		render(<LadderView modules={[gateModule({ completedItems: 3 })]} />);
		expect(screen.queryByText(/zdaj egzamin, by odblokować/)).not.toBeInTheDocument();
	});
});
