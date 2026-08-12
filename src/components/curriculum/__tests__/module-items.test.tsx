// @vitest-environment jsdom
/**
 * 1E.6a — pozycje modułu:
 *  - pozycja dostępna prowadzi do widoku pozycji,
 *  - pozycja locked jest widoczna, ale nie jest linkiem (bramką jest serwer),
 *  - lab NIE udaje, że da się go zaliczyć — mówi o 1E.6b wprost.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LAB_ITEM_HINT } from "@/components/curriculum/labels";
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

	// Poprzednia wersja tego testu pilnowała zdania „Automatyczne sprawdzanie labów
	// wchodzi w 1E.6b — tej pozycji nie da się dziś zaliczyć". Zdanie było prawdziwe
	// do PR #180 i przestało nim być w PR #181, gdy weszło zaliczanie kodem z notatnika
	// (ADR-015) — ale nikt go nie zdjął, a test pilnował go dalej. Efekt: przez pół
	// roku produkt odstraszał studenta od pozycji, którą da się zaliczyć, a zielony
	// test to potwierdzał (sygnał Darka 2026-08-10, „to po co próbować?").
	// Dlatego dziś pilnujemy DWÓCH rzeczy: że podpis opisuje czynność po polsku
	// ORAZ że nie twierdzi, iż zaliczenie jest niemożliwe.
	// Od #291 asercja idzie po STAŁEJ, nie po przepisanym tutaj zdaniu: test ma
	// dowodzić, że widok renderuje nośnik, a nie być trzecią kopią tekstu.
	// Za samą TREŚĆ stałej odpowiada A2/A3 w `tests/unit/ds/jezyk-produktu.contract.test.ts`.
	it("zadanie praktyczne: podpis opisuje czynność, nie odstrasza kodem wewnętrznym", () => {
		render(<ModuleItems items={items} moduleId="m-1" />);
		expect(screen.getByText(LAB_ITEM_HINT)).toBeInTheDocument();
		expect(screen.queryByText(/nie da się dziś zaliczyć/)).not.toBeInTheDocument();
		expect(screen.queryByText(/1E\.\d/)).not.toBeInTheDocument();
	});

	it("moduł bez pozycji: uczciwy komunikat", () => {
		render(<ModuleItems items={[]} moduleId="m-1" />);
		expect(screen.getByText(/Treść tego modułu jeszcze powstaje/)).toBeInTheDocument();
	});
});
