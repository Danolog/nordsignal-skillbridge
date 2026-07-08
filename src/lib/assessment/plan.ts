// ============================================================================
// A5/1.11 — deterministyczny plan sesji diagnozy (spec §2.4/§4, ZATWIERDZONE).
//
// Plan liczony przy starcie i MROŻONY w assessment_sessions.plan_json:
//  - wznowienie sesji biegnie na tym samym planie (dodanie wariantu do banku
//    w trakcie sesji niczego nie zmienia),
//  - plan niesie WYŁĄCZNIE item-idy + kolejność/gałęzie (nigdy treść — spec §2.2),
//  - wybór wariantu: fnv1a(sessionSeed:conceptSlug:difficulty) mod N po
//    wariantach w stabilnym ORDER BY id; sól = sessionSeed (nowa sesja → inne
//    warianty; bez soli powtarzalna diagnoza = wyrocznia odpowiedzi),
//  - itemy użyte w poprzednich sesjach studenta wykluczone; gdy wykluczenia
//    zjadły wszystkie warianty (koncept, trudność) — reset wykluczeń (spec §2.4),
//  - kompetencja bez pokrycia (brak aktywnego konceptu diagnostycznego albo
//    dziura w trudnościach) → `uncovered`, jawna degradacja zamiast cichego
//    fallbacku.
// ============================================================================

import { createHash } from "node:crypto";
import { levelFromTrajectory, nextStep } from "./staircase";
import type {
	AssessmentPlan,
	AssessmentResult,
	BankItem,
	Difficulty,
	ExpectedQuestion,
	PlanCompetency,
	TrajectoryStep,
} from "./types";

/** FNV-1a 32-bit — deterministyczny, bez zależności; wystarczający do wyboru wariantu. */
export function fnv1a(input: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash >>> 0;
}

/**
 * Odcisk wejścia sesji (spec §2.5): careerGoal + posortowana lista kompetencji.
 * Mismatch przy wznowieniu (student cofnął się w kreatorze i zmienił
 * zaznaczenia/cel) → sesja abandoned + nowa.
 */
export function computeInputHash(careerGoal: string, competencyNames: readonly string[]): string {
	const canonical = JSON.stringify([careerGoal, [...competencyNames].sort()]);
	return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function pickVariant(
	variants: BankItem[],
	sessionSeed: string,
	conceptSlug: string,
	difficulty: Difficulty,
	excludedItemIds: ReadonlySet<string>,
): string | null {
	if (variants.length === 0) return null;
	// Stabilny porządek niezależny od kolejności zwrotki z DB.
	const ordered = [...variants].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	const fresh = ordered.filter((v) => !excludedItemIds.has(v.id));
	// Wszystkie warianty zużyte w poprzednich sesjach → reset wykluczeń (§2.4).
	const pool = fresh.length > 0 ? fresh : ordered;
	const idx = fnv1a(`${sessionSeed}:${conceptSlug}:${difficulty}`) % pool.length;
	return pool[idx].id;
}

/**
 * buildPlan — deterministyczny plan diagnozy dla listy kompetencji.
 *
 * @param competencyNames  kompetencje do zbadania (Opcja A: zaznaczone przez studenta)
 * @param bank             aktywne itemy aktywnych konceptów diagnostic=true, trunk='market'
 *                         (filtrowanie po stronie zapytania — plan ufa wołającemu)
 * @param sessionSeed      sól planu (id sesji) — nowa sesja → inne warianty
 * @param excludedItemIds  itemy zadane w poprzednich sesjach studenta
 */
export function buildPlan(
	competencyNames: readonly string[],
	bank: readonly BankItem[],
	sessionSeed: string,
	excludedItemIds: ReadonlySet<string> = new Set(),
): AssessmentPlan {
	// Sort — determinizm kolejności zadawania niezależnie od kolejności zaznaczeń.
	const sorted = [...new Set(competencyNames)].sort((a, b) => a.localeCompare(b, "pl"));
	const competencies: PlanCompetency[] = [];
	const uncovered: string[] = [];

	for (const name of sorted) {
		const forCompetency = bank.filter((item) => item.competencyName === name);
		// Reguła wyboru konceptu (spec §2.1 [REV]): partia 1 = dokładnie 1 koncept
		// diagnostyczny per liść; gdyby kiedyś było ich więcej — najmniejszy slug
		// alfabetycznie (deterministycznie, bez zależności od kolejności z DB).
		const conceptSlug = forCompetency.map((i) => i.conceptSlug).sort()[0];
		if (!conceptSlug) {
			uncovered.push(name);
			continue;
		}
		const conceptItems = forCompetency.filter((i) => i.conceptSlug === conceptSlug);
		const picked: Partial<Record<`d${Difficulty}`, string>> = {};
		for (const difficulty of [1, 2, 3] as const) {
			const variants = conceptItems.filter((i) => i.difficulty === difficulty);
			const itemId = pickVariant(variants, sessionSeed, conceptSlug, difficulty, excludedItemIds);
			if (itemId) picked[`d${difficulty}`] = itemId;
		}
		if (picked.d1 && picked.d2 && picked.d3) {
			competencies.push({
				competencyName: name,
				conceptSlug,
				items: { d1: picked.d1, d2: picked.d2, d3: picked.d3 },
			});
		} else {
			// Dziura w pokryciu trudności = brak pełnego staircase → uncovered.
			uncovered.push(name);
		}
	}

	return { schemaVersion: 1, kind: "diagnostic", competencies, uncovered };
}

/** Odpowiedź sesji w kształcie potrzebnym silnikowi (podzbiór assessment_answers). */
export interface SessionAnswer {
	questionItemId: string;
	isCorrect: boolean;
	position: number;
}

/**
 * Trajektorie per kompetencja odtworzone z planu i odpowiedzi (w kolejności
 * position). Odpowiedź spoza planu/kolejności nie może powstać — trasa answer
 * waliduje expectedNext PRZED zapisem — ale funkcja i tak jest defensywna:
 * niezgodny item przerywa odtwarzanie danej kompetencji (trajektoria częściowa
 * → complete ją odrzuci jako null z levelFromTrajectory).
 */
function rebuildTrajectories(
	plan: AssessmentPlan,
	answers: readonly SessionAnswer[],
): Map<string, TrajectoryStep[]> {
	const byPosition = [...answers].sort((a, b) => a.position - b.position);
	const trajectories = new Map<string, TrajectoryStep[]>();
	let cursor = 0;
	for (const comp of plan.competencies) {
		const steps: TrajectoryStep[] = [];
		// Krok 1: zawsze d2.
		const first = byPosition[cursor];
		if (!first || first.questionItemId !== comp.items.d2) {
			trajectories.set(comp.competencyName, steps);
			continue;
		}
		steps.push({ difficulty: 2, correct: first.isCorrect });
		cursor++;
		// Krok 2: gałąź zależna od pierwszej odpowiedzi.
		const expectedSecond = first.isCorrect ? comp.items.d3 : comp.items.d1;
		const second = byPosition[cursor];
		if (second && second.questionItemId === expectedSecond) {
			steps.push({ difficulty: first.isCorrect ? 3 : 1, correct: second.isCorrect });
			cursor++;
		}
		trajectories.set(comp.competencyName, steps);
	}
	return trajectories;
}

/**
 * expectedNext — jedyne legalne następne pytanie sesji (walidacja server-side
 * w trasie answer: item ≠ oczekiwany → 409, bez gradingu). null = wszystkie
 * kompetencje planu domknięte (sesja gotowa do complete).
 */
export function expectedNext(
	plan: AssessmentPlan,
	answers: readonly SessionAnswer[],
): ExpectedQuestion | null {
	const trajectories = rebuildTrajectories(plan, answers);
	let position = 0;
	for (const comp of plan.competencies) {
		const trajectory = trajectories.get(comp.competencyName) ?? [];
		position += trajectory.length;
		const step = nextStep(trajectory);
		if (!step.done) {
			const itemId =
				step.difficulty === 2
					? comp.items.d2
					: step.difficulty === 3
						? comp.items.d3
						: comp.items.d1;
			return {
				competencyName: comp.competencyName,
				conceptSlug: comp.conceptSlug,
				itemId,
				difficulty: step.difficulty,
				position,
			};
		}
	}
	return null;
}

/**
 * computeResult — koperta wyniku (spec §3 [REV]): koncepty = źródło prawdy
 * (placement 1E.7), kompetencje = rollup dla 1.12. null, gdy jakakolwiek
 * kompetencja planu ma niepełną trajektorię (complete przed końcem testu).
 */
export function computeResult(
	plan: AssessmentPlan,
	answers: readonly SessionAnswer[],
): AssessmentResult | null {
	const trajectories = rebuildTrajectories(plan, answers);
	const concepts: AssessmentResult["concepts"] = {};
	const competencies: AssessmentResult["competencies"] = {};
	for (const comp of plan.competencies) {
		const trajectory = trajectories.get(comp.competencyName) ?? [];
		const level = levelFromTrajectory(trajectory);
		if (level === null) return null;
		competencies[comp.competencyName] = level;
		concepts[comp.conceptSlug] = {
			asked: trajectory.length,
			correct: trajectory.filter((s) => s.correct).length,
			level,
		};
	}
	return {
		schemaVersion: 1,
		kind: "diagnostic",
		concepts,
		competencies,
		uncovered: plan.uncovered,
	};
}
