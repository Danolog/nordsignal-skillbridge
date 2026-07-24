/**
 * 1E.3 (ADR-014 D3) — dowód kontraktu `examConfigJson` (mastery gate).
 *
 * Pilnuje kształtu parametrów egzaminu per moduł PRZED konsumentem API (P3):
 *  - liczba pytań 15–20,
 *  - próg jako LICZNIK błędów (nie procent),
 *  - niezmiennik spójności progu: 1 ≤ maxErrors ≤ floor(questionCount/10)
 *    (próg zaliczenia ≥ 90%, a zarazem „1 lapsus nie oblewa").
 */

import { describe, expect, it } from "vitest";
import {
	type ExamConfig,
	examConfigSchema,
	maxErrorsCeilingFor,
	parseExamConfig,
	safeParseExamConfig,
} from "../exam-config";

const ok = (raw: unknown) => examConfigSchema.safeParse(raw).success;

describe("1E.3 · examConfigJson — kształt poprawny (ADR-014 D3)", () => {
	it("akceptuje kanoniczne kształty ADR: ≤1 błąd przy 15, ≤2 przy 20", () => {
		expect(ok({ questionCount: 15, maxErrors: 1 })).toBe(true);
		expect(ok({ questionCount: 20, maxErrors: 2 })).toBe(true);
		// 20 pytań / 1 błąd = surowszy (95%), ale wciąż spójny (≤ sufit 2).
		expect(ok({ questionCount: 20, maxErrors: 1 })).toBe(true);
	});

	it("cały zakres 15–20 z sufitem floor(qc/10): 15–19 → 1, 20 → 2", () => {
		for (let qc = 15; qc <= 19; qc++) {
			expect(maxErrorsCeilingFor(qc), `qc=${qc}`).toBe(1);
			expect(ok({ questionCount: qc, maxErrors: 1 }), `qc=${qc}`).toBe(true);
		}
		expect(maxErrorsCeilingFor(20)).toBe(2);
	});

	it("infer daje typ liczb całkowitych (kontrakt konsumenta P3)", () => {
		const cfg: ExamConfig = examConfigSchema.parse({ questionCount: 18, maxErrors: 1 });
		expect(cfg).toEqual({ questionCount: 18, maxErrors: 1 });
	});
});

describe("1E.3 · examConfigJson — ODRZUCA niezmienniki", () => {
	it("próg NIESPÓJNY z liczbą pytań (maxErrors > sufit)", () => {
		expect(ok({ questionCount: 15, maxErrors: 2 })).toBe(false); // 2 > floor(15/10)=1
		expect(ok({ questionCount: 20, maxErrors: 3 })).toBe(false); // 3 > floor(20/10)=2
		expect(ok({ questionCount: 19, maxErrors: 2 })).toBe(false); // 2 > floor(19/10)=1
	});

	it("liczba pytań POZA 15–20", () => {
		expect(ok({ questionCount: 12, maxErrors: 1 })).toBe(false);
		expect(ok({ questionCount: 14, maxErrors: 1 })).toBe(false);
		expect(ok({ questionCount: 21, maxErrors: 2 })).toBe(false);
		expect(ok({ questionCount: 25, maxErrors: 2 })).toBe(false);
	});

	it("próg jako PROCENT zamiast licznika", () => {
		// 0.1 = „10%" — wartość ułamkowa odpada na int().
		expect(ok({ questionCount: 20, maxErrors: 0.1 })).toBe(false);
		// 90 = „90%” wpisane w pole licznika — spoza sufitu.
		expect(ok({ questionCount: 20, maxErrors: 90 })).toBe(false);
		// 10 = „10%” — też spoza sufitu (floor(20/10)=2).
		expect(ok({ questionCount: 20, maxErrors: 10 })).toBe(false);
	});

	it("maxErrors=0 (wymagane 100%) — łamie zamysł ADR: 1 lapsus nie może oblewać", () => {
		expect(ok({ questionCount: 15, maxErrors: 0 })).toBe(false);
	});

	it("liczby niecałkowite w questionCount", () => {
		expect(ok({ questionCount: 15.5, maxErrors: 1 })).toBe(false);
	});

	it("klucz spoza kontraktu (np. thresholdPercent zamiast maxErrors) — strict()", () => {
		expect(ok({ questionCount: 20, maxErrors: 2, thresholdPercent: 90 })).toBe(false);
		expect(ok({ questionCount: 20, thresholdPercent: 90 })).toBe(false); // brak maxErrors
	});

	it("braki pól i złe typy", () => {
		expect(ok({ questionCount: 15 })).toBe(false);
		expect(ok({ maxErrors: 1 })).toBe(false);
		expect(ok({ questionCount: "15", maxErrors: "1" })).toBe(false);
		expect(ok(null)).toBe(false);
	});
});

describe("1E.3 · parseExamConfig — parser kolumny exam_config_json", () => {
	it("NULL/undefined (moduł bez egzaminu) → null, nie błąd", () => {
		expect(parseExamConfig(null)).toBeNull();
		expect(parseExamConfig(undefined)).toBeNull();
	});

	it("poprawny jsonb → sparsowany obiekt", () => {
		expect(parseExamConfig({ questionCount: 20, maxErrors: 2 })).toEqual({
			questionCount: 20,
			maxErrors: 2,
		});
	});

	it("niepoprawny kształt RZUCA (zła konfiguracja nie wchodzi cicho jako egzamin)", () => {
		expect(() => parseExamConfig({ questionCount: 12, maxErrors: 5 })).toThrow();
	});

	it("safeParseExamConfig zwraca komplet błędów bez rzucania", () => {
		const res = safeParseExamConfig({ questionCount: 15, maxErrors: 2 });
		expect(res.success).toBe(false);
	});
});
