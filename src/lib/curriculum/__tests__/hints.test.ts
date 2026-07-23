// ADR-018 — schemat drabinki podpowiedzi (unit, bez bazy):
//  • W-2 — znacznik serwerowy: UTC, pełne sekundy, bez milisekund/offsetu,
//  • W-3 / A2 — zamknięty kształt (`.strict()`) + niezmiennik `at.length <= d`,
//    z JAWNYM rozróżnieniem: zapis pilnuje niezmiennika, przycięcie retencyjne
//    (`d=3, at=[1 wpis]`) NIE jest awarią.

import { describe, expect, it } from "vitest";
import { HintsRevealedSchema, MAX_HINT_DEPTH, serverHintTimestamp } from "@/lib/curriculum/hints";

const W2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
// Prawidłowy UUID v4 (wariant RFC) — z.uuid() w Zod v4 egzekwuje nibble wersji
// i wariantu; prawdziwe question_item_id z gen_random_uuid() są v4.
const QID = "11111111-1111-4111-8111-111111111111";
const T1 = "2026-07-22T14:03:07Z";
const T2 = "2026-07-22T14:05:10Z";

describe("serverHintTimestamp (W-2)", () => {
	it("UTC, pełne sekundy, bez milisekund — pasuje do wzorca, nie do długości", () => {
		// Data z milisekundami: helper musi je uciąć.
		const ts = serverHintTimestamp(new Date("2026-07-22T14:03:07.123Z"));
		expect(ts).toMatch(W2);
		expect(ts).toBe("2026-07-22T14:03:07Z");
	});

	it("bieżący czas też pasuje do wzorca (bez milisekund)", () => {
		expect(serverHintTimestamp()).toMatch(W2);
	});
});

describe("HintsRevealedSchema — niezmiennik at.length <= d (A2 / W-3)", () => {
	it("{d:1, at:[t1,t2]} → RZUCA (przy zapisie obowiązuje równość, nadmiar wpisów nielegalny)", () => {
		expect(() => HintsRevealedSchema.parse({ [QID]: { d: 1, at: [T1, T2] } })).toThrow();
	});

	it("{d:3, at:[t1]} → PRZECHODZI (stan po przycięciu retencyjnym, NIE awaria)", () => {
		expect(() => HintsRevealedSchema.parse({ [QID]: { d: 3, at: [T1] } })).not.toThrow();
	});

	it("{d:3, at:[]} → PRZECHODZI (wszystkie znaczniki przycięte, d zostaje)", () => {
		expect(() => HintsRevealedSchema.parse({ [QID]: { d: 3, at: [] } })).not.toThrow();
	});

	it("równość przy zapisie: {d:2, at:[t1,t2]} → PRZECHODZI", () => {
		const parsed = HintsRevealedSchema.parse({ [QID]: { d: 2, at: [T1, T2] } });
		expect(parsed[QID]).toEqual({ d: 2, at: [T1, T2] });
	});
});

describe("HintsRevealedSchema — kształt zamknięty (W-3)", () => {
	it("dodatkowy klucz w wpisie (ua/ip/sessionId) → RZUCA (`.strict()`, nie ciche odcięcie)", () => {
		expect(() => HintsRevealedSchema.parse({ [QID]: { d: 1, at: [T1], ua: "Mozilla" } })).toThrow();
	});

	it("znacznik z milisekundami/offsetem → RZUCA (precyzja jest częścią zakresu, W-2)", () => {
		expect(() =>
			HintsRevealedSchema.parse({ [QID]: { d: 1, at: ["2026-07-22T14:03:07.123Z"] } }),
		).toThrow();
	});

	it(`at powyżej ${MAX_HINT_DEPTH} wpisów → RZUCA (.max(3))`, () => {
		expect(() => HintsRevealedSchema.parse({ [QID]: { d: 3, at: [T1, T2, T1, T2] } })).toThrow();
	});

	it("d > 3 → RZUCA (.max(3))", () => {
		expect(() => HintsRevealedSchema.parse({ [QID]: { d: 4, at: [T1] } })).toThrow();
	});

	it("pusta mapa {} → PRZECHODZI (brak przyznań)", () => {
		expect(HintsRevealedSchema.parse({})).toEqual({});
	});
});
