// @vitest-environment jsdom
/**
 * 1E.7 L6 — INWARIANT „FLAGA ZGASZONA = EKRAN BAJT W BAJT JAK DZIŚ" (§12.6 wariant 1).
 *
 * Migawka (`toMatchSnapshot`) tego pliku powstała PRZED dołożeniem sekcji placementu
 * do `step-wnioski.tsx` — czyli utrwala dokładnie ten HTML, który krok 4 renderował
 * przed L6. Po implementacji ten sam test musi przejść bez aktualizacji migawki;
 * gdyby sekcja placementu wyciekła przy braku propu (albo zostawiła po sobie pusty
 * kontener/odstęp), migawka rozjedzie się i test zczerwienieje.
 *
 * To jest jedyny sposób, w jaki „bajt w bajt jak dziś" da się UDOWODNIĆ, a nie
 * zadeklarować: migawka wygenerowana po zmianie utrwaliłaby stan PO, nie PRZED.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@/lib/assessment/types";
import type { GroupCatalog, MarketCatalogItem } from "@/lib/onboarding/market-catalog";
import { StepWnioski } from "../step-wnioski";

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
];

const DIAGNOSIS: AssessmentResult = {
	schemaVersion: 1,
	kind: "diagnostic",
	concepts: { "ds-python": { asked: 2, correct: 2, level: 4 } },
	competencies: { Python: 4, SQL: 1 },
	uncovered: ["Docker"],
};

describe("StepWnioski — umiejscowienie sekcji „Po diagnozie” (§12.10)", () => {
	it("sekcja stoi POD panelem „Wynik testu” i NAD `profileNote`", () => {
		const { container } = render(
			<StepWnioski
				careerGoal="Data Scientist"
				catalog={CATALOG}
				groups={GROUPS}
				selections={{ Python: 4 }}
				profileNote="Dane wstępne — mała próbka."
				syllabusUsed={false}
				onComplete={() => {}}
				completing={false}
				diagnosisResult={DIAGNOSIS}
				placementSummary={{
					completedModuleTitles: [],
					unlockedModuleTitles: [],
					deepestUnlockedTitle: null,
					hole: null,
					recommendation: { kind: "module", title: "Start: środowisko pracy", isRoot: true },
				}}
			/>,
		);
		const t = container.textContent ?? "";
		// Placement jest KONSEKWENCJĄ diagnozy i ma stać zaraz za nią — kolejność
		// w drzewie dokumentu jest tu jednocześnie kolejnością dla czytnika ekranu.
		expect(t.indexOf("Wynik testu")).toBeLessThan(t.indexOf("Zacznij od"));
		expect(t.indexOf("Zacznij od")).toBeLessThan(t.indexOf("Dane wstępne"));
	});
});

describe("StepWnioski — flaga placementu zgaszona (§12.6 wariant 1)", () => {
	it("bez propu placementu render jest identyczny jak przed 1E.7 L6 (migawka sprzed zmiany)", () => {
		const { container } = render(
			<StepWnioski
				careerGoal="Data Scientist"
				catalog={CATALOG}
				groups={GROUPS}
				selections={{ Python: 4 }}
				profileNote="Dane wstępne — mała próbka."
				syllabusUsed={false}
				onComplete={() => {}}
				completing={false}
				diagnosisResult={DIAGNOSIS}
			/>,
		);
		expect(container.innerHTML).toMatchSnapshot();
	});
});
