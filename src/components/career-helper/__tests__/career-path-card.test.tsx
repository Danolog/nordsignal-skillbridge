// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CareerPathCard } from "../career-path-card";

/**
 * Egzekucja HITL (ADR-004 §4.3 a/c): karta BEZ procentu/rankingu/paska
 * prawdopodobieństwa. Karta dostaje tylko label + why — nie ma czego
 * wyrenderować jako werdykt.
 */
describe("CareerPathCard", () => {
	const base = {
		pathLabel: "Analityk danych",
		why: "Z tego, co powiedziałeś, lubisz pracę z liczbami i rozwiązywanie problemów.",
		onSelect: vi.fn(),
	};

	it("pokazuje label i opis powiązania", () => {
		render(<CareerPathCard {...base} state="default" />);
		expect(screen.getByText("Analityk danych")).toBeInTheDocument();
		expect(screen.getByText(/lubisz pracę z liczbami/)).toBeInTheDocument();
		expect(screen.getByText("Dlaczego ten obszar rezonuje z Tobą")).toBeInTheDocument();
	});

	it("NIE renderuje procentu ani rankingu", () => {
		const { container } = render(<CareerPathCard {...base} state="default" />);
		// Brak znaku procentu i brak numeracji rankingowej w treści karty.
		expect(container.textContent).not.toMatch(/%/);
		expect(container.textContent).not.toMatch(/\b\d+\s*%/);
		expect(container.querySelector('[role="progressbar"]')).toBeNull();
	});

	it("CTA default ma aria-pressed=false i wywołuje onSelect", async () => {
		const onSelect = vi.fn();
		render(<CareerPathCard {...base} onSelect={onSelect} state="default" />);
		const btn = screen.getByRole("button", { name: /Wybieram ścieżkę Analityk danych/ });
		expect(btn).toHaveAttribute("aria-pressed", "false");
		await userEvent.click(btn);
		expect(onSelect).toHaveBeenCalledOnce();
	});

	it("stan selected ma aria-pressed=true i etykietę „Wybrana ścieżka”", () => {
		render(<CareerPathCard {...base} state="selected" />);
		expect(screen.getByText("Wybrana ścieżka")).toBeInTheDocument();
		expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
	});

	it("stan dimmed wyłącza CTA", () => {
		render(<CareerPathCard {...base} state="dimmed" />);
		expect(screen.getByRole("button")).toBeDisabled();
	});
});
