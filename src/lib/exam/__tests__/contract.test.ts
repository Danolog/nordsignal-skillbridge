/**
 * 1E.3 · P5 — strażnik 423 correctives_required (Sophia D2): odróżnia „masz
 * correctives do zrobienia" od błędu technicznego / innego ciała.
 */

import { describe, expect, it } from "vitest";
import { isCorrectivesRequired } from "../contract";

describe("isCorrectivesRequired", () => {
	it("true dla poprawnego ciała 423", () => {
		expect(
			isCorrectivesRequired({
				state: "correctives_required",
				correctivesPackage: { message: "x", concepts: [] },
			}),
		).toBe(true);
	});

	it("false, gdy brak state correctives_required", () => {
		expect(isCorrectivesRequired({ error: "boom" })).toBe(false);
		expect(isCorrectivesRequired({ state: "other", correctivesPackage: {} })).toBe(false);
	});

	it("false, gdy brak paczki", () => {
		expect(isCorrectivesRequired({ state: "correctives_required" })).toBe(false);
	});

	it("false dla null/nie-obiektu", () => {
		expect(isCorrectivesRequired(null)).toBe(false);
		expect(isCorrectivesRequired("correctives_required")).toBe(false);
	});
});
