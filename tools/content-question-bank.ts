/**
 * A5/1.11 — walidacja struktury banku pytań (czysta logika, bez DB/LLM).
 * Spec: docs/design/skillbridge-a5-bank-pytan-diagnoza-spec-v0.2.md §5.
 *
 * Konsumowane przez:
 *   - tests/unit/a5/question-bank-ds.contract.test.ts (bramka jakości treści),
 *   - tools/ingest-question-bank.ts (walidacja PRZED zapisem do bazy).
 *
 * Twarde reguły partii 1 (ZATWIERDZONE):
 *   - koncept trunk='market' → competencyName = DOKŁADNY liść modelu kariery,
 *   - dokładnie 1 koncept diagnostic=true per liść ścieżki (pokrycie pełne),
 *   - ≥2 warianty per (koncept, trudność 1–3) — 2 podejścia bez powtórek,
 *   - d2/d3 bez single_choice (zgadnięcie `acquired` z p=25%) i bez short_text,
 *   - d1 bez short_text (pułapki odmiany — short_text wraca w 1E.2),
 *   - klucz odpowiedzi samozgodny: zadeklarowana poprawna odpowiedź MUSI
 *     przechodzić przez gradeAnswer (jedno źródło prawdy oceny).
 */

import { gradeAnswer } from "../src/lib/assessment/grade";
import type { QuestionType } from "../src/lib/assessment/types";

export type QuestionItemInput = {
	difficulty: 1 | 2 | 3;
	type: QuestionType;
	stem: string;
	options?: string[];
	answer: Record<string, unknown>;
	explanationMd?: string;
};

export type QuestionConceptInput = {
	slug: string;
	name: string;
	trunk: "market" | "foundations";
	competencyName?: string;
	diagnostic: boolean;
	items: QuestionItemInput[];
};

const CHOICE_TYPES: ReadonlySet<string> = new Set(["single_choice", "multi_choice"]);
/** Typy dozwolone w partii 1 per trudność (spec §2.3 [REV] + §5). */
const ALLOWED_TYPES_BY_DIFFICULTY: Record<1 | 2 | 3, ReadonlySet<string>> = {
	1: new Set(["single_choice", "multi_choice", "numeric"]),
	2: new Set(["multi_choice", "numeric"]),
	3: new Set(["multi_choice", "numeric"]),
};

/** Poprawna odpowiedź wyprowadzona z klucza — do testu samozgodności gradeAnswer. */
export function correctAnswerFor(item: QuestionItemInput): Record<string, unknown> | null {
	switch (item.type) {
		case "single_choice":
			return typeof item.answer.correct === "number" ? { selected: item.answer.correct } : null;
		case "multi_choice":
			return Array.isArray(item.answer.correct) ? { selected: item.answer.correct } : null;
		case "numeric":
			// Polski zapis (przecinek) — dowodzi przy okazji normalizacji grade.ts.
			return typeof item.answer.value === "number"
				? { value: String(item.answer.value).replace(".", ",") }
				: null;
		case "short_text":
			return Array.isArray(item.answer.accepted) && typeof item.answer.accepted[0] === "string"
				? { value: item.answer.accepted[0] }
				: null;
		default:
			return null;
	}
}

/** Walidacja pojedynczego itemu — null gdy OK, opis problemu gdy nie. */
export function validateItemStructure(
	item: QuestionItemInput,
	conceptSlug: string,
	idx: number,
): string | null {
	const where = `koncept "${conceptSlug}" item[${idx}]`;
	if (![1, 2, 3].includes(item.difficulty)) return `${where}: difficulty spoza 1–3`;
	if (!ALLOWED_TYPES_BY_DIFFICULTY[item.difficulty].has(item.type)) {
		return `${where}: typ "${item.type}" niedozwolony na trudności ${item.difficulty} (partia 1)`;
	}
	if (typeof item.stem !== "string" || item.stem.trim().length < 10) {
		return `${where}: stem pusty/za krótki`;
	}
	if (CHOICE_TYPES.has(item.type)) {
		if (!Array.isArray(item.options) || item.options.length < 3 || item.options.length > 6) {
			return `${where}: typy choice wymagają 3–6 opcji`;
		}
		if (new Set(item.options.map((o) => o.trim())).size !== item.options.length) {
			return `${where}: zduplikowane opcje`;
		}
		const max = item.options.length - 1;
		if (item.type === "single_choice") {
			const c = item.answer.correct;
			if (typeof c !== "number" || !Number.isInteger(c) || c < 0 || c > max) {
				return `${where}: answer.correct poza zakresem opcji`;
			}
		} else {
			const c = item.answer.correct;
			if (
				!Array.isArray(c) ||
				c.length < 2 ||
				c.length >= item.options.length ||
				!c.every((i) => Number.isInteger(i) && i >= 0 && i <= max) ||
				new Set(c).size !== c.length
			) {
				return `${where}: multi_choice wymaga 2..(opcje-1) unikalnych indeksów w zakresie`;
			}
		}
	} else {
		if (item.options !== undefined) return `${where}: options tylko dla typów choice`;
		if (item.type === "numeric") {
			const { value, tolerance, relative } = item.answer as {
				value?: unknown;
				tolerance?: unknown;
				relative?: unknown;
			};
			if (typeof value !== "number" || Number.isNaN(value)) return `${where}: numeric bez value`;
			if (typeof tolerance !== "number" || tolerance < 0) {
				return `${where}: numeric bez tolerance >= 0`;
			}
			if (relative !== undefined && typeof relative !== "boolean") {
				return `${where}: relative musi być boolean`;
			}
		}
	}
	// Samozgodność klucza: zadeklarowana poprawna odpowiedź przechodzi grading.
	const correct = correctAnswerFor(item);
	if (!correct || !gradeAnswer(item.type, item.answer, correct)) {
		return `${where}: klucz odpowiedzi nie przechodzi przez gradeAnswer (niesamozgodny)`;
	}
	return null;
}

/** Walidacja konceptu (struktura + pokrycie trudności/wariantów). */
export function validateConceptStructure(
	concept: QuestionConceptInput,
	minVariantsPerDifficulty = 2,
): string[] {
	const problems: string[] = [];
	if (!/^[a-z0-9-]+$/.test(concept.slug))
		problems.push(`slug "${concept.slug}" niezgodny z kebab-case`);
	if (concept.trunk === "market" && !concept.competencyName) {
		problems.push(`koncept "${concept.slug}": trunk='market' wymaga competencyName`);
	}
	const stems = new Set<string>();
	concept.items.forEach((item, idx) => {
		const err = validateItemStructure(item, concept.slug, idx);
		if (err) problems.push(err);
		const stemKey = item.stem.trim().toLowerCase();
		if (stems.has(stemKey))
			problems.push(`koncept "${concept.slug}" item[${idx}]: zduplikowany stem`);
		stems.add(stemKey);
	});
	for (const difficulty of [1, 2, 3] as const) {
		const count = concept.items.filter((i) => i.difficulty === difficulty).length;
		if (count < minVariantsPerDifficulty) {
			problems.push(
				`koncept "${concept.slug}": trudność ${difficulty} ma ${count} wariantów (wymagane >= ${minVariantsPerDifficulty})`,
			);
		}
	}
	return problems;
}
