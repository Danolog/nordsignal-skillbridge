// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkillMapList } from "../skill-map-list";
import type { SkillNodeData } from "../skill-node";

function node(data: SkillNodeData) {
	return { data };
}

describe("SkillMapList — akordeon grup (C4)", () => {
	const nodes = [
		node({
			label: "SIEM",
			status: "missing",
			marketPercentage: 12,
			groupName: "Wykrywanie i reagowanie",
			groupDescription: "Po co: rozpoznajesz atak i reagujesz.",
			groupUnionShare: 38,
			kind: "concept",
		}),
		node({
			label: "Splunk",
			status: "acquired",
			marketPercentage: 7,
			groupName: "Wykrywanie i reagowanie",
			groupDescription: "Po co: rozpoznajesz atak i reagujesz.",
			groupUnionShare: 38,
			kind: "tool",
		}),
		node({
			label: "IAM",
			status: "acquired",
			marketPercentage: 9,
			groupName: "Tożsamość i dostęp",
			groupUnionShare: 24,
		}),
		// Bez grupy → kubełek „Pozostałe" (G5).
		node({ label: "Soft skill X", status: "acquired" }),
	];

	it("grupuje węzły w sekcje z nagłówkiem grupy + SharePill", () => {
		render(<SkillMapList nodes={nodes} />);
		expect(screen.getByText("Wykrywanie i reagowanie")).toBeDefined();
		expect(screen.getByText("38% ofert grupy")).toBeDefined();
		expect(screen.getByText("Tożsamość i dostęp")).toBeDefined();
		expect(screen.getByText("24% ofert grupy")).toBeDefined();
	});

	it("pokazuje kompetencje grupy z kind i % ofert", () => {
		render(<SkillMapList nodes={nodes} />);
		expect(screen.getByText("SIEM")).toBeDefined();
		expect(screen.getByText("Splunk")).toBeDefined();
		expect(screen.getByText("koncepcja")).toBeDefined();
		expect(screen.getByText("narzędzie")).toBeDefined();
		expect(screen.getByText("12% ofert")).toBeDefined();
	});

	it("grupa z luką jest otwarta domyślnie (details[open])", () => {
		const { container } = render(<SkillMapList nodes={nodes} />);
		const details = container.querySelectorAll("details");
		// Pierwsza grupa ma węzeł 'missing' → otwarta.
		expect((details[0] as HTMLDetailsElement).open).toBe(true);
	});

	it("kubełek 'Pozostałe' bez SharePill (G5) — neutralny", () => {
		render(<SkillMapList nodes={nodes} />);
		expect(screen.getByText("Pozostałe")).toBeDefined();
		expect(screen.getByText("Soft skill X")).toBeDefined();
	});

	it("pusta lista — komunikat zamiast pustej kanwy", () => {
		render(<SkillMapList nodes={[]} />);
		expect(screen.getByText("Brak kompetencji do pokazania.")).toBeDefined();
	});
});
