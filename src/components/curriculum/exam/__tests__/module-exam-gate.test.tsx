// @vitest-environment jsdom
/**
 * 1E.3 · P5 — Ekran 1 karta bramki (Mila 3.2 + Sophia D6.1):
 *  - gate (E3) → „Podejdź do egzaminu" (primary),
 *  - test_out (E1) → „Test out" (outline) + copy BEZPIECZNA (bez „nie liczy się"),
 *  - correctives_in_progress (S-C) → „Dokończ powtórkę" + paczka,
 *  - none/verified → nic.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CorrectivesPackage } from "@/lib/assessment/correctives";
import { ModuleExamGate } from "../module-exam-gate";

const pkg: CorrectivesPackage = {
	message: "Zabrakło Ci 1 pytania do zaliczenia — 1 koncept do odświeżenia, ~15 min",
	concepts: [{ concept: "fstring", conceptName: "f-string", atoms: [] }],
};

describe("ModuleExamGate", () => {
	it("gate (E3): przycisk „Podejdź do egzaminu” prowadzi do /exam", () => {
		render(<ModuleExamGate view={{ kind: "gate" }} moduleId="m1" />);
		expect(screen.getByRole("link", { name: "Podejdź do egzaminu" })).toHaveAttribute(
			"href",
			"/curriculum/m1/exam",
		);
	});

	it("test_out (E1): outline + copy bezpieczna, bez „nie liczy się jako oblany”", () => {
		render(<ModuleExamGate view={{ kind: "test_out" }} moduleId="m1" />);
		expect(screen.getByRole("link", { name: "Test out" })).toHaveAttribute(
			"href",
			"/curriculum/m1/exam",
		);
		expect(screen.getByText(/test out liczy się jako podejście/)).toBeInTheDocument();
		expect(screen.queryByText(/nie liczy się/)).not.toBeInTheDocument();
	});

	it("correctives_in_progress (S-C): „Dokończ powtórkę” + paczka, brak „Podejdź”", () => {
		render(<ModuleExamGate view={{ kind: "correctives_in_progress", pkg }} moduleId="m1" />);
		expect(screen.getByText(/Dokończ powtórkę, żeby podejść ponownie/)).toBeInTheDocument();
		expect(screen.getByText(pkg.message)).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Podejdź do egzaminu" })).not.toBeInTheDocument();
	});

	it("none → nic nie renderuje", () => {
		const { container } = render(<ModuleExamGate view={{ kind: "none" }} moduleId="m1" />);
		expect(container).toBeEmptyDOMElement();
	});

	it("verified → nic nie renderuje", () => {
		const { container } = render(<ModuleExamGate view={{ kind: "verified" }} moduleId="m1" />);
		expect(container).toBeEmptyDOMElement();
	});
});
