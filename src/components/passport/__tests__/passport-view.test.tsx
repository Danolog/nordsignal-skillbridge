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

vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
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
	it("renders document title", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Paszport Kompetencji")).toBeInTheDocument();
	});

	it("renders student name (holder + signature block)", () => {
		render(<PassportView data={mockData} />);
		// Nazwisko pojawia się w danych posiadacza i w bloku podpisu.
		expect(screen.getAllByText("Jan Kowalski").length).toBe(2);
	});

	it("renders student university", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("WSB Merito Warszawa")).toBeInTheDocument();
	});

	it("renders student field of study", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Informatyka")).toBeInTheDocument();
	});

	it("renders holder meta line with semester", () => {
		render(<PassportView data={mockData} />);
		expect(
			screen.getByText(
				(_content, element) =>
					element?.textContent === "WSB Merito Warszawa · Informatyka · semestr 3",
			),
		).toBeInTheDocument();
	});

	it("renders career goal in the holder pill", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Cel zawodowy:")).toBeInTheDocument();
		// Cel pojawia się i w pigułce, i w zdaniu o pokryciu → getAllByText.
		expect(screen.getAllByText("Frontend Developer").length).toBeGreaterThan(0);
	});

	it("renders document number derived from id", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("SB-2026-PASSPORT")).toBeInTheDocument();
	});

	it("renders market coverage percentage", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("73%")).toBeInTheDocument();
	});

	it("renders coverage progress bar with correct width", () => {
		const { container } = render(<PassportView data={mockData} />);
		const fill = container.querySelector(".pp2-coverage-fill");
		expect(fill).toHaveStyle({ width: "73%" });
	});

	it("renders mastered stat label and market share", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getAllByText("Opanowane").length).toBeGreaterThan(0);
		// mastered 2 / total 4 (2 acquired + 1 in_progress + 1 gap) = 50%.
		expect(screen.getByText("50% wymagań rynku")).toBeInTheDocument();
	});

	it("renders in progress stat label", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getAllByText("W trakcie nauki").length).toBeGreaterThan(0);
	});

	it("renders missing stat label", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Brakuje")).toBeInTheDocument();
	});

	it("renders names of acquired and in-progress competencies", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("JavaScript")).toBeInTheDocument();
		expect(screen.getByText("React")).toBeInTheDocument();
		expect(screen.getByText("TypeScript")).toBeInTheDocument();
	});

	it("renders the Kompetencje heading with sub-groups", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Kompetencje")).toBeInTheDocument();
		// „Opanowane" jako etykieta statystyki + podtytuł grupy kompetencji.
		expect(screen.getAllByText("Opanowane").length).toBeGreaterThan(1);
	});

	it("does not list missing competencies (only stat card count)", () => {
		render(<PassportView data={mockData} />);
		// Python jest 'missing' → nie pojawia się na liście kompetencji.
		expect(screen.queryByText("Python")).not.toBeInTheDocument();
	});

	it("renders gap count from data.gapCount as missing number", () => {
		const data = { ...mockData, gapCount: 14 };
		render(<PassportView data={data} />);
		expect(screen.getByText("14")).toBeInTheDocument();
	});

	it("renders share button (paszport domyślnie niepubliczny → 'Udostępnij publicznie')", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Udostępnij publicznie")).toBeInTheDocument();
		expect(screen.queryByText("Wyłącz udostępnianie")).not.toBeInTheDocument();
	});

	it("A1: 'Udostępnij publicznie' otwiera ekran zgody i NIE udostępnia od razu", async () => {
		const mockFetch = vi.fn();
		vi.stubGlobal("fetch", mockFetch);

		render(<PassportView data={mockData} />);
		fireEvent.click(screen.getByText("Udostępnij publicznie"));

		expect(screen.getByText("Twój paszport stanie się publiczny")).toBeInTheDocument();
		expect(screen.getByText(/bez logowania i bez Twojej wiedzy/)).toBeInTheDocument();
		expect(screen.getByText(/Uczelnia, kierunek i semestr/)).toBeInTheDocument();
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

	it("§8 #5: wyłączenie czyści lokalny token (rotacja), kolejny share generuje nowy", async () => {
		const { toast } = await import("sonner");
		const mockWriteText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText: mockWriteText } });
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ publicEnabled: false, tokenRotated: true }),
			})
			.mockResolvedValueOnce({ ok: true, json: async () => ({ shareToken: "tok-NEW" }) });
		vi.stubGlobal("fetch", mockFetch);

		render(<PassportView data={{ ...mockData, publicEnabled: true, shareToken: "tok-OLD" }} />);

		fireEvent.click(screen.getByText("Wyłącz udostępnianie"));
		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(
				"Udostępnianie wyłączone — link unieważniony na stałe",
			);
		});

		fireEvent.click(screen.getByText("Udostępnij publicznie"));
		fireEvent.click(screen.getByText("Rozumiem, udostępnij publicznie"));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenNthCalledWith(
				2,
				"/api/passport/share",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ consentVersion: PASSPORT_SHARE_CONSENT_VERSION }),
				}),
			);
		});
		await waitFor(() => {
			expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("/passport/tok-NEW"));
			expect(mockWriteText).not.toHaveBeenCalledWith(expect.stringContaining("/passport/tok-OLD"));
		});

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

	it("renders issue date label", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText(/Data wystawienia:/)).toBeInTheDocument();
	});

	it("renders SkillBridge branding", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getAllByText(/SkillBridge/).length).toBeGreaterThan(0);
	});

	it("renders Eksportuj PDF button", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText("Eksportuj PDF")).toBeInTheDocument();
	});

	it("does not render the 'Opanowane' competency sub-group when no acquired competencies", () => {
		const data = {
			...mockData,
			competencies: [{ name: "Python", status: "missing" as const, marketPercentage: 40 }],
		};
		render(<PassportView data={data} />);
		// Tylko etykieta statystyki „Opanowane" — bez podtytułu grupy kompetencji.
		expect(screen.getAllByText("Opanowane").length).toBe(1);
	});

	it("handles empty competencies array", () => {
		const data = { ...mockData, competencies: [], gapCount: 0, marketCoveragePercent: 0 };
		const { container } = render(<PassportView data={data} />);
		const coverageValue = container.querySelector(".pp2-coverage-value");
		expect(coverageValue).toHaveTextContent("0%");
	});

	it("renders coverage sentence with career goal", () => {
		render(<PassportView data={mockData} />);
		expect(screen.getByText(/Pokrycie wymagań rynkowych dla roli/)).toBeInTheDocument();
	});

	it("renders progress markers", () => {
		const { container } = render(<PassportView data={mockData} />);
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
			<PassportView
				data={mockData}
				mentor={{ name: "dr Anna Mentor", role: "Opiekun", org: "WSB" }}
			/>,
		);
		expect(screen.getByText("dr Anna Mentor")).toBeInTheDocument();
		expect(screen.getByText("Opiekun, WSB")).toBeInTheDocument();
	});

	it("renders empty mentor signature line when no mentor", () => {
		render(<PassportView data={mockData} />);
		expect(
			screen.getByText("(opcjonalnie — do uzupełnienia, jeśli masz opiekuna)"),
		).toBeInTheDocument();
	});
});
