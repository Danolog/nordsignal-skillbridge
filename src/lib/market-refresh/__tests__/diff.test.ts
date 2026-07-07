import { describe, expect, it } from "vitest";
import { diffMarket, type MarketRow } from "../diff";

const row = (
	careerGoal: string,
	competencyName: string,
	demandPercentage: number,
	category = "II",
): MarketRow => ({ careerGoal, competencyName, demandPercentage, category });

// Sztuczna delta (DoD AG.3): baza prod vs staging z każdą klasą zmiany.
const CURRENT: MarketRow[] = [
	row("Data Analyst", "Python", 53, "I"),
	row("Data Analyst", "SQL", 48, "I"),
	row("Data Analyst", "SAS", 5, "I"),
	row("Java Developer", "Java", 89),
	row("Java Developer", "Spring / Spring Boot", 48),
	row("UX/UI Designer", "Figma", 61, "V"),
];

const STAGED: MarketRow[] = [
	// Data Analyst: Python bez zmian, SQL 48→51, SAS znika, dochodzi dbt.
	row("Data Analyst", "Python", 53, "I"),
	row("Data Analyst", "SQL", 51, "I"),
	row("Data Analyst", "dbt", 9, "I"),
	// Java: bez żadnych zmian (nie może wystąpić w changedPaths).
	row("Java Developer", "Java", 89),
	row("Java Developer", "Spring / Spring Boot", 48),
	// UX/UI zniknęło; dochodzi nowa ścieżka.
	row("iOS Developer", "Swift", 72, "II"),
	row("iOS Developer", "Xcode", 41, "II"),
];

describe("diffMarket", () => {
	const diff = diffMarket(CURRENT, STAGED);

	it("wykrywa nową ścieżkę z liczbą kompetencji", () => {
		expect(diff.newPaths).toEqual([{ careerGoal: "iOS Developer", competencies: 2 }]);
	});

	it("wykrywa zniknięcie ścieżki", () => {
		expect(diff.removedPaths).toEqual([{ careerGoal: "UX/UI Designer", competencies: 1 }]);
	});

	it("ścieżka bez zmian NIE pojawia się w changedPaths", () => {
		expect(diff.changedPaths.map((p) => p.careerGoal)).toEqual(["Data Analyst"]);
	});

	it("per ścieżka: dodane / usunięte / zmienione z deltą p.p.", () => {
		const da = diff.changedPaths[0];
		expect(da.added).toEqual([{ competencyName: "dbt", demandPercentage: 9 }]);
		expect(da.removed).toEqual([{ competencyName: "SAS", demandPercentage: 5 }]);
		expect(da.changed).toEqual([{ competencyName: "SQL", from: 48, to: 51, delta: 3 }]);
	});

	it("summary zlicza wszystkie klasy zmian", () => {
		expect(diff.summary).toEqual({
			pathsBefore: 3,
			pathsAfter: 3,
			rowsBefore: 6,
			rowsAfter: 7,
			newPaths: 1,
			removedPaths: 1,
			changedPaths: 1,
			addedCompetencies: 1,
			removedCompetencies: 1,
			changedCompetencies: 1,
		});
	});

	it("identyczne wejścia = zerowy diff", () => {
		const zero = diffMarket(CURRENT, CURRENT);
		expect(zero.newPaths).toEqual([]);
		expect(zero.removedPaths).toEqual([]);
		expect(zero.changedPaths).toEqual([]);
		expect(zero.summary.changedCompetencies).toBe(0);
	});

	it("dopasowanie odporne na wielkość liter i białe znaki (normalizacja jak deriveGaps)", () => {
		const d = diffMarket(
			[row("Data Analyst", "Power BI", 23)],
			[row("data analyst ", " power bi", 23)],
		);
		expect(d.newPaths).toEqual([]);
		expect(d.removedPaths).toEqual([]);
		expect(d.changedPaths).toEqual([]);
	});

	it("zmiana samej rodziny e-CF raportowana jako changed z categoryFrom/To", () => {
		const d = diffMarket([row("BA", "UML", 59, "I")], [row("BA", "UML", 59, "V")]);
		expect(d.changedPaths[0].changed).toEqual([
			{ competencyName: "UML", from: 59, to: 59, delta: 0, categoryFrom: "I", categoryTo: "V" },
		]);
	});

	it("zmiany posortowane po |delcie| malejąco (największe przesunięcia na górze)", () => {
		const d = diffMarket(
			[row("X", "A", 10), row("X", "B", 10), row("X", "C", 10)],
			[row("X", "A", 12), row("X", "B", 30), row("X", "C", 5)],
		);
		expect(d.changedPaths[0].changed.map((c) => c.competencyName)).toEqual(["B", "C", "A"]);
	});

	it("pusty prod (pierwszy przebieg) = wszystkie ścieżki nowe", () => {
		const d = diffMarket([], STAGED);
		expect(d.newPaths.map((p) => p.careerGoal)).toEqual([
			"Data Analyst",
			"iOS Developer",
			"Java Developer",
		]);
		expect(d.summary.rowsBefore).toBe(0);
	});
});
