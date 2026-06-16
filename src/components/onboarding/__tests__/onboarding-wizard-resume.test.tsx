// @vitest-environment jsdom
/**
 * Fala B (front) — wznawianie onboardingu: hydratacja initialStep/initialData,
 * klikalny pasek kroków (skok ≤ maxReached), dialog kaskady „ostrzeż i przelicz",
 * autosave profilu (PATCH /api/onboarding/progress).
 *
 * Warstwa klienta realnej ścieżki (split-frontend-backend): tu front (realny
 * OnboardingWizard) z przechwyconym fetch; styk z bazą pokrywa e2e
 * (tests/e2e-pw/41-onboarding-resume.spec.ts) + integracyjne fali A.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type OnboardingInitialData, OnboardingWizard } from "../onboarding-wizard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

// Pomocnik (Krok 0) ma własny przepływ sieciowy — tu stub.
vi.mock("@/components/career-helper/career-helper-flow", () => ({
	CareerHelperFlow: ({ onCareerGoalChosen }: { onCareerGoalChosen?: (l: string) => void }) => (
		<button type="button" onClick={() => onCareerGoalChosen?.("Data Analyst")}>
			Wybierz cel (stub)
		</button>
	),
}));

// StepSelfAssessment (krok 4) woła GET /api/self-assessment — stub, by render kroku 4
// nie wymagał realnej odpowiedzi i nie zaśmiecał asercji fetch profilu.
vi.mock("../step-self-assessment", () => ({
	StepSelfAssessment: ({ onAdvance }: { onAdvance: () => void }) => (
		<button type="button" onClick={onAdvance}>
			Samoocena (stub) → dalej
		</button>
	),
}));

beforeAll(() => {
	if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
	Element.prototype.scrollIntoView = vi.fn();
	if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = vi.fn();
	if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
	vi.clearAllMocks();
});

const USER = { id: "u1", name: "T", email: "t@t.pl" };

const RESUMED_DATA: OnboardingInitialData = {
	profile: {
		university: "WSB Merito Gdańsk",
		fieldOfStudy: "Informatyka",
		semester: "4",
		careerGoal: "Data Analyst",
	},
	syllabusText: "x".repeat(150),
	competencies: ["Python", "SQL", "Pandas", "Statystyka", "Git"],
};

describe("OnboardingWizard — hydratacja initialStep/initialData", () => {
	it("wznawia render od kroku 2 (Sylabus) z wczytanym sylabusem, nie od Kroku 0", () => {
		render(<OnboardingWizard user={USER} initialStep={2} initialData={RESUMED_DATA} />);
		// Jesteśmy na kroku 2 — nagłówek Sylabusa, NIE Pomocnik (Krok 0).
		expect(screen.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Wybierz cel \(stub\)/i })).not.toBeInTheDocument();
		// Sylabus z initialData wczytany do textarea.
		expect(screen.getByRole("textbox")).toHaveValue(RESUMED_DATA.syllabusText);
	});

	it("wznawia od kroku 3 (Kompetencje) z wczytanymi kompetencjami z bazy", () => {
		render(<OnboardingWizard user={USER} initialStep={3} initialData={RESUMED_DATA} />);
		expect(screen.getByRole("heading", { name: /Twoje kompetencje/i })).toBeInTheDocument();
		// Kompetencje z initialData widoczne (wartości inputów).
		expect(screen.getByDisplayValue("Python")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Statystyka")).toBeInTheDocument();
	});
});

describe("OnboardingWizard — klikalny pasek kroków", () => {
	it("skok do osiągniętego kroku (≤ maxReached) działa", async () => {
		const user = userEvent.setup();
		render(<OnboardingWizard user={USER} initialStep={3} initialData={RESUMED_DATA} />);
		// Start na kroku 3. Klik kropki „Profil" (krok 1, osiągnięty) → render Profilu.
		await user.click(screen.getByRole("button", { name: /^Krok 2: Profil$/i }));
		expect(screen.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeInTheDocument();
	});

	it("krok > maxReached jest zablokowany (disabled + aria-label niedostepny)", () => {
		render(<OnboardingWizard user={USER} initialStep={1} initialData={RESUMED_DATA} />);
		// maxReached=1 → krok 3 (Kompetencje, num=3) jest nieosiągnięty.
		const lockedDot = screen.getByRole("button", {
			name: /Krok 4: Kompetencje \(jeszcze niedostępny\)/i,
		});
		expect(lockedDot).toBeDisabled();
	});
});

describe("OnboardingWizard — dialog kaskady ostrzez i przelicz", () => {
	it("krok 2 z downstream: Analizuj → dialog; potwierdź → fetch parse", async () => {
		const fetchMock = vi.fn().mockImplementation((url: string) => {
			if (url === "/api/onboarding/progress") {
				return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
			}
			if (url === "/api/syllabus/parse") {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ competencies: ["A", "B", "C", "D", "E"] }),
				});
			}
			return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
		});
		vi.stubGlobal("fetch", fetchMock);

		const user = userEvent.setup();
		// maxReached=4 (downstream istnieje: kompetencje + samoocena), start na kroku 2.
		render(<OnboardingWizard user={USER} initialStep={4} initialData={RESUMED_DATA} />);
		await user.click(screen.getByRole("button", { name: /^Krok 3: Sylabus$/i }));

		await user.click(screen.getByRole("button", { name: /Analizuj sylabus/i }));

		// Dialog kaskady widoczny — parse NIE poszedł jeszcze.
		const dialog = await screen.findByRole("alertdialog");
		expect(within(dialog).getByText(/wyczyści Twoją\s+samoocenę/i)).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalledWith("/api/syllabus/parse", expect.anything());

		// Potwierdź → parse leci.
		await user.click(within(dialog).getByRole("button", { name: /Tak, przelicz/i }));
		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith("/api/syllabus/parse", expect.anything());
		});
	});

	it("krok 2 z downstream: anuluj dialog → BRAK fetch parse (no-op)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const user = userEvent.setup();
		render(<OnboardingWizard user={USER} initialStep={4} initialData={RESUMED_DATA} />);
		await user.click(screen.getByRole("button", { name: /^Krok 3: Sylabus$/i }));
		await user.click(screen.getByRole("button", { name: /Analizuj sylabus/i }));

		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: /Anuluj/i }));

		// Parse NIGDY nie został wywołany.
		expect(fetchMock).not.toHaveBeenCalledWith("/api/syllabus/parse", expect.anything());
	});
});

describe("OnboardingWizard — autosave profilu (PATCH /progress)", () => {
	it("zmiana profilu + Dalej -> PATCH /progress {step:1, ...profil} z poprawnym cialem", async () => {
		let progressBody: Record<string, unknown> | null = null;
		const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
			if (url === "/api/onboarding/progress" && opts?.method === "PATCH") {
				progressBody = JSON.parse(opts.body as string);
				return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
			}
			return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
		});
		vi.stubGlobal("fetch", fetchMock);

		const user = userEvent.setup();
		// Start na kroku 1 (Profil) z hydratowanymi danymi — kompletny profil, „Dalej" aktywny.
		render(<OnboardingWizard user={USER} initialStep={1} initialData={RESUMED_DATA} />);

		await user.click(screen.getByRole("button", { name: /Dalej/i }));

		await vi.waitFor(() => {
			expect(progressBody).not.toBeNull();
		});
		// DOWÓD: ciało autosave to step 1 + profil + semestr jako liczba (nie string).
		expect(progressBody).toEqual({
			step: 1,
			university: "WSB Merito Gdańsk",
			fieldOfStudy: "Informatyka",
			semester: 4,
		});
		// Po zapisie jesteśmy na kroku 2 (Sylabus).
		expect(screen.getByRole("heading", { name: /Wgraj swój sylabus/i })).toBeInTheDocument();
	});
});
