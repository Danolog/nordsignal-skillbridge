// @vitest-environment jsdom
/**
 * 1E.6a — drabina modułów: „widoczna-ale-zablokowana" (ADR-014 D3).
 *  - moduł locked JEST na liście, ale NIE jest linkiem,
 *  - moduł coming_soon (0 pozycji) nazwany uczciwie („treść w drodze"),
 *  - moduł dostępny/zaliczony prowadzi do /curriculum/{id},
 *  - postęp liczony pozycjami (licznik, nie procent w tekście).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type LadderModuleWithProgress, LadderView } from "../ladder-view";

const modules: LadderModuleWithProgress[] = [
	{
		id: "m-1",
		slug: "l0-start",
		title: "Start: środowisko pracy",
		description: "Colab od zera",
		position: 1,
		status: "in_progress",
		verifiedByMethod: null,
		itemCount: 4,
		completedItems: 1,
	},
	{
		id: "m-2",
		slug: "f1-python-1",
		title: "Python I",
		description: null,
		position: 2,
		status: "locked",
		verifiedByMethod: null,
		itemCount: 8,
		completedItems: 0,
	},
	{
		id: "m-3",
		slug: "m-capstone",
		title: "Capstone",
		description: null,
		position: 3,
		status: "coming_soon",
		verifiedByMethod: null,
		itemCount: 0,
		completedItems: 0,
	},
];

describe("LadderView", () => {
	it("moduł dostępny jest linkiem do widoku modułu", () => {
		render(<LadderView modules={modules} />);
		const link = screen.getByRole("link", { name: /Start: środowisko pracy/ });
		expect(link).toHaveAttribute("href", "/curriculum/m-1");
	});

	it("moduł zablokowany jest WIDOCZNY, ale nie jest linkiem", () => {
		render(<LadderView modules={modules} />);
		expect(screen.getByText("Python I")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Python I/ })).not.toBeInTheDocument();
		const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
		expect(hrefs).not.toContain("/curriculum/m-2");
		// Odznaka statusu (dokładny tekst) + uczciwe wyjaśnienie, czego brakuje.
		expect(screen.getByText("Zablokowany")).toBeInTheDocument();
		expect(screen.getByText(/zalicz wcześniejszy moduł/i)).toBeInTheDocument();
	});

	it("moduł bez pozycji mówi wprost, że treść jest w drodze (i nie jest klikalny)", () => {
		render(<LadderView modules={modules} />);
		expect(screen.getByText("Treść w drodze")).toBeInTheDocument();
		expect(screen.getByText(/Treść tego modułu jeszcze powstaje/)).toBeInTheDocument();
		const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
		expect(hrefs).not.toContain("/curriculum/m-3");
	});

	it("pokazuje postęp modułu licznikiem pozycji", () => {
		render(<LadderView modules={modules} />);
		expect(screen.getByText("1/4 pozycji")).toBeInTheDocument();
	});

	it("pusta drabina: uczciwy komunikat zamiast pustki", () => {
		render(<LadderView modules={[]} />);
		expect(screen.getByText(/nie obejmuje jeszcze Twojego celu kariery/)).toBeInTheDocument();
	});
});
