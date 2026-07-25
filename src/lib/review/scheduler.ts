// ============================================================================
// 1E.4 (SLICE R2) — scheduler powtórek rozłożonych w czasie (FSRS). CZYSTE
// funkcje, 0 DB, 0 LLM, 0 I/O — jak silnik egzaminu 1E.3 (exam.ts/grade.ts).
// Ten plik NIE dotyka bazy ani tras; opakowuje bibliotekę `ts-fsrs` (MIT,
// zero runtime-deps, R1) i wystawia mapowanie sygnału + planowanie jako czyste,
// deterministyczne funkcje. Stan jest WYPROWADZANY (nowy obiekt), nigdy
// mutowany na wejściu — wzorzec `evaluateExamCycle`/`gradeExam`.
//
// JEDNOSTKA = KONCEPT (question_concepts). Bieżący stan planowania trzyma
// review_states (S/D/due/last_review/state/reps/lapses); każda ocena dokłada
// wiersz do review_logs. Ten moduł produkuje oba kształty, warstwa serwisowa
// (R3) zapisuje je w transakcji.
//
// ── DWIE KLUCZOWE DECYZJE KONFIGURACYJNE (wynikają ze schematu R1) ──────────
//
// 1. enable_short_term = FALSE (tryb długoterminowy FSRS).
//    review_states (0042) przechowuje TYLKO stan pamięci długoterminowej
//    (S, D, due, last_review, state, reps, lapses) — NIE ma kolumny
//    `learning_steps` ani `scheduled_days`. Krótkoterminowe kroki nauki
//    (learning_steps: ['1m','10m']) wymagają utrwalenia numeru kroku między
//    powtórkami; bez tej kolumny karta „zawiesza się" w fazie Learning i nigdy
//    nie awansuje (zweryfikowane empirycznie na ts-fsrs 5.4.1). Tryb
//    długoterminowy jest jedyną konfiguracją spójną z utrwalanym stanem:
//    karta przechodzi 'new' → 'review' bezpośrednio, interwały w dniach, a
//    Again na ustalonej karcie zmniejsza stabilność i inkrementuje `lapses`.
//    KONSEKWENCJA / DO POTWIERDZENIA PRZEZ ETHANA (G1): stany 'learning' i
//    'relearning' dozwolone CHECK-iem review_states NIE są w tym trybie
//    produkowane. Jeśli produkt chce wewnątrzdniowych kroków nauki, R1 wymaga
//    kolumny `learning_steps` (+ ewentualnie `scheduled_days`) — poza zakresem R2.
//
// 2. Nowa karta ('new') jest podawana schedulerowi jako S=0 / D=0.
//    ts-fsrs uruchamia inicjalizację (init_stability/init_difficulty) TYLKO gdy
//    difficulty===0 && stability===0. review_states ma jednak CHECK
//    stability > 0 oraz difficulty ∈ [1,10] (NOT NULL) — nie da się zapisać
//    0/0. Rozwiązanie: initCard zapisuje PLACEHOLDER spełniający CHECK, a
//    applyRating wymusza 0/0 dla state==='new' (toCardInput), więc placeholder
//    nigdy nie wpływa na matematykę FSRS.
// ============================================================================

import type { Card, CardInput, Grade, StateType } from "ts-fsrs";
import {
	createEmptyCard,
	dateDiffInDays,
	fsrs,
	generatorParameters,
	Rating,
	S_MIN,
	State,
} from "ts-fsrs";

/** Faza harmonogramu FSRS zapisywana w review_states.state (tekst). */
export type ReviewStateName = "new" | "learning" | "review" | "relearning";

/**
 * Kształt stanu powtórki odpowiadający kolumnom review_states istotnym dla
 * schedulera. Świadomie odseparowany od typu wiersza Drizzle (moduł jest czysty,
 * bez importu DB). Warstwa serwisowa (R3) mapuje wiersz ↔ ReviewCardState.
 */
export interface ReviewCardState {
	/** Stabilność pamięci (dni) — review_states.stability (> 0). */
	stability: number;
	/** Trudność konceptu (skala 1–10) — review_states.difficulty. */
	difficulty: number;
	/** Termin następnej powtórki — review_states.due. */
	due: Date;
	/** Data ostatniej powtórki; NULL = koncept nieoceniony ('new'). */
	lastReview: Date | null;
	/** Faza harmonogramu — review_states.state. */
	state: ReviewStateName;
	/** Liczba powtórek — review_states.reps (>= 0). */
	reps: number;
	/** Liczba wpadek (lapse) — review_states.lapses (>= 0). */
	lapses: number;
}

/**
 * Wiersz do dopisania do review_logs (append-only) przy każdej ocenie.
 * Kolumny mapują 1:1 na schema.ts reviewLogs (bez id/tenant/student/concept/
 * question_item/reviewed_at — te dokłada warstwa serwisowa R3 z kontekstu żądania).
 */
export interface ReviewLogRow {
	/** Ocena FSRS: 1=Again, 2=Hard, 3=Good, 4=Easy. */
	rating: number;
	/** Faza sprzed oceny — review_logs.state_before. */
	stateBefore: ReviewStateName;
	/** Stabilność sprzed oceny; NULL dla pierwszej powtórki konceptu ('new'). */
	stabilityBefore: number | null;
	/** Stabilność po ocenie — review_logs.stability_after. */
	stabilityAfter: number;
	/** Trudność po ocenie — review_logs.difficulty_after. */
	difficultyAfter: number;
	/** Dni od ostatniej powtórki (0 dla pierwszej) — review_logs.elapsed_days (>= 0). */
	elapsedDays: number;
	/** Zaplanowany interwał do następnej powtórki (dni) — review_logs.scheduled_days (>= 0). */
	scheduledDays: number;
}

/** Wynik applyRating: nowy stan karty + wiersz dziennika. */
export interface ApplyRatingResult {
	nextState: ReviewCardState;
	logRow: ReviewLogRow;
}

/**
 * Docelowa retencja (request_retention) — jedno pokrętło biznesowe (plan §5 D2).
 * Start na 90% (rekomendacja Sophii). Zmiana = decyzja produktowa, nie kod.
 */
export const REVIEW_REQUEST_RETENTION = 0.9;

/**
 * Placeholder stabilności nowej karty. review_states ma CHECK stability > 0, a
 * FSRS reprezentuje nową kartę jako S=0. Używamy S_MIN (0.001) — najmniejsza
 * legalna wartość FSRS; applyRating i tak wymusza init 0/0 dla 'new'.
 */
const NEW_CARD_STABILITY_PLACEHOLDER = S_MIN;

/**
 * Placeholder trudności nowej karty. CHECK difficulty ∈ [1,10]; FSRS ma dla
 * nowej karty D=0. 1 = dolny kraniec zakresu, nadpisywany przy pierwszej ocenie.
 */
const NEW_CARD_DIFFICULTY_PLACEHOLDER = 1;

/**
 * Jedna instancja schedulera FSRS na moduł. Bezstanowa między wywołaniami
 * (`next` tworzy własny scheduler per ocena), więc współdzielenie jest bezpieczne
 * i deterministyczne. enable_fuzz=false → te same wejścia dają ten sam wynik.
 * enable_short_term=false → tryb długoterminowy (patrz nagłówek, decyzja 1).
 */
const scheduler = fsrs(
	generatorParameters({
		request_retention: REVIEW_REQUEST_RETENTION,
		enable_fuzz: false,
		enable_short_term: false,
	}),
);

/** Mapa State (enum ts-fsrs) → tekst review_states.state. */
const STATE_ENUM_TO_NAME: Record<State, ReviewStateName> = {
	[State.New]: "new",
	[State.Learning]: "learning",
	[State.Review]: "review",
	[State.Relearning]: "relearning",
};

/** Mapa tekst review_states.state → StateType (ts-fsrs). */
const STATE_NAME_TO_TYPE: Record<ReviewStateName, StateType> = {
	new: "New",
	learning: "Learning",
	review: "Review",
	relearning: "Relearning",
};

/**
 * review_states → CardInput (ts-fsrs). Dla pierwszej powtórki (forceNewInit)
 * wymuszamy S=0/D=0, bo TYLKO wtedy ts-fsrs uruchamia init_stability/
 * init_difficulty. Placeholder z review_states (S_MIN/1) nie może trafić do
 * schedulera — (S_MIN,1) != (0,0) → biblioteka policzyłaby stan z mikroskopijnej
 * stabilności zamiast zainicjalizować kartę.
 */
function toCardInput(state: ReviewCardState, forceNewInit: boolean): CardInput {
	return {
		stability: forceNewInit ? 0 : state.stability,
		difficulty: forceNewInit ? 0 : state.difficulty,
		due: state.due,
		// elapsed_days/scheduled_days przelicza scheduler (z last_review vs now);
		// learning_steps nieużywane w trybie długoterminowym.
		elapsed_days: 0,
		scheduled_days: 0,
		learning_steps: 0,
		reps: state.reps,
		lapses: state.lapses,
		state: forceNewInit ? "New" : STATE_NAME_TO_TYPE[state.state],
		last_review: state.lastReview,
	};
}

/** Card (ts-fsrs, po ocenie) → ReviewCardState do zapisu w review_states. */
function fromCard(card: Card): ReviewCardState {
	return {
		stability: card.stability,
		difficulty: card.difficulty,
		due: card.due,
		lastReview: card.last_review ?? null,
		state: STATE_ENUM_TO_NAME[card.state],
		reps: card.reps,
		lapses: card.lapses,
	};
}

/**
 * Mapuje serwerowy sygnał behawioralny na ocenę FSRS (§1.3 architektury Ethana).
 * ZERO samooceny studenta — sygnał wyłącznie z (poprawność + serwerowy hintDepth
 * + pewność), sedno 1E.4 (§7: ocena formująca, maszyna samowystarczalna).
 *
 * @param isCorrect  Poprawność deterministyczna (grade.ts), NIE deklaracja studenta.
 * @param confidence Pewność sprzed odpowiedzi (MIS.1): 1=zgaduję, 2=chyba, 3=pewny.
 *                   NULL = sonda pewności była OFF (traktowane jak „nie-pewny").
 * @param hintDepth  Serwerowa głębokość drabinki podpowiedzi (#217): 0..3.
 */
export function mapAnswerToRating(
	isCorrect: boolean,
	confidence: number | null,
	hintDepth: number,
): Grade {
	// Wpadka/lapse — brak poprawności to zawsze Again, niezależnie od reszty.
	if (!isCorrect) {
		return Rating.Again;
	}
	// Potrzebował mocnej podpowiedzi (>= 2 poziomy drabinki) → Hard.
	if (hintDepth >= 2) {
		return Rating.Hard;
	}
	// Pewny (confidence===3, MIS.1) i zero podpowiedzi → Easy. confidence===NULL
	// (sonda OFF) NIE kwalifikuje: NULL===3 to false → spada do Good.
	if (confidence === 3 && hintDepth === 0) {
		return Rating.Easy;
	}
	// Pozostałe poprawne → Good (w tym confidence NULL/1/2 oraz hintDepth===1).
	return Rating.Good;
}

/**
 * Stosuje ocenę do bieżącego stanu karty. Zwraca NOWY stan (wejście niemutowane)
 * + wiersz do review_logs. Deterministyczne: te same (state, rating, now) → ten
 * sam wynik. `now` jest parametrem — NIGDY Date.now() wewnątrz.
 */
export function applyRating(state: ReviewCardState, rating: Grade, now: Date): ApplyRatingResult {
	// state==='new' ⟺ koncept nigdy nieoceniony ⟺ pierwsza powtórka (init FSRS).
	const isFirstReview = state.state === "new";
	const { card } = scheduler.next(toCardInput(state, isFirstReview), now, rating);
	// dateDiffInDays = natywny helper FSRS (nie przedawniony) — spójny z tym, co
	// scheduler liczy wewnętrznie. 0 dla pierwszej powtórki (brak last_review).
	const elapsedDays = state.lastReview ? dateDiffInDays(state.lastReview, now) : 0;
	const logRow: ReviewLogRow = {
		rating,
		stateBefore: state.state,
		stabilityBefore: isFirstReview ? null : state.stability,
		stabilityAfter: card.stability,
		difficultyAfter: card.difficulty,
		// Math.max — defensywnie honoruje CHECK-i review_logs (>= 0) przy skoku zegara.
		elapsedDays: Math.max(0, elapsedDays),
		scheduledDays: Math.max(0, card.scheduled_days),
	};
	return { nextState: fromCard(card), logRow };
}

/**
 * Stan początkowy nowej karty do zasiewu przy enrollment (użyje R5). Zwraca kartę
 * 'new' wymagalną od `now` (due===now → wchodzi do kolejki „na dziś").
 *
 * HOOK DLA R5 (sprzężenie z 1E.3, §4 planu — „niższa stabilność dla oblanego"):
 * parametru `initialStabilityBias` ŚWIADOMIE tu nie ma. Bias na stabilności
 * karty 'new' byłby no-op — applyRating wymusza init 0/0, więc pierwsza powtórka
 * i tak nadpisze S przez init_stability(rating). Sprzężenie failedConcepts musi
 * być zrealizowane w R5 inaczej (np. zasiew jako karta po-pierwszej-ocenie
 * 'review' z obniżoną S, przesunięcie `due`, albo niższe request_retention dla
 * takiego konceptu) — to decyzja architektoniczna R5/Ethana, poza zakresem R2.
 */
export function initCard(now: Date): ReviewCardState {
	// createEmptyCard = kanoniczna nowa karta FSRS (S=0, D=0, state=New, reps=0).
	const empty = createEmptyCard(now);
	return {
		...fromCard(empty),
		// Podmiana 0/0 → placeholder spełniający CHECK review_states (patrz nagłówek,
		// decyzja 2). applyRating wymusza init 0/0 dla 'new', więc te wartości nigdy
		// nie wpływają na harmonogram.
		stability: NEW_CARD_STABILITY_PLACEHOLDER,
		difficulty: NEW_CARD_DIFFICULTY_PLACEHOLDER,
	};
}
