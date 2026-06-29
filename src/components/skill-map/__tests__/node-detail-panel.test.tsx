// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NodeDetailPanel } from "../node-detail-panel";

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

const mockClose = vi.fn();

function renderPanel(
	status: "acquired" | "in_progress" | "missing",
	marketPercentage = 75,
	category = "Frontend",
) {
	return render(
		<NodeDetailPanel
			node={{
				data: {
					label: "React",
					status,
					marketPercentage,
					category,
				},
			}}
			onClose={mockClose}
		/>,
	);
}

describe("NodeDetailPanel", () => {
	it("renders null when node is null", () => {
		const { container } = render(<NodeDetailPanel node={null} onClose={mockClose} />);
		expect(container.innerHTML).toBe("");
	});

	it("renders competency name", () => {
		renderPanel("acquired");
		expect(screen.getByText("React")).toBeDefined();
	});

	it("shows status badge for acquired", () => {
		renderPanel("acquired");
		expect(screen.getByText("Masz")).toBeDefined();
	});

	it("shows status badge for missing", () => {
		renderPanel("missing");
		expect(screen.getByText("Brakuje")).toBeDefined();
	});

	it("shows market percentage", () => {
		renderPanel("missing", 80);
		expect(screen.getByText("80%")).toBeDefined();
		expect(screen.getByText("ofert pracy wymaga tej kompetencji")).toBeDefined();
	});

	it("shows category", () => {
		renderPanel("acquired", 75, "Backend");
		expect(screen.getByText("Backend")).toBeDefined();
	});

	it("pokazuje komentarz grupy (nazwa + unionShare + opis + kind) gdy węzeł niesie grupę", () => {
		render(
			<NodeDetailPanel
				node={{
					data: {
						label: "SIEM",
						status: "missing",
						marketPercentage: 12,
						category: "Cyber",
						groupName: "Wykrywanie i reagowanie",
						groupDescription: "Po co: rozpoznajesz atak i reagujesz, zanim narobi szkód.",
						groupUnionShare: 38,
						kind: "concept",
					},
				}}
				onClose={mockClose}
			/>,
		);
		expect(screen.getByText("Wykrywanie i reagowanie")).toBeDefined();
		expect(screen.getByText("38% ofert grupy")).toBeDefined();
		expect(
			screen.getByText("Po co: rozpoznajesz atak i reagujesz, zanim narobi szkód."),
		).toBeDefined();
		expect(screen.getByText("koncepcja")).toBeDefined();
		// Grupa zastępuje dawne „Kategoria" — category („Cyber") nie jest renderowane.
		expect(screen.queryByText("Cyber")).toBeNull();
	});

	it("shows 'Zamknij tę lukę' button for missing status", () => {
		renderPanel("missing");
		expect(screen.getByText("Zamknij tę lukę")).toBeDefined();
	});

	it("shows 'Kontynuuj naukę' button for in_progress status", () => {
		renderPanel("in_progress");
		expect(screen.getByText("Kontynuuj naukę")).toBeDefined();
	});

	it("shows 'Kompetencja opanowana' for acquired status", () => {
		renderPanel("acquired");
		expect(screen.getByText("Kompetencja opanowana")).toBeDefined();
	});

	it("links to projects for missing status", () => {
		renderPanel("missing");
		const link = screen.getByText("Zamknij tę lukę").closest("a");
		expect(link?.getAttribute("href")).toBe("/projects");
	});

	it("calls onClose when close button is clicked", async () => {
		renderPanel("acquired");
		const closeButton = screen.getByRole("button");
		await userEvent.click(closeButton);
		expect(mockClose).toHaveBeenCalled();
	});
});
