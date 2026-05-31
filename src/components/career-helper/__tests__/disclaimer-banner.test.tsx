// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisclaimerBanner } from "../disclaimer-banner";

/**
 * Audytowalność HITL (spec §6.5): disclaimer „To NIE są rekomendacje” żyje
 * zhardkodowany w komponencie, bez propsów. Test pilnuje, że string istnieje
 * i nie da się go podmienić przez props.
 */
describe("DisclaimerBanner", () => {
	it("renderuje stały disclaimer „To NIE są rekomendacje”", () => {
		render(<DisclaimerBanner />);
		expect(screen.getByText("To NIE są rekomendacje")).toBeInTheDocument();
	});

	it("zawiera tekst o decyzji studenta po rozmowie z opiekunem (HITL)", () => {
		render(<DisclaimerBanner />);
		expect(
			screen.getByText(/Finalna decyzja jest Twoja po rozmowie z opiekunem/),
		).toBeInTheDocument();
	});

	it("ma role=note (ważne, nie krytyczne) — nie alert", () => {
		render(<DisclaimerBanner />);
		expect(screen.getByRole("note")).toBeInTheDocument();
	});
});
