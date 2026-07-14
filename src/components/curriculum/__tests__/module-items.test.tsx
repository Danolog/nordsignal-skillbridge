// @vitest-environment jsdom
/**
 * 1E.6a — pozycje modułu:
 *  - pozycja dostępna prowadzi do widoku pozycji,
 *  - pozycja locked jest widoczna, ale nie jest linkiem (bramką jest serwer),
 *  - lab NIE udaje, że da się go zaliczyć — mówi o 1E.6b wprost.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LadderItem } from "@/lib/curriculum/ladder";
import { ModuleItems } from "../module-items";

const items: LadderItem[] = [
	{ id: "i-1", position: 1, kind: "exercise", title: "Zmienne", status: "completed" },
	{ id: "i-2", position: 2, kind: "lab", title: "Uruchom komórkę", status: "available" },
	{ id: "i-3", position: 3, kind: "exercise", title: "Typy", status: "locked" },
];

describe("ModuleItems", () => {
	it("pozycja dostępna jest linkiem do widoku pozycji", () => {
		render(<ModuleItems items={items} moduleId="m-1" />);
		expect(screen.getByRole("link", { name: /Uruchom komórkę/ })).toHaveAttribute(
			"href",
			"/curriculum/m-1/i-2",
		);
	});

	it("pozycja zablokowana jest widoczna, ale nieklikalna", () => {
		render(<ModuleItems items={items} moduleId="m-1" />);
		expect(screen.getByText("Typy")).toBeInTheDocument();
		const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
		expect(hrefs).not.toContain("/curriculum/m-1/i-3");
	});

	it("lab mówi wprost, że automatyczne zaliczanie wchodzi dopiero w 1E.6b", () => {
		render(<ModuleItems items={items} moduleId="m-1" />);
		expect(screen.getByText(/Automatyczne sprawdzanie labów wchodzi w 1E.6b/)).toBeInTheDocument();
	});

	it("moduł bez pozycji: uczciwy komunikat", () => {
		render(<ModuleItems items={[]} moduleId="m-1" />);
		expect(screen.getByText(/Treść tego modułu jeszcze powstaje/)).toBeInTheDocument();
	});
});
