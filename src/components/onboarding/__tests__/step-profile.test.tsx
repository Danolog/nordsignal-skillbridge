// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type ProfileData, StepProfile } from "../step-profile";

// Strumień E / #5: cel kariery (careerGoal) NIE jest już zbierany w Profilu —
// przeniesiony do Kroku 0 (Pomocnik). StepProfile zbiera tylko uczelnię, kierunek,
// semestr. `careerGoal` zostaje w typie ProfileData jako pole stanu wizarda
// (wypełnia je Krok 0), ale ten komponent go nie renderuje.
const emptyProfile: ProfileData = {
	university: "",
	fieldOfStudy: "",
	semester: "",
	careerGoal: "",
};

describe("StepProfile", () => {
	it("renders the remaining form fields (uczelnia, kierunek, semestr)", () => {
		render(<StepProfile data={emptyProfile} onChange={vi.fn()} />);

		expect(screen.getByText("Uczelnia")).toBeInTheDocument();
		expect(screen.getByText("Kierunek studiów")).toBeInTheDocument();
		expect(screen.getByText("Semestr")).toBeInTheDocument();
	});

	it("does NOT render the career goal field (moved to Krok 0 — Pomocnik)", () => {
		render(<StepProfile data={emptyProfile} onChange={vi.fn()} />);

		// Sedno #5: pytanie o cel kariery zniknęło z Profilu.
		expect(screen.queryByText("Cel kariery")).not.toBeInTheDocument();
		expect(screen.queryByText("Twój cel kariery")).not.toBeInTheDocument();
		expect(screen.queryByText("Inne (wpisz)")).not.toBeInTheDocument();
		expect(screen.queryByPlaceholderText("Wpisz swój cel kariery...")).not.toBeInTheDocument();
	});

	it("renders field of study input with placeholder", () => {
		render(<StepProfile data={emptyProfile} onChange={vi.fn()} />);

		const input = screen.getByPlaceholderText("np. Informatyka, Zarządzanie, Finanse...");
		expect(input).toBeInTheDocument();
	});

	it("renders required asterisks on the three remaining fields", () => {
		render(<StepProfile data={emptyProfile} onChange={vi.fn()} />);

		const asterisks = screen.getAllByText("*");
		// uczelnia + kierunek + semestr = 3 (już bez celu kariery).
		expect(asterisks).toHaveLength(3);
	});
});
