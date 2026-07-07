// Testy jednostkowe metryk ewaluacyjnych AG.0 (tests/evals/lib/metrics.ts).
// Biegną w projekcie UNIT (zwykłe CI, bez LLM) — poprawność liczenia
// precision/recall/F1 nie może zależeć od posiadania klucza API.

import { describe, expect, it } from "vitest";
import { macroAverage, normalizeName, setMetrics } from "../evals/lib/metrics";

describe("normalizeName", () => {
	it("przycina białe znaki i obniża wielkość liter", () => {
		expect(normalizeName("  Python ")).toBe("python");
		expect(normalizeName("SIEM")).toBe("siem");
	});
});

describe("setMetrics", () => {
	it("pełna zgodność → precision = recall = f1 = 1", () => {
		const m = setMetrics(["Python", "SQL"], ["SQL", "Python"]);
		expect(m).toMatchObject({ tp: 2, fp: 0, fn: 0, precision: 1, recall: 1, f1: 1 });
		expect(m.falsePositives).toEqual([]);
		expect(m.falseNegatives).toEqual([]);
	});

	it("porównuje po normalizacji (casing/białe znaki nie psują trafień)", () => {
		const m = setMetrics(["Python", "REST / API"], [" python", "rest / api"]);
		expect(m.precision).toBe(1);
		expect(m.recall).toBe(1);
	});

	it("liczy fałszywe trafienia i przeoczenia z listami nazw", () => {
		const m = setMetrics(["Python", "SQL", "Git"], ["Python", "Kafka"]);
		expect(m).toMatchObject({ tp: 1, fp: 1, fn: 2 });
		expect(m.precision).toBe(0.5);
		expect(m.recall).toBeCloseTo(1 / 3);
		expect(m.falsePositives).toEqual(["kafka"]);
		expect(m.falseNegatives).toEqual(["git", "sql"]);
	});

	it("puste expected i puste actual → ideał (konwencja brzegowa)", () => {
		const m = setMetrics([], []);
		expect(m.precision).toBe(1);
		expect(m.recall).toBe(1);
		expect(m.f1).toBe(1);
	});

	it("puste expected, niepuste actual → precision 0, recall 1, f1 0", () => {
		const m = setMetrics([], ["Python"]);
		expect(m.precision).toBe(0);
		expect(m.recall).toBe(1);
		expect(m.f1).toBe(0);
	});

	it("niepuste expected, puste actual → precision 1, recall 0, f1 0", () => {
		const m = setMetrics(["Python"], []);
		expect(m.precision).toBe(1);
		expect(m.recall).toBe(0);
		expect(m.f1).toBe(0);
	});

	it("duplikaty po normalizacji liczą się raz (zbiory, nie listy)", () => {
		const m = setMetrics(["Python"], ["Python", " python ", "PYTHON"]);
		expect(m).toMatchObject({ tp: 1, fp: 0, fn: 0, precision: 1, recall: 1 });
	});
});

describe("macroAverage", () => {
	it("uśrednia po przypadkach z równą wagą", () => {
		const a = setMetrics(["x"], ["x"]); // P=1, R=1
		const b = setMetrics(["x", "y"], ["x", "z"]); // P=0.5, R=0.5
		const macro = macroAverage([a, b]);
		expect(macro.precision).toBe(0.75);
		expect(macro.recall).toBe(0.75);
	});

	it("pusta lista → zera (a nie NaN)", () => {
		expect(macroAverage([])).toEqual({ precision: 0, recall: 0, f1: 0 });
	});
});
