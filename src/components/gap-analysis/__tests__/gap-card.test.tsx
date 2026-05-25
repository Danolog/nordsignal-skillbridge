// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GapCard } from "../gap-card";

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

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

const defaultProps = {
	id: "gap-1",
	competencyName: "Python",
	priority: "critical" as const,
	marketPercentage: 78,
	estimatedHours: 10,
	whyImportant: null,
};

describe("GapCard", () => {
	it("renders competency name", () => {
		render(<GapCard {...defaultProps} />);
		expect(screen.getByText("Python")).toBeInTheDocument();
	});

	it("renders priority badge", () => {
		render(<GapCard {...defaultProps} />);
		expect(screen.getByText("Krytyczna")).toBeInTheDocument();
	});

	it("renders important priority badge", () => {
		render(<GapCard {...defaultProps} priority="important" />);
		expect(screen.getByText("Ważna")).toBeInTheDocument();
	});

	it("renders nice_to_have priority badge", () => {
		render(<GapCard {...defaultProps} priority="nice_to_have" />);
		expect(screen.getByText("Warto znać")).toBeInTheDocument();
	});

	it("renders market percentage in ring", () => {
		render(<GapCard {...defaultProps} />);
		expect(screen.getByText("78%")).toBeInTheDocument();
	});

	it("renders estimated hours", () => {
		render(<GapCard {...defaultProps} />);
		expect(screen.getByText("10h nauki")).toBeInTheDocument();
	});

	it("renders market demand text", () => {
		render(<GapCard {...defaultProps} />);
		expect(screen.getByText("78% ofert pracy")).toBeInTheDocument();
	});

	it("renders 'Znajdź projekty' link with correct href", () => {
		render(<GapCard {...defaultProps} />);
		const link = screen.getByText("Znajdź projekty").closest("a");
		expect(link).toHaveAttribute("href", "/projects?gapId=gap-1");
	});

	it("renders 'Dlaczego to ważne?' button", () => {
		render(<GapCard {...defaultProps} />);
		expect(screen.getByText("Dlaczego to ważne?")).toBeInTheDocument();
	});

	it("displays pre-cached whyImportant text on expand", () => {
		render(<GapCard {...defaultProps} whyImportant="Python jest ważny." />);
		const whyBtn = screen.getByText("Dlaczego to ważne?");
		fireEvent.click(whyBtn);
		expect(screen.getByText("Python jest ważny.")).toBeInTheDocument();
	});

	it("fetches whyImportant on first expand when not cached", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ whyImportant: "Wygenerowany tekst AI." }),
		});
		vi.stubGlobal("fetch", mockFetch);

		render(<GapCard {...defaultProps} />);
		const whyBtn = screen.getByText("Dlaczego to ważne?");
		fireEvent.click(whyBtn);

		expect(mockFetch).toHaveBeenCalledWith("/api/gaps/gap-1/why", { method: "POST" });

		await waitFor(() => {
			expect(screen.getByText("Wygenerowany tekst AI.")).toBeInTheDocument();
		});

		vi.unstubAllGlobals();
	});

	it("shows loading state while fetching", async () => {
		let resolvePromise: ((value: unknown) => void) | undefined;
		const fetchPromise = new Promise((resolve) => {
			resolvePromise = resolve;
		});
		const mockFetch = vi.fn().mockReturnValue(fetchPromise);
		vi.stubGlobal("fetch", mockFetch);

		render(<GapCard {...defaultProps} />);
		fireEvent.click(screen.getByText("Dlaczego to ważne?"));

		expect(screen.getByText("Generuję wyjaśnienie...")).toBeInTheDocument();

		resolvePromise?.({
			ok: true,
			json: () => Promise.resolve({ whyImportant: "Tekst." }),
		});

		await waitFor(() => {
			expect(screen.queryByText("Generuję wyjaśnienie...")).not.toBeInTheDocument();
		});

		vi.unstubAllGlobals();
	});

	it("shows error toast when fetch fails", async () => {
		const { toast } = await import("sonner");
		const mockFetch = vi.fn().mockResolvedValue({ ok: false });
		vi.stubGlobal("fetch", mockFetch);

		render(<GapCard {...defaultProps} />);
		fireEvent.click(screen.getByText("Dlaczego to ważne?"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Nie udało się wygenerować wyjaśnienia");
		});

		vi.unstubAllGlobals();
	});
});
