// @vitest-environment jsdom
/**
 * 1E.3 · P5 — Ekran 5 CorrectivesPanel (Mila 7.1–7.5):
 *  - mikrocopy message renderowane wprost,
 *  - atom z moduleSlug → link do trasy-resolvera,
 *  - atom osierocony (moduleSlug=null) → tekst, ZERO linku,
 *  - koncept bez atomów → tekst degradacji, ZERO linku,
 *  - fallback nazwy konceptu (goły slug nigdy nie trafia do studenta),
 *  - lista konceptów jako <ol> (kolejność ma znaczenie).
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CorrectivesPackage } from "@/lib/assessment/correctives";
import { CorrectivesPanel } from "../correctives-panel";

const pkg: CorrectivesPackage = {
	message: "Zabrakło Ci 1 pytania do zaliczenia — 3 koncepty do odświeżenia, ~15 min",
	concepts: [
		{
			concept: "fstring",
			conceptName: "f-string i formatowanie",
			atoms: [
				{
					slug: "fstring-teoria",
					title: "f-string i interpolacja",
					kind: "theory",
					moduleSlug: "l1",
				},
			],
		},
		{
			concept: "if-else-branch",
			conceptName: null, // fallback → humanizacja
			atoms: [
				{ slug: "orphan-atom", title: "warunki", kind: "exercise", moduleSlug: null }, // osierocony
			],
		},
		{ concept: "petle", conceptName: "Pętle", atoms: [] }, // koncept bez atomów
	],
};

describe("CorrectivesPanel", () => {
	it("renderuje mikrocopy message z API", () => {
		render(<CorrectivesPanel pkg={pkg} backHref="/curriculum/m1" />);
		expect(screen.getByText(/Zabrakło Ci 1 pytania do zaliczenia/)).toBeInTheDocument();
	});

	it("atom z moduleSlug jest linkiem do trasy-resolvera", () => {
		render(<CorrectivesPanel pkg={pkg} backHref="/curriculum/m1" />);
		const link = screen.getByRole("link", { name: /Teoria — f-string i interpolacja/ });
		expect(link).toHaveAttribute("href", "/curriculum/atom/l1/fstring-teoria");
	});

	it("atom osierocony (moduleSlug=null) NIE jest linkiem — tekst „w przygotowaniu”", () => {
		render(<CorrectivesPanel pkg={pkg} backHref="/curriculum/m1" />);
		expect(screen.getByText(/Ćwiczenie — warunki — materiał w przygotowaniu/)).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /warunki/ })).not.toBeInTheDocument();
	});

	it("koncept bez atomów renderuje tekst degradacji bez linku", () => {
		render(<CorrectivesPanel pkg={pkg} backHref="/curriculum/m1" />);
		expect(
			screen.getByText(/Materiału powtórkowego dla tego tematu jeszcze nie mamy/),
		).toBeInTheDocument();
	});

	it("fallback nazwy konceptu (null) → humanizowany slug, nigdy goły slug", () => {
		render(<CorrectivesPanel pkg={pkg} backHref="/curriculum/m1" />);
		expect(screen.getByRole("heading", { name: "If else branch" })).toBeInTheDocument();
		expect(screen.queryByText("if-else-branch")).not.toBeInTheDocument();
	});

	it("lista konceptów to <ol> (kolejność stabilna)", () => {
		const { container } = render(<CorrectivesPanel pkg={pkg} backHref="/curriculum/m1" />);
		const ol = container.querySelector("ol");
		expect(ol).not.toBeNull();
		const headings = within(ol as HTMLElement).getAllByRole("heading", { level: 3 });
		expect(headings.map((h) => h.textContent)).toEqual([
			"f-string i formatowanie",
			"If else branch",
			"Pętle",
		]);
	});

	it("jedyna akcja ekranu: „Wróć do modułu”", () => {
		render(<CorrectivesPanel pkg={pkg} backHref="/curriculum/m1" />);
		expect(screen.getByRole("link", { name: "Wróć do modułu" })).toHaveAttribute(
			"href",
			"/curriculum/m1",
		);
	});
});
