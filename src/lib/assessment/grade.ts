// ============================================================================
// A5/1.11 — deterministyczny grading odpowiedzi (0 LLM, koszt ~0).
// Spec §2.3: cztery typy o jednoznacznych odpowiedziach; grading to czysta
// funkcja — ten sam moduł obsłuży autograding fundamentów 1E.2 (dowód DoD
// „poprawna/niepoprawna/brzegowa" w testach jednostkowych już teraz).
//
// Zasada fail-closed: odpowiedź w złym kształcie (klient wysłał śmieci,
// klucz banku uszkodzony) = NIEPOPRAWNA, nigdy wyjątek w stronę studenta.
// ============================================================================

import type { QuestionType, StudentAnswer } from "./types";

/**
 * Normalizacja liczby w polskim zapisie: „3,14" → 3.14, „1 000 000" → 1000000
 * (spacje zwykłe, niełamliwe i wąskie jako separatory tysięcy). Zwraca NaN,
 * gdy po normalizacji tekst nie jest pojedynczą liczbą.
 */
export function parsePolishNumber(raw: string): number {
	const normalized = raw
		.trim()
		.replace(/[\s  ]/g, "")
		.replace(",", ".");
	if (normalized === "" || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(normalized)) {
		return Number.NaN;
	}
	return Number(normalized);
}

/**
 * Normalizacja krótkiej odpowiedzi tekstowej (spec §2.3 [REV]): trim, lower,
 * zdjęcie diakrytyków (NFD + ręcznie ł/Ł — NFD ich nie rozkłada), usunięcie
 * interpunkcji, zwinięcie białych znaków. Ta sama funkcja normalizuje wpis
 * studenta i listę `accepted` — kurator nie musi pamiętać o wariantach zapisu.
 */
export function normalizeShortText(raw: string): string {
	return (
		raw
			.trim()
			.toLowerCase()
			.replace(/ł/g, "l")
			.normalize("NFD")
			// Combining marks po NFD (jawne escape'y — bez gołych znaków łączących w źródle).
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[.,;:!?()"'`_-]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
	);
}

function isIndexArray(value: unknown): value is number[] {
	return (
		Array.isArray(value) &&
		value.every((v) => Number.isInteger(v) && v >= 0) &&
		// Duplikaty = zniekształcone wejście (uczciwy klient ich nie wyśle) → fail-closed.
		new Set(value).size === value.length
	);
}

/**
 * gradeAnswer — jedyny punkt prawdy oceny odpowiedzi.
 *
 * @param type       typ pytania (question_items.type)
 * @param answerKey  klucz z banku (question_items.answer_json) — nieznany kształt
 *                   traktujemy defensywnie (uszkodzony klucz → false, nie wyjątek)
 * @param answer     odpowiedź studenta (assessment_answers.answer_json)
 */
export function gradeAnswer(type: QuestionType, answerKey: unknown, answer: unknown): boolean {
	if (typeof answerKey !== "object" || answerKey === null) return false;
	if (typeof answer !== "object" || answer === null) return false;
	const key = answerKey as Record<string, unknown>;
	const given = answer as Partial<Record<keyof StudentAnswer, unknown>> & Record<string, unknown>;

	switch (type) {
		case "single_choice": {
			if (!Number.isInteger(key.correct)) return false;
			return given.selected === key.correct;
		}
		case "multi_choice": {
			if (!isIndexArray(key.correct)) return false;
			if (!isIndexArray(given.selected)) return false;
			const expected = new Set(key.correct);
			const got = new Set(given.selected);
			if (expected.size !== got.size) return false;
			for (const idx of expected) {
				if (!got.has(idx)) return false;
			}
			return true;
		}
		case "numeric": {
			if (typeof key.value !== "number" || typeof key.tolerance !== "number") return false;
			if (typeof given.value !== "string") return false;
			const parsed = parsePolishNumber(given.value);
			if (Number.isNaN(parsed)) return false;
			const bound =
				key.relative === true ? Math.abs(key.tolerance * key.value) : Math.abs(key.tolerance);
			return Math.abs(parsed - key.value) <= bound;
		}
		case "short_text": {
			if (!Array.isArray(key.accepted)) return false;
			if (typeof given.value !== "string") return false;
			const normalized = normalizeShortText(given.value);
			if (normalized === "") return false;
			return key.accepted.some(
				(candidate) =>
					typeof candidate === "string" && normalizeShortText(candidate) === normalized,
			);
		}
		default:
			return false;
	}
}
