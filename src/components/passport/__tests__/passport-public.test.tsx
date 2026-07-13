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
	it("renders student name (holder + signature block)", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getAllByText("Anna Nowak").length).toBe(2);
	});

	it("renders university", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Politechnika Warszawska")).toBeInTheDocument();
	});

	it("renders field of study", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Informatyka")).toBeInTheDocument();
	});

	it("renders holder meta line with semester", () => {
		render(<PassportPublic data={mockData} />);
		expect(
			screen.getByText(
				(_content, element) =>
					element?.textContent === "Politechnika Warszawska · Informatyka · semestr 5",
			),
		).toBeInTheDocument();
	});

	it("renders career goal", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getAllByText("Backend Developer").length).toBeGreaterThan(0);
	});

	it("renders verified badge (public variant only)", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Zweryfikowany")).toBeInTheDocument();
	});

	it("renders SkillBridge branding", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getAllByText(/SkillBridge/).length).toBeGreaterThan(0);
	});

	it("renders market coverage percentage", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("60%")).toBeInTheDocument();
	});

	it("renders progress bar with correct width", () => {
		const { container } = render(<PassportPublic data={mockData} />);
		const fill = container.querySelector(".pp2-coverage-fill");
		expect(fill).toHaveStyle({ width: "60%" });
	});

	it("renders names of acquired and in-progress competencies", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Java")).toBeInTheDocument();
		expect(screen.getByText("Spring")).toBeInTheDocument();
	});

	it("renders the Kompetencje heading", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Kompetencje")).toBeInTheDocument();
		expect(screen.getAllByText("Opanowane").length).toBeGreaterThan(0);
	});

	it("renders in progress group", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getAllByText(/W trakcie nauki/).length).toBeGreaterThan(0);
	});

	// Blok C (C4): przy fladze passportVerifiedOnly dane zawierają wyłącznie
	// kredencjały (status 'acquired') — sekcja LISTY „W trakcie nauki" znika
	// sama (warunek learning.length > 0); zostaje wyłącznie kafelek statystyk.
	it("C4: dane bez in_progress (kredencjały) → sekcja listy „W trakcie nauki” nie renderuje się", () => {
		const verifiedOnlyData = {
			...mockData,
			competencies: mockData.competencies.filter((c) => c.status === "acquired"),
		};
		const inProgressRender = render(<PassportPublic data={mockData} />);
		const withLearning = screen.getAllByText(/W trakcie nauki/).length;
		inProgressRender.unmount();
		render(<PassportPublic data={verifiedOnlyData} />);
		const withoutLearning = screen.getAllByText(/W trakcie nauki/).length;
		expect(withoutLearning).toBeLessThan(withLearning);
		expect(withoutLearning).toBe(1); // sam kafelek statystyk (licznik 0)
	});

	it("does not list missing competencies", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.queryByText("Docker")).not.toBeInTheDocument();
	});

	it("renders gap count from data.gapCount as missing number", () => {
		const data = { ...mockData, gapCount: 14 };
		render(<PassportPublic data={data} />);
		expect(screen.getByText("14")).toBeInTheDocument();
	});

	it("renders stat labels", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getAllByText("Opanowane").length).toBeGreaterThan(0);
		expect(screen.getByText("Brakuje")).toBeInTheDocument();
	});

	it("renders CTA title", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText("Stwórz swój Paszport Kompetencji")).toBeInTheDocument();
	});

	it("renders CTA description", () => {
		render(<PassportPublic data={mockData} />);
		expect(
			screen.getByText(/Zbuduj taki sam dokument dla siebie i pokaż pracodawcy, co potrafisz/),
		).toBeInTheDocument();
	});

	it("renders CTA link to home page", () => {
		render(<PassportPublic data={mockData} />);
		const ctaLink = screen.getByText("Załóż konto SkillBridge").closest("a");
		expect(ctaLink).toHaveAttribute("href", "/");
	});

	it("renders issue date label", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText(/Data wystawienia:/)).toBeInTheDocument();
	});

	it("does not render the 'Opanowane' competency sub-group when none acquired", () => {
		const data = {
			...mockData,
			competencies: [{ name: "Docker", status: "missing" as const, marketPercentage: 65 }],
		};
		render(<PassportPublic data={data} />);
		expect(screen.getAllByText("Opanowane").length).toBe(1);
	});

	it("handles empty competencies gracefully", () => {
		const data = { ...mockData, competencies: [], gapCount: 0, marketCoveragePercent: 0 };
		const { container } = render(<PassportPublic data={data} />);
		const coverageValue = container.querySelector(".pp2-coverage-value");
		expect(coverageValue).toHaveTextContent("0%");
	});

	it("renders coverage sentence with career goal", () => {
		render(<PassportPublic data={mockData} />);
		expect(screen.getByText(/Pokrycie wymagań rynkowych dla roli/)).toBeInTheDocument();
	});

	it("renders progress markers", () => {
		const { container } = render(<PassportPublic data={mockData} />);
		const markers = container.querySelector(".pp2-progress-markers");
		expect(markers).toBeInTheDocument();
		expect(markers?.textContent).toContain("0%");
		expect(markers?.textContent).toContain("25%");
		expect(markers?.textContent).toContain("50%");
		expect(markers?.textContent).toContain("75%");
		expect(markers?.textContent).toContain("100%");
	});

	it("renders mentor signature block when mentor is provided", () => {
		render(
			<PassportPublic
				data={mockData}
				mentor={{ name: "prof. Jan Opiekun", role: "Promotor", org: "PW" }}
			/>,
		);
		expect(screen.getByText("prof. Jan Opiekun")).toBeInTheDocument();
		expect(screen.getByText("Promotor, PW")).toBeInTheDocument();
	});
});
