/**
 * A5/1.11 — kontrakt treści banku pytań DS (partia 1). Wzorzec:
 * content-ds-projects.contract.test.ts (bramka jakości ryzyka #1: literówka
 * w competencyName = cicha utrata pokrycia diagnozy → `uncovered`).
 *
 * Always-on guard (projekt UNIT, bez bazy/LLM):
 *   1. każdy koncept 'market' wskazuje DOKŁADNY liść ścieżki Data Scientist,
 *   2. dokładnie 1 koncept diagnostyczny per liść DS — pokrycie 24/24
 *      (nadzbiór dzisiejszego katalogu rynku 21 pozycji — odporność na
 *      przyszłe odświeżenia rynku AG),
 *   3. >=2 warianty per (koncept, trudność) — liczone per trudność, nie per
 *      koncept (2 gwarantowane podejścia bez powtórek: onboarding + re-diagnoza),
 *   4. d2/d3 bez single_choice i bez short_text; d1 bez short_text (spec §5),
 *   5. klucz odpowiedzi samozgodny z gradeAnswer (jedno źródło prawdy oceny).
 */
import { expect, it } from "vitest";
import { getPathLeafNames } from "../../../tools/content-cyber-projects";
import {
	type QuestionConceptInput,
	validateConceptStructure,
} from "../../../tools/content-question-bank";
// Bank pytań niesie klucze odpowiedzi → mieszka w prywatnym repo treści
// (tools/tresc-prywatna.ts). Brak treści = twardy błąd; fork bez sekretu =
// jawne pominięcie. Ścieżka bez zmian — zaciąg kładzie plik w to samo miejsce.
import { czytajTrescJson, describeTresc } from "../../support/tresc-prywatna";

const DS_PATH_LABEL = "Data Scientist";
const dsLeaves = getPathLeafNames(DS_PATH_LABEL);

const concepts = czytajTrescJson<QuestionConceptInput[]>(
	"tools/content/question-bank-ds-partia-1.json",
	[],
);

describeTresc("bank pytań DS partia 1 — kontrakt treści", () => {
	it("plik ma unikalne slugi konceptów", () => {
		const slugs = concepts.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("każdy koncept 'market' wskazuje dokładny liść ścieżki DS", () => {
		for (const concept of concepts.filter((c) => c.trunk === "market")) {
			expect(
				concept.competencyName && dsLeaves.has(concept.competencyName),
				`koncept "${concept.slug}": competencyName "${concept.competencyName}" nie jest liściem DS`,
			).toBe(true);
		}
	});

	it("dokładnie 1 koncept diagnostyczny per liść DS (pełne pokrycie)", () => {
		const diagnostic = concepts.filter((c) => c.diagnostic && c.trunk === "market");
		const byLeaf = new Map<string, number>();
		for (const c of diagnostic) {
			byLeaf.set(c.competencyName as string, (byLeaf.get(c.competencyName as string) ?? 0) + 1);
		}
		const missing = [...dsLeaves].filter((leaf) => !byLeaf.has(leaf));
		expect(missing, `liście DS bez konceptu diagnostycznego: ${missing.join(", ")}`).toEqual([]);
		const duplicated = [...byLeaf.entries()].filter(([, n]) => n > 1).map(([leaf]) => leaf);
		expect(duplicated, `liście z >1 konceptem diagnostycznym: ${duplicated.join(", ")}`).toEqual(
			[],
		);
	});

	it("struktura konceptów i itemów: warianty, typy per trudność, samozgodność klucza", () => {
		const problems = concepts.flatMap((c) => validateConceptStructure(c, 2));
		expect(problems, problems.join("\n")).toEqual([]);
	});

	it("partia 1 nie zawiera short_text (wraca w 1E.2)", () => {
		const offenders = concepts.flatMap((c) =>
			c.items.filter((i) => i.type === "short_text").map(() => c.slug),
		);
		expect(offenders).toEqual([]);
	});

	it("stemy unikalne globalnie (warianty to różne pytania, nie parafrazy 1:1)", () => {
		const stems = concepts.flatMap((c) => c.items.map((i) => i.stem.trim().toLowerCase()));
		const seen = new Set<string>();
		const dupes = stems.filter((s) => {
			if (seen.has(s)) return true;
			seen.add(s);
			return false;
		});
		expect(dupes, `zduplikowane stemy: ${dupes.slice(0, 3).join(" | ")}`).toEqual([]);
	});
});
