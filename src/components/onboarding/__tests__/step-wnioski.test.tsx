// @vitest-environment jsdom
/**
 * StepWnioski — krok 4 „Wnioski" (ETAP D). Render komponentu z fixture (props-in),
 * bez przepychania wizarda. Sprawdzamy: kotwica pokrycia, grupy „Masz X z Y",
 * 3 kafle priorytetów (zgodne z deriveGaps), suma godzin, pusty stan 100%,
 * cel zmieniony (bezstanowość), profileNote, CTA (onComplete z targetem).
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupCatalog, MarketCatalogItem } from "@/lib/onboarding/market-catalog";
import { StepWnioski } from "../step-wnioski";

// Katalog: max popyt 90 (SQL). r=popyt/90 → critical ≥0,66 (≥59,4) · important ≥0,33 (≥29,7).
// SQL 90 critical, Python 50 important (0,56), Docker 20 nice (0,22). (priorytet względny.)
const CATALOG: MarketCatalogItem[] = [
	{ competencyName: "SQL", demandPercentage: 90, category: "Dane", inSyllabus: false },
	{ competencyName: "Python", demandPercentage: 50, category: "Język", inSyllabus: false },
	{ competencyName: "Docker", demandPercentage: 20, category: "DevOps", inSyllabus: false },
];

const GROUPS: GroupCatalog[] = [
	{
		name: "Dane i AI",
		unionShare: 70,
		description: "Rdzeń pracy z danymi.",
		items: [
			{ competencyName: "SQL", demandPercentage: 90, kind: "tool" },
			{ competencyName: "Python", demandPercentage: 50, kind: "tool" },
		],
	},
	{
		name: "Infrastruktura",
		unionShare: null,
		description: null,
		items: [{ competencyName: "Docker", demandPercentage: 20, kind: "tool" }],
	},
];

function renderStep(overrides: Partial<React.ComponentProps<typeof StepWnioski>> = {}) {
	const onComplete = vi.fn();
	const props = {
		careerGoal: "Data Analyst",
		catalog: CATALOG,
		groups: GROUPS,
		selections: {} as Record<string, 2 | 3 | 4>,
		profileNote: null,
		syllabusUsed: false,
		onComplete,
		completing: false,
		...overrides,
	};
	render(<StepWnioski {...props} />);
	return { onComplete };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("StepWnioski — kotwica pokrycia", () => {
	it("0 zaznaczeń → 0% pokrycia, cel w nagłówku", () => {
		renderStep({ selections: {} });
		expect(screen.getByRole("heading", { name: /Masz plan/i })).toBeInTheDocument();
		expect(screen.getByText(/Data Analyst/)).toBeInTheDocument();
		// 0% widoczne w kotwicie i na osi.
		expect(screen.getAllByText(/0%/).length).toBeGreaterThanOrEqual(1);
	});

	it("częściowe zaznaczenie → pokrycie liczone wagą (acquired=1, in_progress=0,5)", () => {
		// SQL=3 (1.0) + Python=2 (0.5) = 1.5 / 3 = 50%.
		renderStep({ selections: { SQL: 3, Python: 2 } });
		expect(screen.getByText(/Teraz: 50%/)).toBeInTheDocument();
	});
});

describe("StepWnioski — grupy „Masz X z Y”", () => {
	it("render grup z licznikiem posiadania i SharePill; grupa bez unionShare bez pigułki", () => {
		renderStep({ selections: { SQL: 3 } });
		// Grupa „Dane i AI": SQL zaznaczony, Python nie → Masz 1 z 2.
		expect(screen.getByText("Masz 1 z 2")).toBeInTheDocument();
		// Grupa „Infrastruktura": Docker niezaznaczony → Masz 0 z 1.
		expect(screen.getByText("Masz 0 z 1")).toBeInTheDocument();
		// SharePill tylko dla grupy z unionShare.
		expect(screen.getByText(/70% ofert grupy/)).toBeInTheDocument();
		expect(screen.queryByText(/null/)).not.toBeInTheDocument();
	});
});

describe("StepWnioski — plan nauki (luki)", () => {
	it("3 kafle priorytetów zgodne z deriveGaps + suma godzin", () => {
		// 0 zaznaczeń → wszystkie 3 luką: SQL critical(8h), Python important(5h), Docker nice(3h).
		renderStep({ selections: {} });
		expect(screen.getByText("Twój plan nauki")).toBeInTheDocument();
		// Suma 8+5+3 = 16h.
		expect(screen.getByText(/16 h/)).toBeInTheDocument();
		// Kafle: Krytyczne 1, Ważne 1, Warto znać 1.
		for (const label of ["Krytyczne", "Ważne", "Warto znać"]) {
			const tile = screen.getByText(label).closest("div");
			expect(tile && within(tile.parentElement as HTMLElement).getByText("1")).toBeTruthy();
		}
		// Top luki widoczne (nazwa + % ofert + godziny).
		expect(screen.getByText("SQL")).toBeInTheDocument();
		expect(screen.getByText(/90% ofert/)).toBeInTheDocument();
	});

	it("pusty plan (100% pokrycia) → zachęta do projektu, nie „gratulacje koniec”", () => {
		renderStep({ selections: { SQL: 3, Python: 4, Docker: 3 } });
		expect(screen.getByText(/Czas pokazać to projektami/i)).toBeInTheDocument();
		// Brak kafli priorytetów / sumy godzin gdy 0 luk.
		expect(screen.queryByText(/h nauki na start/)).not.toBeInTheDocument();
	});
});

describe("StepWnioski — profileNote", () => {
	it("nota widoczna gdy ustawiona", () => {
		renderStep({ profileNote: "Dane wstępne — mała próbka." });
		expect(screen.getByText(/Dane wstępne — mała próbka\./)).toBeInTheDocument();
	});
	it("brak noty gdy null", () => {
		renderStep({ profileNote: null });
		expect(screen.queryByText(/Dane wstępne/)).not.toBeInTheDocument();
	});
});

describe("StepWnioski — bezstanowość względem celu (G/re-onboarding)", () => {
	it("inny cel + inny katalog → nowe liczby (dowód bezstanowości)", () => {
		const cyber: MarketCatalogItem[] = [
			{ competencyName: "SIEM", demandPercentage: 12, category: "Sec", inSyllabus: false },
			{ competencyName: "IAM", demandPercentage: 6, category: "Sec", inSyllabus: false },
		];
		renderStep({
			careerGoal: "Cybersecurity Specialist",
			catalog: cyber,
			groups: [],
			selections: { SIEM: 3 }, // 1.0 / 2 = 50%
		});
		expect(screen.getByText(/Cybersecurity Specialist/)).toBeInTheDocument();
		expect(screen.getByText(/Teraz: 50%/)).toBeInTheDocument();
		// IAM zostaje luką.
		expect(screen.getByText("IAM")).toBeInTheDocument();
	});
});

describe("StepWnioski — CTA", () => {
	it("główne „Przejdź do pulpitu” woła onComplete() bez targetu", async () => {
		const { onComplete } = renderStep();
		await userEvent.click(screen.getByRole("button", { name: /Przejdź do pulpitu/i }));
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete.mock.calls[0][0]).toBeUndefined();
	});

	it("miękkie linki domykają z targetem (/gap-analysis, /projects)", async () => {
		const { onComplete } = renderStep();
		await userEvent.click(screen.getByRole("button", { name: /Zobacz analizę luk/i }));
		expect(onComplete).toHaveBeenCalledWith("/gap-analysis");
		await userEvent.click(screen.getByRole("button", { name: /Wybierz pierwszy projekt/i }));
		expect(onComplete).toHaveBeenCalledWith("/projects");
	});

	it("completing → CTA zablokowane (spinner)", () => {
		renderStep({ completing: true });
		expect(screen.getByRole("button", { name: /Kończę/i })).toBeDisabled();
	});
});

describe("StepWnioski — Start z toku studiów (sylabus)", () => {
	it("syllabusUsed z pozycją inSyllabus → punkt Start widoczny", () => {
		const catalog: MarketCatalogItem[] = [
			{ competencyName: "SQL", demandPercentage: 90, category: "Dane", inSyllabus: true },
			{ competencyName: "Python", demandPercentage: 60, category: "Język", inSyllabus: false },
			{ competencyName: "Docker", demandPercentage: 20, category: "DevOps", inSyllabus: false },
		];
		// SQL (inSyllabus, 3→1.0) + Python (3→1.0): teraz = 2/3 = 67%; start (tylko SQL) = 1/3 = 33%.
		renderStep({ catalog, groups: [], syllabusUsed: true, selections: { SQL: 3, Python: 3 } });
		expect(screen.getByText(/Start z toku studiów: 33%/)).toBeInTheDocument();
	});

	it("bez sylabusa → brak punktu Start", () => {
		renderStep({ syllabusUsed: false, selections: { SQL: 3 } });
		expect(screen.queryByText(/Start z toku studiów/)).not.toBeInTheDocument();
		expect(screen.getByText(/Twój start/)).toBeInTheDocument();
	});
});
