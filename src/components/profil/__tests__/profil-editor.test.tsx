// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilEditor, type ProfilEditorInitial } from "../profil-editor";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const baseInitial: ProfilEditorInitial = {
	university: "WSB Merito Gdańsk",
	fieldOfStudy: "Informatyka",
	semester: 4,
	careerGoal: "Frontend Developer",
	syllabusText: "x".repeat(200),
	competencies: [
		{ name: "React", selfAssessment: 3 },
		{ name: "Git", selfAssessment: 2 },
	],
};

// Domyślny mock katalogu rynku (component pobiera go w useEffect po zamontowaniu).
function mockCatalogFetch() {
	global.fetch = vi.fn(async () => ({
		ok: true,
		json: async () => ({
			isRealCareerGoal: true,
			items: [
				{ competencyName: "React", demandPercentage: 40, kind: "tool", inSyllabus: false },
				{ competencyName: "TypeScript", demandPercentage: 55, kind: "tool", inSyllabus: false },
			],
			groups: [],
			profileNote: null,
		}),
	})) as unknown as typeof fetch;
}

beforeEach(() => {
	pushMock.mockReset();
	refreshMock.mockReset();
	mockCatalogFetch();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ProfilEditor — prefill", () => {
	it("prefills profile fields with student data", () => {
		render(<ProfilEditor initial={baseInitial} />);
		expect(screen.getByDisplayValue("Informatyka")).toBeInTheDocument();
		const textarea = screen.getByPlaceholderText(
			/Wklej tutaj treść sylabusa/i,
		) as HTMLTextAreaElement;
		expect(textarea.value).toBe(baseInitial.syllabusText);
	});

	it("treats predefined career goal as standard (no custom input)", () => {
		render(<ProfilEditor initial={baseInitial} />);
		expect(screen.queryByPlaceholderText("Wpisz swój cel kariery...")).not.toBeInTheDocument();
	});

	it("treats unknown career goal as custom and prefills the custom input", () => {
		render(
			<ProfilEditor initial={{ ...baseInitial, careerGoal: "AI Researcher (niestandardowy)" }} />,
		);
		const customInput = screen.getByPlaceholderText(
			"Wpisz swój cel kariery...",
		) as HTMLInputElement;
		expect(customInput.value).toBe("AI Researcher (niestandardowy)");
	});

	it("renders the competencies section (full market panel)", () => {
		render(<ProfilEditor initial={baseInitial} />);
		expect(screen.getByText("Kompetencje")).toBeInTheDocument();
	});
});

describe("ProfilEditor — nawigacja", () => {
	it("cancel button navigates back to /dashboard", () => {
		render(<ProfilEditor initial={baseInitial} />);
		fireEvent.click(screen.getByRole("button", { name: /Anuluj/i }));
		expect(pushMock).toHaveBeenCalledWith("/dashboard");
	});

	it("disables analyze button when syllabus is too short", () => {
		render(<ProfilEditor initial={{ ...baseInitial, syllabusText: "krótki" }} />);
		const analyze = screen.getByRole("button", { name: /Analizuj sylabus/i });
		expect(analyze).toBeDisabled();
	});
});
