// ============================================================================
// 1E.3 (ADR-014 D3) — silnik egzaminu modułowego (mastery gate). CZYSTE funkcje,
// 0 LLM, 0 kosztu — jak diagnoza A5 (grade.ts/plan.ts). Ten plik NIE dotyka DB
// ani tras; wystawia plan, wybór wariantu i ocenę jako czyste funkcje.
//
// RÓŻNICA vs diagnoza: egzamin jest LINIOWY (wszystkie pytania w kolejności, bez
// staircase d2→d3/d1) i BRAMKUJE (próg = licznik błędów z examConfigJson, nie
// poziom 1–4). Każde „miejsce" egzaminu (slot E1..E15 dla F1) ma 2 warianty
// izomorficzne A/B (cap 2, ADR D1): 1. podejście dostaje jeden wariant, retry
// (P4) DRUGI. Wybór wariantu deterministyczny (FNV-1a, sól = seed sesji —
// wzorzec plan.ts: bez soli powtarzalny egzamin = wyrocznia odpowiedzi).
//
// GRANICA BEZPIECZEŃSTWA: pola `correct`/`stem`/`options` żyją WYŁĄCZNIE w
// ExamBank ładowanym owner-side. Zamrożony plan (plan_json w assessment_sessions,
// na który student MA SELECT) niesie TYLKO referencje wariantów — nigdy klucza
// ani treści. Serwowanie pytania strippuje `correct` (exam-service.ts).
// ============================================================================

import type { CorrectivesPackage } from "./correctives";
import { fnv1a } from "./plan";

/** Cap wariantów = cap podejść (ADR D1: 2 warianty izomorficzne A/B). */
export const EXAM_MAX_ATTEMPTS = 2;

/**
 * Jeden wariant pytania egzaminacyjnego — pełny (z kluczem). Żyje w ExamBank
 * ładowanym owner-side; NIGDY nie trafia do plan_json ani do klienta w całości.
 */
export interface ExamVariant {
	/** Globalny stabilny ref wariantu (np. "f1-e1-a") — klucz w plan_json. */
	ref: string;
	/** Etykieta wariantu izomorficznego (A/B — cap 2). */
	variant: string;
	/**
	 * UUID wiersza `question_items` (po ingeście) — nośnik `assessment_answers.
	 * question_item_id` (FK). Opcjonalny: bank syntetyczny/przed-ingestowy go nie
	 * ma (trasy nie wstawiają wtedy odpowiedzi — flaga OFF = 404).
	 */
	itemId?: string;
	stem: string;
	/** Opcje single_choice (indeksowane od 0). */
	options: string[];
	/** Indeks poprawnej opcji — SERWEROWY, nigdy w payloadzie do klienta. */
	correct: number;
	/** Kondensat feedbacku studenta (D3) — pokazywany dopiero po ocenie. */
	feedbackMd: string;
}

/** „Miejsce" egzaminu (slot E1..E15) = koncept + warianty izomorficzne A/B. */
export interface ExamSlot {
	/** Ref slotu (np. "e1") — stabilny, steruje kolejnością i correctives. */
	slotRef: string;
	/** Koncept slotu — steruje correctives (P4: błąd → koncept → atomy). */
	conceptSlug: string;
	/** Warianty izomorficzne (dokładnie EXAM_MAX_ATTEMPTS = 2: A, B). */
	variants: ExamVariant[];
}

/** Bank egzaminacyjny jednego modułu (F1: 15 slotów × 2 warianty). */
export interface ExamBank {
	moduleSlug: string;
	slots: ExamSlot[];
}

/**
 * Pozycja zamrożonego planu — TYLKO referencje (bez klucza/treści). To trafia do
 * assessment_sessions.plan_json, na który student ma SELECT: żadnego `correct`,
 * `stem` ani `options`. Serwer resolvuje `variantRef` → ExamBank owner-side.
 */
export interface ExamPlanItem {
	slotRef: string;
	conceptSlug: string;
	variantRef: string;
	/** Pozycja 0-based w sekwencji odpowiedzi (assessment_answers.position). */
	position: number;
}

/** Zamrożony plan egzaminu (assessment_sessions.plan_json). */
export interface ExamPlan {
	schemaVersion: 1;
	kind: "module_exam";
	moduleSlug: string;
	/** Numer podejścia (1 = pierwsze, 2 = retry; cap EXAM_MAX_ATTEMPTS). */
	attempt: number;
	/** Parametry z curriculum_modules.exam_config_json (zamrożone przy starcie). */
	questionCount: number;
	maxErrors: number;
	/** Pozycje w kolejności zadawania (posortowane po slotRef — determinizm). */
	items: ExamPlanItem[];
}

/** Odpowiedź sesji w kształcie potrzebnym silnikowi (podzbiór assessment_answers). */
export interface ExamSessionAnswer {
	position: number;
	isCorrect: boolean;
}

/**
 * Koperta wyniku egzaminu (assessment_sessions.result_json). Werdykt = licznik
 * błędów vs maxErrors (nie procent — M10). `failedConcepts` i `correctives` to
 * WSAD dla P4 (tu tylko sygnał — mechanizm remediacji buduje P4).
 */
export interface ExamOutcome {
	schemaVersion: 1;
	kind: "module_exam";
	questionCount: number;
	maxErrors: number;
	correctCount: number;
	errorCount: number;
	/** Werdykt bramki: errorCount ≤ maxErrors. */
	passed: boolean;
	attempt: number;
	/** Koncepty z BŁĘDNYCH slotów (distinct) — correctives P4. */
	failedConcepts: string[];
	/**
	 * Sygnał „uruchom correctives" = oblany po wyczerpaniu podejść (attempt ≥
	 * EXAM_MAX_ATTEMPTS i !passed). Flaga werdyktu (0 DB); paczkę atomów dokłada
	 * P4 owner-side (ExamResultJson.correctivesPackage) — patrz niżej.
	 */
	correctives: boolean;
}

/**
 * Koperta zapisywana do assessment_sessions.result_json — werdykt (ExamOutcome,
 * 0 DB) PLUS opcjonalna paczka correctives (P4, budowana owner-side z banku
 * koncept↔atom). `correctivesPackage` istnieje WYŁĄCZNIE gdy `correctives===true`
 * (oblany po cap 2); przy zdanym/retry przed cap 2 pole jest nieobecne.
 */
export interface ExamResultJson extends ExamOutcome {
	correctivesPackage?: CorrectivesPackage;
}

/** Slot w kształcie wystarczającym do zbudowania planu (bez treści wariantów). */
type PlannableSlot = Pick<ExamSlot, "slotRef" | "conceptSlug"> & {
	variants: readonly Pick<ExamVariant, "ref" | "variant">[];
};

/**
 * Sloty posortowane po slotRef — determinizm kolejności niezależny od DB/parsera.
 * Porównanie NUMERYCZNE (e1 < e2 < … < e10 < e15), nie leksykalne (które dałoby
 * e1, e10, e11…, e2 — mylące dla studenta i dla correctives).
 */
function orderedSlots<T extends { slotRef: string }>(slots: readonly T[]): T[] {
	return [...slots].sort((a, b) => a.slotRef.localeCompare(b.slotRef, "en", { numeric: true }));
}

/** Podejście przycięte do [1, EXAM_MAX_ATTEMPTS] — cap 2 (retry nie tworzy 3. wariantu). */
export function clampAttempt(attempt: number): number {
	if (!Number.isFinite(attempt) || attempt < 1) return 1;
	return Math.min(Math.floor(attempt), EXAM_MAX_ATTEMPTS);
}

/**
 * pickExamVariant — deterministyczny wybór wariantu dla slotu i podejścia.
 *
 * Warianty w stabilnym porządku (po etykiecie A/B). FNV-1a(seed:slot) rotuje
 * START (sól = seed sesji: dwie sesje tego samego studenta nie dają zawsze „A"
 * na 1. podejściu — anty-wyrocznia, jak plan.ts). Kolejne podejście bierze
 * NASTĘPNY wariant (retry = DRUGI wariant, ADR D1). Przy 2 wariantach: podejście
 * 1 i 2 wyczerpują {A, B} w kolejności zależnej od seeda — cap 2 gwarantowany
 * przez `clampAttempt` po stronie wołającego (attempt ∈ {1,2}).
 */
export function pickExamVariant<V extends Pick<ExamVariant, "ref" | "variant">>(
	variants: readonly V[],
	sessionSeed: string,
	slotRef: string,
	attempt: number,
): V | null {
	if (variants.length === 0) return null;
	const ordered = [...variants].sort((a, b) =>
		a.variant < b.variant ? -1 : a.variant > b.variant ? 1 : 0,
	);
	const start = fnv1a(`${sessionSeed}:${slotRef}`) % ordered.length;
	const idx = (start + (clampAttempt(attempt) - 1)) % ordered.length;
	return ordered[idx];
}

/**
 * buildExamPlan — deterministyczny, LINIOWY plan egzaminu. Jeden slot = jedna
 * pozycja; wariant wybrany przez pickExamVariant (sól = sessionSeed, offset =
 * attempt). Plan niesie TYLKO referencje (variantRef) — zero treści/klucza.
 *
 * @param bank         bank egzaminacyjny modułu (owner-side)
 * @param config       parametry z exam_config_json (questionCount, maxErrors)
 * @param sessionSeed  sól planu (id sesji) — anty-wyrocznia wyboru wariantu
 * @param attempt      numer podejścia (1/2 — cap EXAM_MAX_ATTEMPTS)
 */
export function buildExamPlan(
	bank: { moduleSlug: string; slots: readonly PlannableSlot[] },
	config: { questionCount: number; maxErrors: number },
	sessionSeed: string,
	attempt = 1,
): ExamPlan {
	const clamped = clampAttempt(attempt);
	const items: ExamPlanItem[] = [];
	orderedSlots(bank.slots).forEach((slot, position) => {
		const picked = pickExamVariant(slot.variants, sessionSeed, slot.slotRef, clamped);
		if (!picked) return; // slot bez wariantów — pomijamy (walidator banku to złapie wcześniej)
		items.push({
			slotRef: slot.slotRef,
			conceptSlug: slot.conceptSlug,
			variantRef: picked.ref,
			position,
		});
	});
	return {
		schemaVersion: 1,
		kind: "module_exam",
		moduleSlug: bank.moduleSlug,
		attempt: clamped,
		questionCount: config.questionCount,
		maxErrors: config.maxErrors,
		items,
	};
}

/** Pytanie egzaminu w kształcie dla klienta — stem + opcje, ZERO klucza/feedbacku. */
export interface ExamQuestionPayload {
	slotRef: string;
	stem: string;
	options: string[];
	/** Pozycja 0-based + łączna liczba pytań (pasek postępu). */
	position: number;
	total: number;
}

/**
 * Payload pytania — jawnie WYPISUJE dozwolone pola (nie spread wariantu), żeby
 * `correct`/`feedbackMd` nie wyciekły przez przypadkowy spread. Odpowiednik
 * buildQuestionPayload diagnozy: klucz nigdy nie opuszcza serwera.
 */
export function buildExamQuestionPayload(
	variant: ExamVariant,
	slotRef: string,
	position: number,
	total: number,
): ExamQuestionPayload {
	return { slotRef, stem: variant.stem, options: variant.options, position, total };
}

/** Rozwiązanie variantRef → wariant banku (owner-side; grading i serwowanie). */
export function resolveVariant(bank: ExamBank, variantRef: string): ExamVariant | null {
	for (const slot of bank.slots) {
		for (const v of slot.variants) {
			if (v.ref === variantRef) return v;
		}
	}
	return null;
}

/** Oczekiwana następna pozycja egzaminu (liniowo): pierwsza bez odpowiedzi. null = komplet. */
export function expectedExamPosition(
	plan: ExamPlan,
	answers: readonly ExamSessionAnswer[],
): ExamPlanItem | null {
	const answered = new Set(answers.map((a) => a.position));
	for (const item of [...plan.items].sort((a, b) => a.position - b.position)) {
		if (!answered.has(item.position)) return item;
	}
	return null;
}

/**
 * gradeExam — werdykt egzaminu (0 LLM). null, gdy egzamin NIEUKOŃCZONY (liczba
 * odpowiedzi < liczba pozycji planu) — complete odrzuci jako 422, nie zgaduje.
 *
 * Werdykt: errorCount = liczba błędnych; passed ⇔ errorCount ≤ maxErrors
 * (licznik, nie procent — M10). failedConcepts = koncepty błędnych slotów
 * (distinct, stabilna kolejność). correctives = oblany po wyczerpaniu podejść.
 */
export function gradeExam(
	plan: ExamPlan,
	answers: readonly ExamSessionAnswer[],
): ExamOutcome | null {
	if (answers.length < plan.items.length) return null;
	const byPosition = new Map(answers.map((a) => [a.position, a.isCorrect]));
	const failedConcepts: string[] = [];
	const seen = new Set<string>();
	let correctCount = 0;
	for (const item of plan.items) {
		const isCorrect = byPosition.get(item.position);
		if (isCorrect === undefined) return null; // dziura w pokryciu odpowiedzi
		if (isCorrect) {
			correctCount++;
		} else if (!seen.has(item.conceptSlug)) {
			seen.add(item.conceptSlug);
			failedConcepts.push(item.conceptSlug);
		}
	}
	const errorCount = plan.items.length - correctCount;
	const passed = errorCount <= plan.maxErrors;
	return {
		schemaVersion: 1,
		kind: "module_exam",
		questionCount: plan.questionCount,
		maxErrors: plan.maxErrors,
		correctCount,
		errorCount,
		passed,
		attempt: plan.attempt,
		failedConcepts,
		correctives: !passed && plan.attempt >= EXAM_MAX_ATTEMPTS,
	};
}
