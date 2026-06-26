// @vitest-environment jsdom
/**
 * Wznawianie onboardingu po PRZEBUDOWIE Partii 4 — hydratacja initialStep/initialData,
 * klikalny pasek kroków (skok ≤ maxReached), autosave profilu (PATCH /progress).
 *
 * CO SIĘ ZMIENIŁO względem fali B (flip):
 *   - kreator ma 5 kroków (0..4): Cel · Profil · Sylabus · Kompetencje · Wnioski.
 *     Numeracja w pasku = idx+1, więc dawny „Krok 5: Wnioski" znika (jest 5 kroków, nie 6).
 *   - krok 3 (Kompetencje) NIE ma już inputów nazw ani osobnej samooceny — to wybór z
 *     KATALOGU RYNKU (GET market-catalog) z poziomem 2/3/4; wznowienie odtwarza `selections`
 *     (nazwa→poziom) i podświetla właściwy przycisk poziomu.
 *   - usunięty dialog kaskady „ostrzeż i przelicz" (analiza sylabusa = adnotacja, nie generator)
 *     oraz krok samooceny (scalony w krok 3) — testy tych elementów skasowane.
 *
 * Warstwa klienta realnej ścieżki (split-frontend-backend): styk z bazą pokrywa e2e
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

// Katalog rynku zwracany przez GET market-catalog na wejściu w krok 3.
const CATALOG_ITEMS = [
	{ competencyName: "SQL", demandPercentage: 90, category: "Dane" },
	{ competencyName: "Python", demandPercentage: 80, category: "Język" },
	{ competencyName: "Pandas", demandPercentage: 40, category: "Biblioteka" },
	{ competencyName: "Docker", demandPercentage: 20, category: "DevOps" },
];

const RESUMED_DATA: OnboardingInitialData = {
	profile: {
		university: "WSB Merito Gdańsk",
		fieldOfStudy: "Informatyka",
		semester: "4",
		careerGoal: "Data Analyst",
	},
	syllabusText: "x".repeat(150),
	// Partia 4: wybór z poziomem (nazwa→2/3/4). Docker celowo NIEzaznaczony (Brak = luka).
	selections: { Python: 3, SQL: 2, Pandas: 4 },
};

/** Catch-all fetch: GET market-catalog (krok 3) + PATCH /progress; reszta 404. */
function stubFetch(catalog = { isRealCareerGoal: true, items: CATALOG_ITEMS }) {
	const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
		if (url.startsWith("/api/onboarding/market-catalog")) {
			return Promise.resolve({ ok: true, json: () => Promise.resolve(catalog) } as Response);
		}
		if (url === "/api/onboarding/progress" && init?.method === "PATCH") {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true }),
			} as Response);
		}
		return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

describe("OnboardingWizard — hydratacja initialStep/initialData", () => {
	it("wznawia od kroku 2 (Sylabus opcjonalny) z wczytanym sylabusem, nie od Kroku 0", () => {
		stubFetch();
		render(<OnboardingWizard user={USER} initialStep={2} initialData={RESUMED_DATA} />);
		// Krok 2 — nagłówek sylabusa (po przebudowie: „Sylabus (opcjonalny)"), NIE Pomocnik.
		expect(screen.getByRole("heading", { name: /Sylabus \(opcjonalny\)/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Wybierz cel \(stub\)/i })).not.toBeInTheDocument();
		// Sylabus z initialData wczytany do textarea.
		expect(screen.getByRole("textbox")).toHaveValue(RESUMED_DATA.syllabusText);
	});

	it("wznawia od kroku 3 (Kompetencje) — selections odtworzone na katalogu rynku", async () => {
		stubFetch();
		render(<OnboardingWizard user={USER} initialStep={3} initialData={RESUMED_DATA} />);
		expect(screen.getByRole("heading", { name: /Twoje kompetencje/i })).toBeInTheDocument();

		// Katalog dociąga się na wejściu w krok 3 — czekamy na pozycję „Python".
		const pythonGroup = await screen.findByRole("group", { name: "Poziom: Python" });
		// selections.Python=3 (Średni) → przycisk „Średni" wciśnięty (aria-pressed).
		expect(within(pythonGroup).getByRole("button", { name: "Średni" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		// selections.SQL=2 (Podstawowy) → „Podstawowy" wciśnięty.
		const sqlGroup = screen.getByRole("group", { name: "Poziom: SQL" });
		expect(within(sqlGroup).getByRole("button", { name: "Podstawowy" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		// Docker NIEzaznaczony → „Brak" wciśnięty (Brak = luka).
		const dockerGroup = screen.getByRole("group", { name: "Poziom: Docker" });
		expect(within(dockerGroup).getByRole("button", { name: "Brak" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});
});

describe("OnboardingWizard — klikalny pasek kroków (numeracja 5 kroków)", () => {
	it("skok do osiągniętego kroku (≤ maxReached) działa — powrót na Profil", async () => {
		stubFetch();
		const user = userEvent.setup();
		render(<OnboardingWizard user={USER} initialStep={3} initialData={RESUMED_DATA} />);
		// Start na kroku 3. Klik kropki „Profil" (idx1 → „Krok 2: Profil", osiągnięty) → render Profilu.
		await user.click(screen.getByRole("button", { name: /^Krok 2: Profil$/i }));
		expect(screen.getByRole("heading", { name: /Opowiedz nam o sobie/i })).toBeInTheDocument();
	});

	it("krok > maxReached zablokowany (disabled + aria-label »jeszcze niedostępny«)", () => {
		stubFetch();
		render(<OnboardingWizard user={USER} initialStep={1} initialData={RESUMED_DATA} />);
		// maxReached=1 → Kompetencje (num=3, idx3 → „Krok 4: Kompetencje") jest nieosiągnięty.
		const lockedDot = screen.getByRole("button", {
			name: /Krok 4: Kompetencje \(jeszcze niedostępny\)/i,
		});
		expect(lockedDot).toBeDisabled();
	});
});

describe("OnboardingWizard — autosave profilu (PATCH /progress)", () => {
	it("zmiana profilu + Dalej → PATCH /progress {step:1, ...profil} z poprawnym ciałem", async () => {
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
		// Po zapisie jesteśmy na kroku 2 (Sylabus opcjonalny).
		expect(screen.getByRole("heading", { name: /Sylabus \(opcjonalny\)/i })).toBeInTheDocument();
	});
});
