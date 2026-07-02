// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHub } from "../dashboard-hub";

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

const competencies = [
	{ id: "2", name: "Python", status: "in_progress", marketPercentage: 15, selfAssessment: 2 },
	{ id: "3", name: "Linux", status: "acquired", marketPercentage: 9, selfAssessment: 4 },
];

const gaps = [{ competencyName: "SIEM", priority: "critical", marketPercentage: 11 }];

const defaultProps = {
	user: { name: "Anna Kowalska" },
	student: {
		university: "WSB Merito Wrocław",
		fieldOfStudy: "Informatyka",
		semester: 4,
		careerGoal: "Full-stack Developer",
	},
	competencies,
	gaps,
	gapCount: 5,
	criticalGapCount: 2,
	inProgressCount: 1,
	marketCoverage: 42,
	topGap: {
		id: "1",
		competencyName: "SIEM",
		priority: "critical",
		marketPercentage: 11,
		whyImportant: "Rynek wymaga monitorowania zdarzeń.",
	},
};

describe("DashboardHub", () => {
	it("renderuje powitanie z imieniem", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("Cześć, Anna.")).toBeInTheDocument();
	});

	it("renderuje pokrycie rynku", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("Pokrycie kompetencji rynkowych")).toBeInTheDocument();
		expect(screen.getAllByText("42%").length).toBeGreaterThan(0);
	});

	it("renderuje trzy kolumny kanbana", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText(/Do zrobienia/)).toBeInTheDocument();
		expect(screen.getByText(/W trakcie/)).toBeInTheDocument();
		expect(screen.getByText(/Opanowane/)).toBeInTheDocument();
	});

	it("umieszcza kompetencje w kolumnach wg statusu", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("SIEM", { selector: ".db-kcard-name" })).toBeInTheDocument();
		expect(screen.getByText("Python")).toBeInTheDocument();
		expect(screen.getByText("Linux")).toBeInTheDocument();
	});

	it("pokazuje następny krok z największej luki", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("SIEM — Twoja największa luka")).toBeInTheDocument();
	});

	it("renderuje szybkie wejścia z poprawnymi hrefami", () => {
		render(<DashboardHub {...defaultProps} />);
		const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
		expect(hrefs).toContain("/gap-analysis");
		expect(hrefs).toContain("/projects");
		expect(hrefs).toContain("/passport");
	});

	it("obsługuje pustą mapę kompetencji bez błędu", () => {
		render(<DashboardHub {...defaultProps} competencies={[]} gaps={[]} topGap={null} />);
		expect(screen.getByText(/mapa kompetencji jest jeszcze pusta/i)).toBeInTheDocument();
	});
});
