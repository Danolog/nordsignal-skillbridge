import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildSuggestionsCacheKey,
	clearSuggestionsCache,
	getCachedSuggestions,
	setCachedSuggestions,
	suggestionsCacheSize,
} from "../faculty-suggestions-cache";

beforeEach(() => {
	clearSuggestionsCache();
});

const input = (studentCount: number, name = "SQL", pct = 80) => ({
	studentCount,
	items: [{ name, requiredByPercent: pct }],
});

describe("faculty-suggestions-cache", () => {
	it("miss → null; po set → hit zwraca zapisaną wartość", () => {
		const key = buildSuggestionsCacheKey("t1", input(10));
		expect(getCachedSuggestions(key)).toBeNull();
		setCachedSuggestions(key, ["s1", "s2"]);
		expect(getCachedSuggestions(key)).toEqual(["s1", "s2"]);
	});

	it("klucz zależy od tenanta i wejścia — brak kolizji między różnymi", () => {
		const a = buildSuggestionsCacheKey("t1", input(10));
		const bTenant = buildSuggestionsCacheKey("t2", input(10));
		const cCount = buildSuggestionsCacheKey("t1", input(11));
		const dItems = buildSuggestionsCacheKey("t1", input(10, "Python"));
		setCachedSuggestions(a, ["A"]);
		expect(getCachedSuggestions(bTenant)).toBeNull();
		expect(getCachedSuggestions(cCount)).toBeNull();
		expect(getCachedSuggestions(dItems)).toBeNull();
		expect(getCachedSuggestions(a)).toEqual(["A"]);
	});

	it("set zamiata przeterminowane wpisy innych kluczy (0.15/E1 — brak wiecznego wzrostu)", () => {
		vi.useFakeTimers();
		try {
			const stale = buildSuggestionsCacheKey("t1", input(1));
			setCachedSuggestions(stale, ["stary"]);
			vi.advanceTimersByTime(10 * 60_000 + 1); // stale przeterminowany
			const fresh = buildSuggestionsCacheKey("t1", input(2));
			setCachedSuggestions(fresh, ["nowy"]); // zapis zamiata przeterminowane
			// Sonda rozmiaru — leniwa eksmisja (stary kod) zostawiłaby 2 wpisy w mapie;
			// eksmisja przy set zostawia tylko świeży (własność pamięciowa, nie tylko get).
			expect(suggestionsCacheSize()).toBe(1);
			expect(getCachedSuggestions(stale)).toBeNull();
			expect(getCachedSuggestions(fresh)).toEqual(["nowy"]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("wpis wygasa po TTL (10 min) — leniwa eksmisja", () => {
		vi.useFakeTimers();
		try {
			const key = buildSuggestionsCacheKey("t1", input(1));
			setCachedSuggestions(key, ["x"]);
			vi.advanceTimersByTime(10 * 60_000 - 1);
			expect(getCachedSuggestions(key)).toEqual(["x"]); // tuż przed TTL
			vi.advanceTimersByTime(2);
			expect(getCachedSuggestions(key)).toBeNull(); // po TTL
		} finally {
			vi.useRealTimers();
		}
	});
});
