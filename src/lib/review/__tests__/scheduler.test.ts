// ============================================================================
// 1E.4 (SLICE R2) — testy schedulera powtórek (FSRS). CZYSTA logika, bez DB/LLM.
//
// Cel: POKRYCIE NASZEJ LOGIKI (mapowanie sygnału, round-trip stanu, determinizm,
// brak mutacji wejścia), NIE matematyki FSRS — tej ufamy bibliotece `ts-fsrs`
// (ma własny pakiet testów). Asercje na wartości S/D sprawdzają WŁASNOŚCI
// (wzrost/spadek, inkrementacja liczników), nie konkretne stałe algorytmu.
//
// Konfiguracja schedulera (enable_short_term=false) wynika ze schematu R1
// (brak kolumny learning_steps) — patrz nagłówek scheduler.ts. Dlatego karta
// przechodzi 'new' → 'review' bezpośrednio (nie 'learning'), a wpadka na
// ustalonej karcie ('review') inkrementuje lapses i obniża stabilność.
// ============================================================================

import { type Grade, Rating, State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import {
	applyRating,
	initCard,
	mapAnswerToRating,
	type ReviewCardState,
	type ReviewStateName,
	STATE_ENUM_TO_NAME,
} from "../scheduler";

const NOW = new Date("2026-03-01T00:00:00.000Z");

describe("STATE_ENUM_TO_NAME — mapowanie State→tekst jest TOTALNE (defensywnie)", () => {
	// Typ Record<State, ReviewStateName> gwarantuje pokrycie przy kompilacji;
	// ten test dokłada dowód RUNTIME — każdy wariant enuma ts-fsrs mapuje się na
	// zdefiniowaną nazwę, żaden nie wpada w undefined/default. W trybie A biblioteka
	// emituje dziś tylko New/Review, ale Learning/Relearning MUSZĄ być zmapowane
	// pod przyszły tryb short-term (wariant B), inaczej wrapper pęknie po cichu.
	const expectedNames: Record<State, ReviewStateName> = {
		[State.New]: "new",
		[State.Learning]: "learning",
		[State.Review]: "review",
		[State.Relearning]: "relearning",
	};

	// Wszystkie warianty enuma ts-fsrs (numeryczne — enum ma odwrotne mapowanie).
	const stateValues = Object.values(State).filter((v): v is State => typeof v === "number");

	it("pokrywa wszystkie cztery warianty State (New/Learning/Review/Relearning)", () => {
		expect(stateValues).toHaveLength(4);
		expect(Object.keys(STATE_ENUM_TO_NAME)).toHaveLength(4);
	});

	for (const state of stateValues) {
		it(`State.${State[state]} → '${expectedNames[state]}' (zdefiniowane, nie default/undefined)`, () => {
			const mapped = STATE_ENUM_TO_NAME[state];
			expect(mapped).toBeDefined();
			expect(mapped).toBe(expectedNames[state]);
		});
	}

	it("zbiór wartości mapy = dokładnie cztery nazwy faz review_states.state", () => {
		expect(new Set(Object.values(STATE_ENUM_TO_NAME))).toEqual(
			new Set<ReviewStateName>(["new", "learning", "review", "relearning"]),
		);
	});
});

describe("mapAnswerToRating — pełna tabela mapowania sygnału → ocena FSRS", () => {
	// Tabela decyzyjna §1.3 architektury Ethana. Każdy wiersz = jedna gałąź.
	const cases: Array<{
		name: string;
		isCorrect: boolean;
		confidence: number | null;
		hintDepth: number;
		expected: Rating;
	}> = [
		// Niepoprawnie → zawsze Again, niezależnie od confidence/hintDepth.
		{
			name: "błąd, pewny, bez hintu → Again",
			isCorrect: false,
			confidence: 3,
			hintDepth: 0,
			expected: Rating.Again,
		},
		{
			name: "błąd, niepewny, głęboki hint → Again",
			isCorrect: false,
			confidence: 1,
			hintDepth: 3,
			expected: Rating.Again,
		},
		{
			name: "błąd, confidence NULL → Again",
			isCorrect: false,
			confidence: null,
			hintDepth: 0,
			expected: Rating.Again,
		},
		// Poprawnie + pewny (3) + zero hintu → Easy.
		{
			name: "ok, pewny, bez hintu → Easy",
			isCorrect: true,
			confidence: 3,
			hintDepth: 0,
			expected: Rating.Easy,
		},
		// Poprawnie + mocny hint (>=2) → Hard (nawet jeśli pewny — hint bije Easy).
		{
			name: "ok, hint=2 → Hard",
			isCorrect: true,
			confidence: 2,
			hintDepth: 2,
			expected: Rating.Hard,
		},
		{
			name: "ok, hint=3 → Hard",
			isCorrect: true,
			confidence: 1,
			hintDepth: 3,
			expected: Rating.Hard,
		},
		{
			name: "ok, pewny ale hint=2 → Hard (nie Easy)",
			isCorrect: true,
			confidence: 3,
			hintDepth: 2,
			expected: Rating.Hard,
		},
		// Poprawnie, reszta → Good.
		{
			name: "ok, niepewny, bez hintu → Good",
			isCorrect: true,
			confidence: 2,
			hintDepth: 0,
			expected: Rating.Good,
		},
		{
			name: "ok, zgaduję, bez hintu → Good",
			isCorrect: true,
			confidence: 1,
			hintDepth: 0,
			expected: Rating.Good,
		},
		{
			name: "ok, pewny, hint=1 → Good (hint<2, ale nie 0 → nie Easy)",
			isCorrect: true,
			confidence: 3,
			hintDepth: 1,
			expected: Rating.Good,
		},
		// confidence === NULL (sonda pewności OFF): traktowany jak „nie-pewny".
		{
			name: "ok, confidence NULL, bez hintu → Good (nie Easy)",
			isCorrect: true,
			confidence: null,
			hintDepth: 0,
			expected: Rating.Good,
		},
		{
			name: "ok, confidence NULL, hint=1 → Good",
			isCorrect: true,
			confidence: null,
			hintDepth: 1,
			expected: Rating.Good,
		},
		{
			name: "ok, confidence NULL, hint=2 → Hard",
			isCorrect: true,
			confidence: null,
			hintDepth: 2,
			expected: Rating.Hard,
		},
	];

	for (const c of cases) {
		it(c.name, () => {
			expect(mapAnswerToRating(c.isCorrect, c.confidence, c.hintDepth)).toBe(c.expected);
		});
	}

	it("confidence NULL nigdy nie kwalifikuje do Easy (jawnie, nie wywala)", () => {
		// Jedyna droga do Easy to confidence===3; NULL musi bezpiecznie spaść do Good.
		expect(mapAnswerToRating(true, null, 0)).not.toBe(Rating.Easy);
		expect(mapAnswerToRating(true, null, 0)).toBe(Rating.Good);
	});
});

describe("initCard — stan początkowy nowej karty", () => {
	it("zwraca kartę 'new' wymagalną od now, reps/lapses = 0", () => {
		const card = initCard(NOW);
		expect(card.state).toBe("new");
		expect(card.due.getTime()).toBe(NOW.getTime());
		expect(card.lastReview).toBeNull();
		expect(card.reps).toBe(0);
		expect(card.lapses).toBe(0);
	});

	it("placeholder S/D spełnia CHECK review_states (stability > 0, difficulty ∈ [1,10])", () => {
		const card = initCard(NOW);
		expect(card.stability).toBeGreaterThan(0);
		expect(card.difficulty).toBeGreaterThanOrEqual(1);
		expect(card.difficulty).toBeLessThanOrEqual(10);
	});
});

describe("applyRating — pierwsza powtórka (init) ignoruje placeholder S/D", () => {
	it("Good na nowej karcie: init przez FSRS (S nadpisane, nie z placeholdera), state → review, reps → 1", () => {
		const state = initCard(NOW);
		const { nextState, logRow } = applyRating(state, Rating.Good, NOW);
		// Placeholder stability to S_MIN (0.001); init_stability(Good) jest o rzędy
		// wielkości większe — dowód, że wymuszenie 0/0 zadziałało.
		expect(nextState.stability).toBeGreaterThan(1);
		expect(nextState.state).toBe("review");
		expect(nextState.reps).toBe(1);
		expect(nextState.lapses).toBe(0);
		expect(nextState.due.getTime()).toBeGreaterThan(NOW.getTime());
		// Pierwsza powtórka: stability_before = NULL (brak stanu sprzed).
		expect(logRow.stateBefore).toBe("new");
		expect(logRow.stabilityBefore).toBeNull();
		expect(logRow.stabilityAfter).toBe(nextState.stability);
		expect(logRow.elapsedDays).toBe(0);
		expect(logRow.rating).toBe(Rating.Good);
	});

	it("Easy daje wyższą stabilność początkową niż Good (własność, nie stała)", () => {
		const easy = applyRating(initCard(NOW), Rating.Easy, NOW).nextState;
		const good = applyRating(initCard(NOW), Rating.Good, NOW).nextState;
		expect(easy.stability).toBeGreaterThan(good.stability);
	});

	it("Again na nowej karcie: init, ale bez lapse (nie było czego zapomnieć)", () => {
		const { nextState, logRow } = applyRating(initCard(NOW), Rating.Again, NOW);
		expect(nextState.reps).toBe(1);
		expect(nextState.lapses).toBe(0);
		expect(logRow.stabilityBefore).toBeNull();
	});

	it("logRow spełnia CHECK-i review_logs (0042) — kontrakt dziennika audytowego", () => {
		// Każda gałąź oceny musi wyprodukować wiersz przechodzący CHECK-i:
		// rating ∈ [1,4], stability_after > 0, difficulty_after ∈ [1,10],
		// elapsed_days >= 0, scheduled_days >= 0. Zapis owner-side (R3) polega na tym.
		const grades: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];
		for (const rating of grades) {
			const { logRow } = applyRating(initCard(NOW), rating, NOW);
			expect(logRow.rating).toBeGreaterThanOrEqual(1);
			expect(logRow.rating).toBeLessThanOrEqual(4);
			expect(logRow.stabilityAfter).toBeGreaterThan(0);
			expect(logRow.difficultyAfter).toBeGreaterThanOrEqual(1);
			expect(logRow.difficultyAfter).toBeLessThanOrEqual(10);
			expect(logRow.elapsedDays).toBeGreaterThanOrEqual(0);
			expect(logRow.scheduledDays).toBeGreaterThanOrEqual(0);
		}
	});

	it("nextState spełnia CHECK-i review_states (0042) po pierwszej ocenie", () => {
		// stability > 0, difficulty ∈ [1,10], reps/lapses >= 0 — stan zapisywalny.
		const grades: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];
		for (const rating of grades) {
			const { nextState } = applyRating(initCard(NOW), rating, NOW);
			expect(nextState.stability).toBeGreaterThan(0);
			expect(nextState.difficulty).toBeGreaterThanOrEqual(1);
			expect(nextState.difficulty).toBeLessThanOrEqual(10);
			expect(nextState.reps).toBeGreaterThanOrEqual(0);
			expect(nextState.lapses).toBeGreaterThanOrEqual(0);
		}
	});
});

describe("applyRating — przejścia na ustalonej karcie (review)", () => {
	// Karta po pierwszej ocenie Good (stan 'review'), przegląd po terminie.
	function establishedCard(): { state: ReviewCardState; reviewAt: Date } {
		const first = applyRating(initCard(NOW), Rating.Good, NOW).nextState;
		return { state: first, reviewAt: first.due };
	}

	it("poprawka (Good) w terminie → wzrost stabilności, reps++", () => {
		const { state, reviewAt } = establishedCard();
		const { nextState, logRow } = applyRating(state, Rating.Good, reviewAt);
		expect(nextState.stability).toBeGreaterThan(state.stability);
		expect(nextState.reps).toBe(state.reps + 1);
		expect(logRow.stateBefore).toBe("review");
		// Nie-pierwsza powtórka: stability_before = stan sprzed (nie NULL).
		expect(logRow.stabilityBefore).toBe(state.stability);
		expect(logRow.elapsedDays).toBeGreaterThan(0);
		expect(logRow.scheduledDays).toBeGreaterThan(0);
	});

	it("wpadka (Again) na ustalonej karcie → lapses++ oraz spadek stabilności", () => {
		const { state, reviewAt } = establishedCard();
		const { nextState, logRow } = applyRating(state, Rating.Again, reviewAt);
		expect(nextState.lapses).toBe(state.lapses + 1);
		expect(nextState.stability).toBeLessThan(state.stability);
		expect(logRow.rating).toBe(Rating.Again);
		expect(logRow.stabilityBefore).toBe(state.stability);
	});
});

describe("determinizm — te same wejścia dają ten sam wynik", () => {
	it("dwa wywołania applyRating(state, rating, now) są identyczne", () => {
		const a = applyRating(initCard(NOW), Rating.Good, NOW);
		const b = applyRating(initCard(NOW), Rating.Good, NOW);
		expect(a.nextState).toEqual(b.nextState);
		expect(a.logRow).toEqual(b.logRow);
	});

	it("brak fuzz: due jest powtarzalne co do milisekundy", () => {
		const a = applyRating(initCard(NOW), Rating.Good, NOW).nextState;
		const b = applyRating(initCard(NOW), Rating.Good, NOW).nextState;
		expect(a.due.getTime()).toBe(b.due.getTime());
	});
});

describe("brak mutacji wejścia — stan wyprowadzany, nie modyfikowany w miejscu", () => {
	it("applyRating nie mutuje przekazanego obiektu stanu (zamrożony input)", () => {
		const state = Object.freeze(initCard(NOW)) as ReviewCardState;
		// Gdyby scheduler mutował wejście, Object.freeze rzuciłby w trybie strict
		// albo poniższy snapshot by się rozjechał.
		const snapshot = JSON.stringify(state);
		expect(() => applyRating(state, Rating.Good, NOW)).not.toThrow();
		expect(JSON.stringify(state)).toBe(snapshot);
	});

	it("nextState to nowy obiekt, nie referencja do wejścia", () => {
		const state = initCard(NOW);
		const { nextState } = applyRating(state, Rating.Good, NOW);
		expect(nextState).not.toBe(state);
	});
});
