// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GapList } from "../gap-list";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const mockGaps = [
	{
		id: "g1",
		competencyName: "Python",
		priority: "critical" as const,
		marketPercentage: 78,
		estimatedHours: 10,
		whyImportant: null,
	},
	{
		id: "g2",
		competencyName: "SQL",
		priority: "important" as const,
		marketPercentage: 85,
		estimatedHours: 8,
		whyImportant: null,
	},
	{
		id: "g3",
		competencyName: "Docker",
		priority: "nice_to_have" as const,
		marketPercentage: 22,
		estimatedHours: 5,
		whyImportant: null,
	},
];

const defaultStats = { critical: 1, important: 1, niceToHave: 1 };

describe("GapList", () => {
	it("renders empty state when no gaps", () => {
		render(<GapList gaps={[]} stats={{ critical: 0, important: 0, niceToHave: 0 }} />);
		expect(screen.getByText("Gratulacje!")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Twój profil pokrywa wymagania rynku pracy. Nie znaleźliśmy żadnych luk kompetencyjnych.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Wróć do Dashboard")).toBeInTheDocument();
	});

	it("renders empty state link to dashboard", () => {
		render(<GapList gaps={[]} stats={{ critical: 0, important: 0, niceToHave: 0 }} />);
		const link = screen.getByRole("link", { name: /Wróć do Dashboard/i });
		expect(link).toHaveAttribute("href", "/dashboard");
	});

	it("renders summary stat cards with correct counts", () => {
		render(<GapList gaps={mockGaps} stats={defaultStats} />);
		expect(screen.getByText("Krytyczne")).toBeInTheDocument();
		expect(screen.getByText("Ważne")).toBeInTheDocument();
		expect(screen.getAllByText("Warto znać").length).toBeGreaterThanOrEqual(1);
	});

	it("renders all gap cards", () => {
		render(<GapList gaps={mockGaps} stats={defaultStats} />);
		expect(screen.getByText("Python")).toBeInTheDocument();
		expect(screen.getByText("SQL")).toBeInTheDocument();
		expect(screen.getByText("Docker")).toBeInTheDocument();
	});

	it("renders priority badges", () => {
		render(<GapList gaps={mockGaps} stats={defaultStats} />);
		expect(screen.getAllByText("Krytyczna")).toHaveLength(2); // stat card + gap card
		expect(screen.getAllByText("Ważna")).toHaveLength(2);
	});

	it("renders market percentages", () => {
		render(<GapList gaps={mockGaps} stats={defaultStats} />);
		expect(screen.getByText("78%")).toBeInTheDocument();
		expect(screen.getByText("85%")).toBeInTheDocument();
		expect(screen.getByText("22%")).toBeInTheDocument();
	});

	it("renders estimated hours", () => {
		render(<GapList gaps={mockGaps} stats={defaultStats} />);
		expect(screen.getByText("10h nauki")).toBeInTheDocument();
		expect(screen.getByText("8h nauki")).toBeInTheDocument();
		expect(screen.getByText("5h nauki")).toBeInTheDocument();
	});

	it("renders 'Znajdź projekty' links with correct hrefs", () => {
		render(<GapList gaps={mockGaps} stats={defaultStats} />);
		const closeLinks = screen.getAllByText("Znajdź projekty");
		expect(closeLinks).toHaveLength(3);
		expect(closeLinks[0].closest("a")).toHaveAttribute("href", "/projects?gapId=g1");
	});

	it("renders 'Dlaczego to ważne?' buttons", () => {
		render(<GapList gaps={mockGaps} stats={defaultStats} />);
		const whyButtons = screen.getAllByText("Dlaczego to ważne?");
		expect(whyButtons).toHaveLength(3);
	});

	it("bez pól grupy renderuje płaską siatkę (fallback G2) — brak akordeonu grup", () => {
		const { container } = render(<GapList gaps={mockGaps} stats={defaultStats} />);
		expect(container.querySelector("details.ga-group")).toBeNull();
		expect(screen.getByText("Python")).toBeInTheDocument();
	});
});

// Partia 5, C5 — widok grupowy analizy luk: komentarz grupy „cel nauki cały czas widoczny".
const groupedGaps = [
	{
		id: "g1",
		competencyName: "SIEM",
		priority: "critical" as const,
		marketPercentage: 12,
		estimatedHours: 8,
		whyImportant: null,
		groupName: "Wykrywanie i reagowanie",
		groupDescription: "Po co: rozpoznajesz atak i reagujesz, zanim narobi szkód.",
		groupUnionShare: 38,
		kind: "concept" as const,
	},
	{
		id: "g2",
		competencyName: "Splunk",
		priority: "important" as const,
		marketPercentage: 7,
		estimatedHours: 5,
		whyImportant: null,
		groupName: "Wykrywanie i reagowanie",
		groupDescription: "Po co: rozpoznajesz atak i reagujesz, zanim narobi szkód.",
		groupUnionShare: 38,
		kind: "tool" as const,
	},
	{
		// Bez grupy → kubełek „Pozostałe" (G5): neutralny, bez SharePill ani prozy.
		id: "g3",
		competencyName: "Soft skill X",
		priority: "nice_to_have" as const,
		marketPercentage: 3,
		estimatedHours: 3,
		whyImportant: null,
	},
];

const groupedStats = { critical: 1, important: 1, niceToHave: 1 };

describe("GapList — widok grupowy (C5)", () => {
	it("grupuje luki w sekcje z nagłówkiem grupy + SharePill", () => {
		render(<GapList gaps={groupedGaps} stats={groupedStats} />);
		expect(screen.getByText("Wykrywanie i reagowanie")).toBeInTheDocument();
		expect(screen.getByText("38% ofert grupy")).toBeInTheDocument();
	});

	it("komentarz grupy (po co) jest widoczny BEZ klikniecia (decyzja Darka #5)", () => {
		render(<GapList gaps={groupedGaps} stats={groupedStats} />);
		expect(
			screen.getByText("Po co: rozpoznajesz atak i reagujesz, zanim narobi szkód."),
		).toBeInTheDocument();
	});

	it("pokazuje KindChip (narzędzie/koncepcja) per luka", () => {
		render(<GapList gaps={groupedGaps} stats={groupedStats} />);
		expect(screen.getByText("koncepcja")).toBeInTheDocument();
		expect(screen.getByText("narzędzie")).toBeInTheDocument();
	});

	it("grupa z luką krytyczną jest otwarta domyślnie (details[open])", () => {
		const { container } = render(<GapList gaps={groupedGaps} stats={groupedStats} />);
		const details = container.querySelectorAll("details.ga-group");
		expect((details[0] as HTMLDetailsElement).open).toBe(true);
	});

	it("kubelek Pozostale jest neutralny - bez SharePill (G5)", () => {
		const { container } = render(<GapList gaps={groupedGaps} stats={groupedStats} />);
		const leftover = Array.from(
			container.querySelectorAll<HTMLDetailsElement>("details.ga-group"),
		).find((d) => within(d).queryByText("Pozostałe"));
		expect(leftover).toBeDefined();
		if (leftover) {
			expect(within(leftover).queryByText(/ofert grupy/)).toBeNull();
		}
	});

	it("zero regresji liczenia luk — wszystkie luki nadal wyrenderowane", () => {
		render(<GapList gaps={groupedGaps} stats={groupedStats} />);
		expect(screen.getByText("SIEM")).toBeInTheDocument();
		expect(screen.getByText("Splunk")).toBeInTheDocument();
		expect(screen.getByText("Soft skill X")).toBeInTheDocument();
	});
});
