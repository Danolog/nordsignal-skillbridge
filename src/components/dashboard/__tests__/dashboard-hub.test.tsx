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

const defaultProps = {
	user: { name: "Anna Kowalska" },
	student: {
		university: "WSB Merito Wrocław",
		fieldOfStudy: "Informatyka",
		semester: 4,
		careerGoal: "Full-stack Developer",
	},
	competencyCount: 15,
	gapCount: 5,
	courseCount: 2,
	marketCoverage: 42,
};

describe("DashboardHub", () => {
	it("renders welcome greeting with first name", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("Cześć, Anna!")).toBeInTheDocument();
	});

	it("renders student info in subtitle", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("WSB Merito Wrocław")).toBeInTheDocument();
		expect(screen.getByText("Informatyka, sem. 4")).toBeInTheDocument();
		expect(screen.getByText("Cel: Full-stack Developer")).toBeInTheDocument();
	});

	it("renders market coverage progress", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("Twój Paszport Kompetencji")).toBeInTheDocument();
		expect(screen.getByText("42%")).toBeInTheDocument();
	});

	it("renders all 4 navigation tiles", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("Skill Map")).toBeInTheDocument();
		expect(screen.getByText("Gap Analysis")).toBeInTheDocument();
		expect(screen.getByText("Projekty")).toBeInTheDocument();
		expect(screen.getByText("Paszport")).toBeInTheDocument();
	});

	it("renders tile stats with correct counts", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("15 masz • 5 brakuje")).toBeInTheDocument();
		expect(screen.getByText("5 luk do zamknięcia")).toBeInTheDocument();
		expect(screen.getByText("2 ukończone")).toBeInTheDocument();
		expect(screen.getByText("Udostępnij")).toBeInTheDocument();
	});

	it("renders tile links with correct hrefs", () => {
		render(<DashboardHub {...defaultProps} />);
		const links = screen.getAllByRole("link");
		const hrefs = links.map((l) => l.getAttribute("href"));
		expect(hrefs).toContain("/skill-map");
		expect(hrefs).toContain("/gap-analysis");
		expect(hrefs).toContain("/projects");
		expect(hrefs).toContain("/passport");
	});

	it("renders user initials in avatar", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.getByText("AK")).toBeInTheDocument();
	});

	it("renders 0% coverage when no passport", () => {
		render(<DashboardHub {...defaultProps} marketCoverage={0} />);
		expect(screen.getByText("0%")).toBeInTheDocument();
	});

	it("wyciszenie Spokojny ekspert (C5) - bez dekoracyjnych poswiat na karcie motywacji", () => {
		const { container } = render(<DashboardHub {...defaultProps} />);
		expect(container.querySelector(".db-motivation-glow-right")).toBeNull();
		expect(container.querySelector(".db-motivation-glow-left")).toBeNull();
	});
});
