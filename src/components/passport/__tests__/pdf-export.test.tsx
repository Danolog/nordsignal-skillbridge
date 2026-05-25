// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfExportButton } from "../pdf-export";

const mockSave = vi.fn();
const mockAddImage = vi.fn();

vi.mock("html2canvas", () => ({
	default: vi.fn().mockResolvedValue({
		toDataURL: () => "data:image/png;base64,abc",
		width: 800,
		height: 1200,
	}),
}));

vi.mock("jspdf", () => {
	return {
		default: class MockJsPDF {
			internal = { pageSize: { getWidth: () => 210 } };
			addImage = mockAddImage;
			save = mockSave;
		},
	};
});

function createMockRef(): RefObject<HTMLDivElement | null> {
	const div = document.createElement("div");
	const ref = createRef<HTMLDivElement>();
	Object.defineProperty(ref, "current", { value: div, writable: true });
	return ref;
}

describe("PdfExportButton", () => {
	beforeEach(() => {
		mockSave.mockClear();
		mockAddImage.mockClear();
	});

	it("renders button with Eksportuj PDF text", () => {
		const ref = createMockRef();
		render(<PdfExportButton passportRef={ref} />);
		expect(screen.getByText("Eksportuj PDF")).toBeInTheDocument();
	});

	it("renders button as enabled by default", () => {
		const ref = createMockRef();
		render(<PdfExportButton passportRef={ref} />);
		const button = screen.getByRole("button");
		expect(button).not.toBeDisabled();
	});

	it("calls jsPDF save with correct filename", async () => {
		const ref = createMockRef();
		render(<PdfExportButton passportRef={ref} />);

		fireEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(mockSave).toHaveBeenCalledWith("paszport-kompetencji.pdf");
		});
	});

	it("calls addImage with PNG format", async () => {
		const ref = createMockRef();
		render(<PdfExportButton passportRef={ref} />);

		fireEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(mockAddImage).toHaveBeenCalledWith(
				"data:image/png;base64,abc",
				"PNG",
				0,
				0,
				210,
				expect.any(Number),
			);
		});
	});

	it("does nothing when ref.current is null", () => {
		const ref = { current: null } as RefObject<HTMLDivElement | null>;
		render(<PdfExportButton passportRef={ref} />);

		fireEvent.click(screen.getByRole("button"));

		expect(mockSave).not.toHaveBeenCalled();
	});

	it("has correct CSS classes", () => {
		const ref = createMockRef();
		render(<PdfExportButton passportRef={ref} />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("pp-btn");
		expect(button.className).toContain("pp-btn-primary");
	});
});
