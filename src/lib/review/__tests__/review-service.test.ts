// ============================================================================
// 1E.4 (SLICE R3) — unit testy warstwy serwisowej powtórek: WYŁĄCZNIE część
// czysta (mapowanie wiersz → ReviewCardState + walidacja fazy). Transakcyjność,
// idempotencja (ON CONFLICT), izolacja owner-side i RLS na ŻYWEJ bazie to
// zadanie Quinn w bramce integracyjnej — tu tylko kontrakt mapera, bez DB.
// ============================================================================

import { describe, expect, it } from "vitest";
import { rowToCardState } from "../review-service";

const DUE = new Date("2026-03-10T00:00:00.000Z");
const LAST = new Date("2026-03-01T00:00:00.000Z");

describe("rowToCardState — wiersz review_states → ReviewCardState (kontrakt mapera)", () => {
	it("mapuje 1:1 legalny wiersz w stanie 'review' (z last_review)", () => {
		const card = rowToCardState({
			stability: 12.5,
			difficulty: 6.3,
			due: DUE,
			lastReview: LAST,
			state: "review",
			reps: 3,
			lapses: 1,
		});
		expect(card).toEqual({
			stability: 12.5,
			difficulty: 6.3,
			due: DUE,
			lastReview: LAST,
			state: "review",
			reps: 3,
			lapses: 1,
		});
	});

	it("zachowuje last_review = null dla świeżej karty 'new'", () => {
		const card = rowToCardState({
			stability: 0.001,
			difficulty: 1,
			due: DUE,
			lastReview: null,
			state: "new",
			reps: 0,
			lapses: 0,
		});
		expect(card.lastReview).toBeNull();
		expect(card.state).toBe("new");
	});

	it("akceptuje wszystkie cztery legalne fazy (parytet z CHECK review_states)", () => {
		for (const state of ["new", "learning", "review", "relearning"] as const) {
			expect(
				rowToCardState({
					stability: 1,
					difficulty: 5,
					due: DUE,
					lastReview: null,
					state,
					reps: 0,
					lapses: 0,
				}).state,
			).toBe(state);
		}
	});

	it("rzuca na nielegalnej fazie (korupcja/dryf CHECK) — nie wpuszcza jej do schedulera", () => {
		expect(() =>
			rowToCardState({
				stability: 1,
				difficulty: 5,
				due: DUE,
				lastReview: null,
				state: "archived",
				reps: 0,
				lapses: 0,
			}),
		).toThrow(/Nielegalna faza/);
	});
});
