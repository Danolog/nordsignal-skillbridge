// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHub } from "../dashboard-hub";

// AG.6: hub renderuje MarketGapNotifications (useRouter) — router poza Next musi być zmockowany.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

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
	// AG.6: flaga off → komponent powiadomień nie renderuje się (osobne testy
	// stanów w market-gap-notifications.test.tsx).
	marketNotifications: {
		enabled: false,
		decided: false,
		consent: false,
		notifications: [],
	},
	// 1.18: flaga off → karta rytmu nie istnieje (osobne testy w rhythm.test.tsx).
	rhythmCard: null,
	// 1E.4 R6: flaga off → kafelek powtórek nie istnieje (osobne testy niżej).
	reviewDue: null,
	// 1E.6a: flaga off → kafelek ścieżki nauki nie istnieje.
	curriculumEnabled: false,
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

	// 1E.6a: „deploy ≠ release" — kafelek ścieżki nauki istnieje TYLKO przy fladze on.
	it("nie pokazuje kafelka ścieżki nauki przy fladze off", () => {
		render(<DashboardHub {...defaultProps} />);
		const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
		expect(hrefs).not.toContain("/curriculum");
	});

	it("pokazuje kafelek ścieżki nauki przy fladze on", () => {
		render(<DashboardHub {...defaultProps} curriculumEnabled />);
		const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
		expect(hrefs).toContain("/curriculum");
		expect(screen.getByText("Ucz się po kolei, bez skrótów")).toBeInTheDocument();
	});

	// 1E.4 R6 — kafelek powtórek: „deploy ≠ release" (null = flaga off → brak sekcji).
	it("nie pokazuje kafelka powtórek przy fladze off (reviewDue=null)", () => {
		render(<DashboardHub {...defaultProps} />);
		expect(screen.queryByText(/Powtórki na dziś/)).not.toBeInTheDocument();
		const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
		expect(hrefs).not.toContain("/powtorki");
	});

	it("N>0: pokazuje licznik i CTA do /powtorki", () => {
		render(<DashboardHub {...defaultProps} reviewDue={{ count: 7, capped: false }} />);
		expect(screen.getByText("Powtórki na dziś: 7")).toBeInTheDocument();
		const cta = screen.getByRole("link", { name: "Zacznij powtórki" });
		expect(cta).toHaveAttribute("href", "/powtorki");
	});

	it("N=0: komunikat Nic do powtórzenia bez CTA", () => {
		render(<DashboardHub {...defaultProps} reviewDue={{ count: 0, capped: false }} />);
		expect(screen.getByText("Nic do powtórzenia. Wróć jutro.")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Zacznij powtórki" })).not.toBeInTheDocument();
	});

	it("capped: licznik pokazuje 200+ zamiast dokładnej liczby", () => {
		render(<DashboardHub {...defaultProps} reviewDue={{ count: 200, capped: true }} />);
		expect(screen.getByText("Powtórki na dziś: 200+")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Zacznij powtórki" })).toBeInTheDocument();
	});
});
