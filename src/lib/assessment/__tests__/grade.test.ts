/**
 * A5/1.11 — testy gradingu (spec §2.3): każda odpowiedź poprawna/niepoprawna/
 * brzegowa per typ (wzorzec DoD 1E.2, dostarczony „za darmo" już teraz).
 * Grading jest fail-closed: zły kształt odpowiedzi LUB klucza → false, nie wyjątek.
 */
import { describe, expect, it } from "vitest";
import { gradeAnswer, normalizeShortText, parsePolishNumber } from "../grade";

describe("parsePolishNumber — normalizacja polskiego zapisu", () => {
	it("przecinek dziesiętny", () => {
		expect(parsePolishNumber("3,14")).toBeCloseTo(3.14);
	});
	it("kropka dziesiętna (też legalna)", () => {
		expect(parsePolishNumber("3.14")).toBeCloseTo(3.14);
	});
	it("spacje tysięcy (zwykła i niełamliwa)", () => {
		expect(parsePolishNumber("1 000 000")).toBe(1_000_000);
		expect(parsePolishNumber("1 000")).toBe(1000);
	});
	it("liczby ujemne i notacja wykładnicza", () => {
		expect(parsePolishNumber("-2,5")).toBeCloseTo(-2.5);
		expect(parsePolishNumber("1e6")).toBe(1_000_000);
	});
	it("śmieci → NaN (nie parsujemy częściowo)", () => {
		expect(parsePolishNumber("3,14 zł")).toBeNaN();
		expect(parsePolishNumber("abc")).toBeNaN();
		expect(parsePolishNumber("")).toBeNaN();
		expect(parsePolishNumber("1,2,3")).toBeNaN();
	});
});

describe("normalizeShortText — diakrytyki/interpunkcja/białe znaki", () => {
	it("zdejmuje polskie diakrytyki (w tym ł, którego NFD nie rozkłada)", () => {
		expect(normalizeShortText("Średnia ważona")).toBe("srednia wazona");
		expect(normalizeShortText("łączenie")).toBe("laczenie");
	});
	it("interpunkcja i myślniki → spacja, zwijanie białych znaków", () => {
		expect(normalizeShortText("data-frame")).toBe("data frame");
		expect(normalizeShortText("  DataFrame.  ")).toBe("dataframe");
	});
});

describe("gradeAnswer — single_choice", () => {
	const key = { correct: 2 };
	it("poprawna", () => {
		expect(gradeAnswer("single_choice", key, { selected: 2 })).toBe(true);
	});
	it("niepoprawna", () => {
		expect(gradeAnswer("single_choice", key, { selected: 1 })).toBe(false);
	});
	it("brzegowa: zły kształt odpowiedzi → false, nie wyjątek", () => {
		expect(gradeAnswer("single_choice", key, { selected: "2" })).toBe(false);
		expect(gradeAnswer("single_choice", key, {})).toBe(false);
		expect(gradeAnswer("single_choice", key, null)).toBe(false);
	});
	it("brzegowa: uszkodzony klucz → false", () => {
		expect(gradeAnswer("single_choice", { correct: "2" }, { selected: 2 })).toBe(false);
		expect(gradeAnswer("single_choice", null, { selected: 2 })).toBe(false);
	});
});

describe("gradeAnswer — multi_choice (równość zbiorów, bez punktów częściowych)", () => {
	const key = { correct: [0, 2] };
	it("poprawna (kolejność bez znaczenia)", () => {
		expect(gradeAnswer("multi_choice", key, { selected: [2, 0] })).toBe(true);
	});
	it("niepoprawna: podzbiór to NIE zaliczenie", () => {
		expect(gradeAnswer("multi_choice", key, { selected: [0] })).toBe(false);
	});
	it("niepoprawna: nadzbiór to NIE zaliczenie", () => {
		expect(gradeAnswer("multi_choice", key, { selected: [0, 1, 2] })).toBe(false);
	});
	it("brzegowa: duplikaty w odpowiedzi nie oszukują równości zbiorów", () => {
		expect(gradeAnswer("multi_choice", key, { selected: [0, 0, 2] })).toBe(false);
	});
	it("brzegowa: zły kształt → false", () => {
		expect(gradeAnswer("multi_choice", key, { selected: "0,2" })).toBe(false);
		expect(gradeAnswer("multi_choice", key, { selected: [0, "2"] })).toBe(false);
	});
});

describe("gradeAnswer — numeric (tolerancja bezwzględna i względna)", () => {
	it("bezwzględna: |odp − v| ≤ t, z polskim przecinkiem", () => {
		const key = { value: 3.14, tolerance: 0.01 };
		expect(gradeAnswer("numeric", key, { value: "3,14" })).toBe(true);
		expect(gradeAnswer("numeric", key, { value: "3.149" })).toBe(true);
		expect(gradeAnswer("numeric", key, { value: "3,16" })).toBe(false);
	});
	it("względna: |odp − v| ≤ t·|v| dla wartości dużych", () => {
		const key = { value: 1_000_000, tolerance: 0.01, relative: true };
		expect(gradeAnswer("numeric", key, { value: "1 005 000" })).toBe(true);
		expect(gradeAnswer("numeric", key, { value: "1 020 000" })).toBe(false);
	});
	it("brzegowa: dokładnie na granicy tolerancji = zaliczone (≤, nie <)", () => {
		const key = { value: 10, tolerance: 0.5 };
		expect(gradeAnswer("numeric", key, { value: "10,5" })).toBe(true);
	});
	it("brzegowa: wartość bliska zera z tolerancją bezwzględną nie przepuszcza 10× błędu", () => {
		const key = { value: 0.001, tolerance: 0.0001 };
		expect(gradeAnswer("numeric", key, { value: "0,01" })).toBe(false);
	});
	it("brzegowa: nie-liczba → false", () => {
		const key = { value: 5, tolerance: 0 };
		expect(gradeAnswer("numeric", key, { value: "pięć" })).toBe(false);
	});
});

describe("gradeAnswer — short_text (normalizacja obu stron)", () => {
	const key = { accepted: ["DataFrame", "ramka danych"] };
	it("poprawna: diakrytyki/wielkość liter/interpunkcja bez znaczenia", () => {
		expect(gradeAnswer("short_text", key, { value: "  dataframe " })).toBe(true);
		expect(gradeAnswer("short_text", key, { value: "Ramka danych." })).toBe(true);
	});
	it("niepoprawna", () => {
		expect(gradeAnswer("short_text", key, { value: "seria" })).toBe(false);
	});
	it("brzegowa: pusta odpowiedź → false (nawet gdyby accepted zawierało pusty string)", () => {
		expect(gradeAnswer("short_text", { accepted: [""] }, { value: "   " })).toBe(false);
	});
});
