// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PASSPORT_SHARE_CONSENT_VERSION } from "@/lib/consent";
import { PassportView } from "../passport-view";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../pdf-export", () => ({
	PdfExportButton: (_props: { passportRef: unknown }) => (
		<button type="button">Eksportuj PDF</button>
	),
}));

const mockData = {
	id: "passport-uuid-123",
	student: {
		name: "Jan Kowalski",
		university: "WSB Merito Warszawa",
		fieldOfStudy: "Informatyka",
		semester: 3,
		careerGoal: "Frontend Developer",
	},
	marketCoveragePercent: 73,
	competencies: [
		{ name: "JavaScript", status: "acquired" as const, marketPercentage: 85 },
		{ name: "React", status: "acquired" as const, marketPercentage: 90 },
		{ name: "TypeScript", status: "in_progress" as const, marketPercentage: 75 },
		{ name: "Python", status: "missing" as const, marketPercentage: 40 },
	],
	gapCount: 1,
	generatedAt: "2026-03-08T12:00:00.000Z",
};

describe("PassportView", () => {
	it("renders page title", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Paszport Kompetencji")).toBeInTheDocument();
	});

	it("renders student name", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
	});

	it("renders student university", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("WSB Merito Warszawa")).toBeInTheDocument();
	});

	it("renders student field of study", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Informatyka")).toBeInTheDocument();
	});

	it("renders student semester", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Semestr 3")).toBeInTheDocument();
	});

	it("renders career goal", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText(/Cel: Frontend Developer/)).toBeInTheDocument();
	});

	it("renders avatar with initials", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("JK")).toBeInTheDocument();
	});

	it("renders market coverage percentage", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("73%")).toBeInTheDocument();
	});

	it("renders coverage progress bar with correct width", () => {
		const { container } = render(<PassportView data={mockData} />);
		const fill = container.querySelector(".pp-progress-fill");
		expect(fill).toHaveStyle({ width: "73%" });
	});

	it("renders stat card with acquired count", () => {
		render(<PassportView data={mockData} />);
		const statCards = screen.getAllByText("Opanowane");
		expect(statCards.length).toBeGreaterThan(0);
	});

	it("renders acquired competency count as 2", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("2 kompetencji")).toBeInTheDocument();
	});

	it("renders in progress stat label", () => {
		render(<PassportView data={mockData} />);
		const labels = screen.getAllByText("W trakcie nauki");
		expect(labels.length).toBeGreaterThan(0);
	});

	it("renders missing count", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Brakuje")).toBeInTheDocument();
	});

	it("renders names of acquired and in-progress competencies", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("JavaScript")).toBeInTheDocument();
		expect(screen.getByText("React")).toBeInTheDocument();
		expect(screen.getByText("TypeScript")).toBeInTheDocument();
	});

	it("renders section headers for acquired and in-progress groups", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Opanowane kompetencje")).toBeInTheDocument();
		expect(screen.getAllByText(/W trakcie nauki/).length).toBeGreaterThan(0);
	});

	it("does not render a list section for missing competencies (only stat card count)", () => {
		render(<PassportView data={mockData} />);
		expect(screen.queryByText("Brakujace kompetencje")).not.toBeInTheDocument();
	});

	it("renders gap count from data.gapCount in the stat card", () => {
		const data = { ...mockData, gapCount: 14 };
		render(<PassportView data={data} />);
		expect(screen.getByText("14")).toBeInTheDocument();
	});

	it("renders share button (paszport domyślnie niepubliczny → 'Udostępnij publicznie')", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Udostępnij publicznie")).toBeInTheDocument();
		// B1: dopóki niepubliczny, nie ma 'Kopiuj link' ani 'Wyłącz udostępnianie'
		expect(screen.queryByText("Wyłącz udostępnianie")).not.toBeInTheDocument();
	});

	it("A1: 'Udostępnij publicznie' otwiera ekran zgody i NIE udostępnia od razu", async () => {
		const mockFetch = vi.fn();
		vi.stubGlobal("fetch", mockFetch);

		render(<PassportView data={mockData} />);
		fireEvent.click(screen.getByText("Udostępnij publicznie"));

		// Ekran zgody wymienia wprost, co staje się publiczne i że link działa bez logowania.
		expect(screen.getByText("Twój paszport stanie się publiczny")).toBeInTheDocument();
		expect(screen.getByText(/bez logowania i bez Twojej wiedzy/)).toBeInTheDocument();
		expect(screen.getByText(/Uczelnia, kierunek i semestr/)).toBeInTheDocument();
		// Bez akceptacji nie ma żadnego zapisu na serwerze.
		expect(mockFetch).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it("A1: pokazuje zweryfikowane projekty na ekranie zgody tylko gdy istnieją", () => {
		render(<PassportView data={mockData} />);
		fireEvent.click(screen.getByText("Udostępnij publicznie"));
		expect(screen.queryByText(/Zweryfikowane projekty: ocena/)).not.toBeInTheDocument();
	});

	it("B1: akceptacja zgody wywołuje opt-in i kopiuje link po tokenie", async () => {
		const { toast } = await import("sonner");
		const mockWriteText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText: mockWriteText } });
		const mockFetch = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({ shareToken: "tok-xyz" }) });
		vi.stubGlobal("fetch", mockFetch);

		render(<PassportView data={mockData} />);
		fireEvent.click(screen.getByText("Udostępnij publicznie"));
		fireEvent.click(screen.getByText("Rozumiem, udostępnij publicznie"));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/passport/share",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ consentVersion: PASSPORT_SHARE_CONSENT_VERSION }),
				}),
			);
		});
		await waitFor(() => {
			expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("/passport/tok-xyz"));
		});
		expect(toast.success).toHaveBeenCalledWith("Paszport jest teraz publiczny — link skopiowany");
		vi.unstubAllGlobals();
	});

	it("B1: gdy już publiczny → 'Kopiuj link' kopiuje po tokenie bez ponownego opt-inu", async () => {
		const mockWriteText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText: mockWriteText } });
		const mockFetch = vi.fn();
		vi.stubGlobal("fetch", mockFetch);

		render(<PassportView data={{ ...mockData, publicEnabled: true, shareToken: "share-abc" }} />);
		fireEvent.click(screen.getByText("Kopiuj link"));

		await waitFor(() => {
			expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("/passport/share-abc"));
		});
		expect(mockFetch).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it("B1: błąd opt-inu pokazuje toast błędu", async () => {
		const { toast } = await import("sonner");
		Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

		render(<PassportView data={mockData} />);
		fireEvent.click(screen.getByText("Udostępnij publicznie"));
		fireEvent.click(screen.getByText("Rozumiem, udostępnij publicznie"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Nie udało się udostępnić paszportu");
		});
		vi.unstubAllGlobals();
	});

	it("renders formatted date in footer", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText(/Wygenerowano:/)).toBeInTheDocument();
	});

	it("renders SkillBridge in footer", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("SkillBridge")).toBeInTheDocument();
	});

	it("renders Eksportuj PDF button", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Eksportuj PDF")).toBeInTheDocument();
	});

	it("does not render acquired section when no acquired competencies", () => {
		const data = {
			...mockData,
			competencies: [{ name: "Python", status: "missing" as const, marketPercentage: 40 }],
		};
		render(<PassportView data={data} />);
		expect(screen.queryByText("Opanowane kompetencje")).not.toBeInTheDocument();
	});

	it("handles empty competencies array", () => {
		const data = { ...mockData, competencies: [], gapCount: 0, marketCoveragePercent: 0 };
		const { container } = render(<PassportView data={data} />);
		const coverageValue = container.querySelector(".pp-coverage-value");
		expect(coverageValue).toHaveTextContent("0%");
	});

	it("renders coverage sublabel with career goal", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText(/kluczowych kompetencji dla Frontend Developer/)).toBeInTheDocument();
	});

	it("renders progress markers", () => {
		const { container } = render(<PassportView data={mockData} />);
		const markers = container.querySelector(".pp-progress-markers");
		expect(markers).toBeInTheDocument();
		expect(markers?.textContent).toContain("0%");
		expect(markers?.textContent).toContain("25%");
		expect(markers?.textContent).toContain("50%");
		expect(markers?.textContent).toContain("75%");
		expect(markers?.textContent).toContain("100%");
	});
});
