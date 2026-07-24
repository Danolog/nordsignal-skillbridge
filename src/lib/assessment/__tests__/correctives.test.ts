// ============================================================================
// 1E.3 (ADR-014 D3) — P4 correctives: testy czystej logiki paczki remediacji.
// Bez DB (assembleCorrectives operuje na wierszach koncept↔atom, które w
// produkcji dostarcza exam-service.buildCorrectivesPackage).
//
// Pokrycie DoD P4:
//  - mikrocopy: format N/M/~15 min + polska odmiana ("1 pytania" vs "N pytań",
//    "1 koncept" / "2 koncepty" / "5 konceptów" / "12 konceptów"),
//  - przycięcie ≤3 atomy per koncept,
//  - dedup atomów po slugu,
//  - koncept bez atomów → wpis z pustą listą (R2),
//  - kolejność konceptów = kolejność failedConcepts,
//  - paczka pusta gdy zdał (failedConcepts=[]),
//  - wiersze spoza failedConcepts ignorowane.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
	assembleCorrectives,
	buildCorrectivesMessage,
	CORRECTIVES_MAX_ATOMS_PER_CONCEPT,
	type CorrectivesAtomRow,
} from "../correctives";

/** Wiersz koncept↔atom (skrót helper — nulle atomu dla przypadku R2). */
function row(
	conceptSlug: string,
	conceptName: string,
	atom?: { slug: string; title: string; kind?: string; moduleSlug?: string | null },
): CorrectivesAtomRow {
	return {
		conceptSlug,
		conceptName,
		atomSlug: atom?.slug ?? null,
		atomTitle: atom?.title ?? null,
		atomKind: atom ? (atom.kind ?? "theory") : null,
		moduleSlug: atom ? (atom.moduleSlug ?? "m-podstawy") : null,
	};
}

describe("buildCorrectivesMessage — format N/M/~15 min + polska odmiana", () => {
	it("N=1, M=2 → dopełniacz 'pytania' + 'koncepty' (przykład z planu P4)", () => {
		expect(buildCorrectivesMessage(1, 2)).toBe(
			"Zabrakło Ci 1 pytania — 2 koncepty do odświeżenia, ~15 min",
		);
	});

	it("N=3, M=5 → 'pytań' + 'konceptów' (forma z SPEC ADR)", () => {
		expect(buildCorrectivesMessage(3, 5)).toBe(
			"Zabrakło Ci 3 pytań — 5 konceptów do odświeżenia, ~15 min",
		);
	});

	it("N=2, M=1 → 'pytań' + 'koncept' (l. poj. konceptu)", () => {
		expect(buildCorrectivesMessage(2, 1)).toBe(
			"Zabrakło Ci 2 pytań — 1 koncept do odświeżenia, ~15 min",
		);
	});

	it("wyjątek 12–14: M=12 → 'konceptów' (nie 'koncepty')", () => {
		expect(buildCorrectivesMessage(2, 12)).toContain("12 konceptów do odświeżenia");
	});

	it("M=22 → 'koncepty' (końcówka 2 poza 12–14)", () => {
		expect(buildCorrectivesMessage(2, 22)).toContain("22 koncepty do odświeżenia");
	});

	it("zawsze niesie stały szacunek ~15 min", () => {
		expect(buildCorrectivesMessage(4, 3)).toContain("~15 min");
	});
});

describe("assembleCorrectives — dedup, przycięcie ≤3, kolejność, R2", () => {
	it("przycina do ≤3 atomy per koncept (4 kandydaci → 3, pierwsze wg wejścia)", () => {
		const rows: CorrectivesAtomRow[] = [
			row("c-typy", "Typy danych", { slug: "a1", title: "Atom 1" }),
			row("c-typy", "Typy danych", { slug: "a2", title: "Atom 2" }),
			row("c-typy", "Typy danych", { slug: "a3", title: "Atom 3" }),
			row("c-typy", "Typy danych", { slug: "a4", title: "Atom 4" }),
		];
		const pkg = assembleCorrectives(["c-typy"], 2, rows);
		expect(pkg.concepts).toHaveLength(1);
		expect(pkg.concepts[0].atoms).toHaveLength(CORRECTIVES_MAX_ATOMS_PER_CONCEPT);
		expect(pkg.concepts[0].atoms.map((a) => a.slug)).toEqual(["a1", "a2", "a3"]);
		expect(pkg.concepts[0].conceptName).toBe("Typy danych");
	});

	it("5 atomów konceptu → dokładnie 3 (przycięcie ≤3, pierwsze wg wejścia)", () => {
		// Wariant z 5 kandydatami (plan P4 mówi wprost o 5 → 3), silniejszy niż 4→3:
		// dowodzi, że limit trzyma się przy nadmiarze > 1 ponad próg.
		const rows: CorrectivesAtomRow[] = [
			row("c-typy", "Typy", { slug: "a1", title: "Atom 1" }),
			row("c-typy", "Typy", { slug: "a2", title: "Atom 2" }),
			row("c-typy", "Typy", { slug: "a3", title: "Atom 3" }),
			row("c-typy", "Typy", { slug: "a4", title: "Atom 4" }),
			row("c-typy", "Typy", { slug: "a5", title: "Atom 5" }),
		];
		const pkg = assembleCorrectives(["c-typy"], 2, rows);
		expect(pkg.concepts[0].atoms).toHaveLength(3);
		expect(pkg.concepts[0].atoms.map((a) => a.slug)).toEqual(["a1", "a2", "a3"]);
	});

	it("ten sam atom w DWÓCH konceptach → obecny w OBU (dedup jest per-koncept, nie globalny)", () => {
		// Atom 'a1' należy do c-a i c-b (mapowanie 1→wiele). Dedup patrzy tylko w
		// obrębie jednego konceptu, więc a1 MUSI zostać w obu paczkach.
		const rows: CorrectivesAtomRow[] = [
			row("c-a", "A", { slug: "a1", title: "Wspólny atom" }),
			row("c-b", "B", { slug: "a1", title: "Wspólny atom" }),
		];
		const pkg = assembleCorrectives(["c-a", "c-b"], 2, rows);
		expect(pkg.concepts[0].atoms.map((a) => a.slug)).toEqual(["a1"]);
		expect(pkg.concepts[1].atoms.map((a) => a.slug)).toEqual(["a1"]);
	});

	it("deduplikuje atomy po slugu (ten sam atom dwa razy → raz)", () => {
		const rows: CorrectivesAtomRow[] = [
			row("c-typy", "Typy", { slug: "a1", title: "Atom 1" }),
			row("c-typy", "Typy", { slug: "a1", title: "Atom 1" }),
			row("c-typy", "Typy", { slug: "a2", title: "Atom 2" }),
		];
		const pkg = assembleCorrectives(["c-typy"], 2, rows);
		expect(pkg.concepts[0].atoms.map((a) => a.slug)).toEqual(["a1", "a2"]);
	});

	it("koncept bez atomu-źródła → wpis z pustą listą (R2, degradacja nie wywrotka)", () => {
		const rows: CorrectivesAtomRow[] = [
			row("c-typy", "Typy", { slug: "a1", title: "Atom 1" }),
			row("c-sierota", "Koncept osierocony"), // brak atomu (LEFT JOIN → nulle)
		];
		const pkg = assembleCorrectives(["c-typy", "c-sierota"], 2, rows);
		expect(pkg.concepts).toHaveLength(2);
		expect(pkg.concepts[1].concept).toBe("c-sierota");
		expect(pkg.concepts[1].conceptName).toBe("Koncept osierocony");
		expect(pkg.concepts[1].atoms).toEqual([]);
	});

	it("kolejność konceptów = kolejność failedConcepts (nie kolejność wierszy)", () => {
		const rows: CorrectivesAtomRow[] = [
			row("c-b", "B", { slug: "b1", title: "B1" }),
			row("c-a", "A", { slug: "a1", title: "A1" }),
		];
		const pkg = assembleCorrectives(["c-a", "c-b"], 3, rows);
		expect(pkg.concepts.map((c) => c.concept)).toEqual(["c-a", "c-b"]);
	});

	it("każdy failedConcept ma wpis nawet bez żadnego wiersza (koncept nieznany w DB)", () => {
		const pkg = assembleCorrectives(["c-x"], 2, []);
		expect(pkg.concepts).toEqual([{ concept: "c-x", conceptName: null, atoms: [] }]);
	});

	it("wiersze konceptu spoza failedConcepts są ignorowane", () => {
		const rows: CorrectivesAtomRow[] = [
			row("c-typy", "Typy", { slug: "a1", title: "Atom 1" }),
			row("c-obcy", "Obcy", { slug: "x9", title: "Nie mój atom" }),
		];
		const pkg = assembleCorrectives(["c-typy"], 2, rows);
		expect(pkg.concepts).toHaveLength(1);
		expect(pkg.concepts[0].concept).toBe("c-typy");
	});

	it("paczka pusta gdy zdał (failedConcepts=[]) — zero konceptów", () => {
		const pkg = assembleCorrectives([], 0, []);
		expect(pkg.concepts).toEqual([]);
	});

	it("mikrocopy paczki liczy N=errorCount, M=liczba failedConcepts", () => {
		const rows: CorrectivesAtomRow[] = [
			row("c-a", "A", { slug: "a1", title: "A1" }),
			row("c-b", "B", { slug: "b1", title: "B1" }),
		];
		const pkg = assembleCorrectives(["c-a", "c-b"], 2, rows);
		expect(pkg.message).toBe("Zabrakło Ci 2 pytań — 2 koncepty do odświeżenia, ~15 min");
	});

	it("atom niesie slug/title/kind/moduleSlug (payload dla P5)", () => {
		const rows: CorrectivesAtomRow[] = [
			row("c-a", "A", { slug: "a1", title: "Atom 1", kind: "exercise", moduleSlug: "m-1" }),
		];
		const pkg = assembleCorrectives(["c-a"], 2, rows);
		expect(pkg.concepts[0].atoms[0]).toEqual({
			slug: "a1",
			title: "Atom 1",
			kind: "exercise",
			moduleSlug: "m-1",
		});
	});
});
