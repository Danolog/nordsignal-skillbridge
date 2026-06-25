// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
	useRouter: () => ({ push: vi.fn() }),
}));

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

vi.mock("@/lib/auth/client", () => ({
	authClient: { signOut: vi.fn() },
}));

const user = {
	id: "1",
	name: "Anna Kowalska",
	email: "anna@merito.pl",
	image: null,
};

describe("Sidebar", () => {
	it("renders logo text", () => {
		render(<Sidebar user={user} />);
		const logos = screen.getAllByText("SkillBridge");
		expect(logos.length).toBeGreaterThan(0);
	});

	it("renders all 5 navigation items", () => {
		render(<Sidebar user={user} />);
		expect(screen.getByText("Pulpit")).toBeInTheDocument();
		expect(screen.getByText("Mapa kompetencji")).toBeInTheDocument();
		expect(screen.getByText("Analiza luk")).toBeInTheDocument();
		expect(screen.getByText("Projekty")).toBeInTheDocument();
		expect(screen.getByText("Paszport")).toBeInTheDocument();
	});

	it("highlights active nav item based on pathname", () => {
		render(<Sidebar user={user} />);
		const dashboardLink = screen.getByText("Pulpit").closest("a");
		expect(dashboardLink?.className).toContain("active");

		const skillMapLink = screen.getByText("Mapa kompetencji").closest("a");
		expect(skillMapLink?.className).not.toContain("active");
	});

	it("renders user name and email", () => {
		render(<Sidebar user={user} />);
		expect(screen.getByText("Anna Kowalska")).toBeInTheDocument();
		expect(screen.getByText("anna@merito.pl")).toBeInTheDocument();
	});

	it("renders user initials in avatar", () => {
		render(<Sidebar user={user} />);
		expect(screen.getByText("AK")).toBeInTheDocument();
	});

	it("renders logout button", () => {
		render(<Sidebar user={user} />);
		expect(screen.getByText("Wyloguj się")).toBeInTheDocument();
	});

	it("renders nav links with correct hrefs", () => {
		render(<Sidebar user={user} />);
		const links = screen.getAllByRole("link");
		const hrefs = links.map((l) => l.getAttribute("href"));
		expect(hrefs).toContain("/dashboard");
		expect(hrefs).toContain("/skill-map");
		expect(hrefs).toContain("/gap-analysis");
		expect(hrefs).toContain("/projects");
		expect(hrefs).toContain("/passport");
	});
});
