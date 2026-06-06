// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PassportPublic } from "../passport-public";

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

const mockData = {
	id: "passport-uuid-456",
	student: {
		name: "Anna Nowak",
		university: "Politechnika Warszawska",
		fieldOfStudy: "Informatyka",
		semester: 5,
		careerGoal: "Backend Developer",
	},
	marketCoveragePercent: 60,
	competencies: [
		{ name: "Java", status: "acquired" as const, marketPercentage: 80 },
		{ name: "Spring", status: "in_progress" as const, marketPercentage: 70 },
		{ name: "Docker", status: "missing" as const, marketPercentage: 65 },
	],
	gapCount: 1,
	generatedAt: "2026-03-08T12:00:00.000Z",
};

describe("PassportPublic", () => {
	it("renders student name", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Anna Nowak")).toBeInTheDocument();
	});

	it("renders avatar initials", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("AN")).toBeInTheDocument();
	});

	it("renders university", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Politechnika Warszawska")).toBeInTheDocument();
	});

	it("renders field of study", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Informatyka")).toBeInTheDocument();
	});

	it("renders semester", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Semestr 5")).toBeInTheDocument();
	});

	it("renders career goal", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText(/Cel: Backend Developer/)).toBeInTheDocument();
	});

	it("renders verified badge", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Zweryfikowany")).toBeInTheDocument();
	});

	it("renders SkillBridge topbar", () => {
		const { container } = render(<PassportPublic data={mockData} />);
		const topbarText = container.querySelector(".pp-public-topbar-text");
		expect(topbarText).toHaveTextContent("SkillBridge");
	});

	it("renders topbar icon S", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("S")).toBeInTheDocument();
	});

	it("renders market coverage percentage", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("60%")).toBeInTheDocument();
	});

	it("renders progress bar with correct width", () => {
		const { container } = render(<PassportPublic data={mockData} />);
		const fill = container.querySelector(".pp-progress-fill");
		expect(fill).toHaveStyle({ width: "60%" });
	});

	it("renders names of acquired and in-progress competencies", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Java")).toBeInTheDocument();
		expect(screen.getByText("Spring")).toBeInTheDocument();
	});

	it("renders acquired section header", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Opanowane kompetencje")).toBeInTheDocument();
	});

	it("renders in progress section", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getAllByText(/W trakcie nauki/).length).toBeGreaterThan(0);
	});

	it("does not render a list section for missing competencies (only stat card count)", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.queryByText("Brakujace kompetencje")).not.toBeInTheDocument();
	});

	it("renders gap count from data.gapCount in the stat card", () => {
		const data = { ...mockData, gapCount: 14 };
		render(<PassportPublic data={data} />);
		expect(screen.getByText("14")).toBeInTheDocument();
	});

	it("renders stat cards with correct counts", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Opanowane")).toBeInTheDocument();
		expect(screen.getByText("Brakuje")).toBeInTheDocument();
	});

	it("renders CTA title", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Stworz swoj Paszport Kompetencji")).toBeInTheDocument();
	});

	it("renders CTA description", () => {
		render(<PassportPublic data={mockData} />);
		expect(
			screen.getByText(
				"Odkryj swoje luki kompetencyjne i zamknij je projektami na realnych danych. Za darmo.",
			),
		).toBeInTheDocument();
	});

	it("renders CTA link to home page", () => {
		render(<PassportPublic data={mockData} />);
		const ctaLink = screen.getByText("Zacznij teraz").closest("a");
		expect(ctaLink).toHaveAttribute("href", "/");
	});

	it("renders bottom bar with powered by text", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText(/Powered by/)).toBeInTheDocument();
		expect(screen.getByText(/Platforma mapowania kompetencji/)).toBeInTheDocument();
	});

	it("renders bottom bar link to home", () => {
		render(<PassportPublic data={mockData} />);
		const bottomLinks = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/");
		expect(bottomLinks.length).toBeGreaterThan(0);
	});

	it("renders formatted date in footer", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText(/Wygenerowano:/)).toBeInTheDocument();
	});

	it("does not render acquired section when none acquired", () => {
		const data = {
			...mockData,
			competencies: [{ name: "Docker", status: "missing" as const, marketPercentage: 65 }],
		};
		render(<PassportPublic data={data} />);
		expect(screen.queryByText("Opanowane kompetencje")).not.toBeInTheDocument();
	});

	it("handles empty competencies gracefully", () => {
		const data = { ...mockData, competencies: [], gapCount: 0, marketCoveragePercent: 0 };
		const { container } = render(<PassportPublic data={data} />);
		const coverageValue = container.querySelector(".pp-coverage-value");
		expect(coverageValue).toHaveTextContent("0%");
	});

	it("renders coverage sublabel with career goal", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText(/kluczowych kompetencji dla Backend Developer/)).toBeInTheDocument();
	});

	it("renders progress markers", () => {
		const { container } = render(<PassportPublic data={mockData} />);
		const markers = container.querySelector(".pp-progress-markers");
		expect(markers).toBeInTheDocument();
		expect(markers?.textContent).toContain("0%");
		expect(markers?.textContent).toContain("25%");
		expect(markers?.textContent).toContain("50%");
		expect(markers?.textContent).toContain("75%");
		expect(markers?.textContent).toContain("100%");
	});
});
