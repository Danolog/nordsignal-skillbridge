/**
 * 1E.2 — walidacja struktury treści atomów curriculum (czysta logika, bez DB).
 * Format: docs/design/curriculum-atomy-format-spec-v0.1.md + odchylenia v0.2
 * ustalone przy pakowaniu treści Sophii (drabinka hintów PER ATOM w
 * configJson.hints — tak napisana jest treść; feedback per opcja w
 * optionFeedback; pozycje „przegląd przed egzaminem" przez questionRefs).
 *
 * Konsumowane przez:
 *   - tests/unit/ds/curriculum-atoms.contract.test.ts (bramka jakości treści),
 *   - tools/ingest-curriculum.ts (walidacja PRZED zapisem do bazy).
 *
 * Twarde reguły (ADR-014 D1/D5 + decyzje Darka pkt 6/13):
 *   - atom exercise/theory: DOKŁADNIE 3 pytania (albo questionRefs dla pozycji
 *     przeglądu — reuse bez nowej treści), drabinka hintów 3-stopniowa,
 *   - explanationMd obowiązkowy przy każdym pytaniu (R13 — błąd nigdy nie
 *     jest stanem końcowym),
 *   - klucz odpowiedzi samozgodny: poprawna odpowiedź MUSI przechodzić przez
 *     gradeAnswer (jedno źródło prawdy oceny — wzorzec banku A5),
 *   - koncept pytania musi być zadeklarowany na pozycji (jeden kręgosłup
 *     konceptów — curriculum_item_concepts ↔ bank),
 *   - refy pytań globalnie unikalne; questionRefs rozwiązywalne w obrębie
 *     całego zestawu plików (przegląd reużywa pytań innych modułów).
 */

import { gradeAnswer } from "../src/lib/assessment/grade";
import type { QuestionType } from "../src/lib/assessment/types";

const QUESTION_TYPES: ReadonlySet<string> = new Set([
	"single_choice",
	"multi_choice",
	"numeric",
	"short_text",
]);
const CHOICE_TYPES: ReadonlySet<string> = new Set(["single_choice", "multi_choice"]);
const ITEM_KINDS: ReadonlySet<string> = new Set(["theory", "exercise", "lab"]);
const RESOURCE_TYPES: ReadonlySet<string> = new Set(["video", "docs", "course", "book"]);
const KEBAB = /^[a-z0-9-]+$/;

export type AtomOptionFeedback = { feedbackMd: string; diagnosis?: string };

export type AtomQuestionInput = {
	/** Globalny, stabilny identyfikator pytania w treści (np. "f1-1-p2"). */
	ref: string;
	conceptSlug: string;
	difficulty: 1 | 2 | 3;
	type: QuestionType;
	stem: string;
	options?: string[];
	answer: Record<string, unknown>;
	explanationMd: string;
	/** Feedback diagnostyczny per opcja — wyrównany indeksami z options. */
	optionFeedback?: AtomOptionFeedback[];
};

export type AtomConceptInput = {
	slug: string;
	name: string;
	/** Koncept kluczowy modułu (spacing spiralny D6.3) — metadana treści. */
	key?: boolean;
};

export type AtomResourceInput = {
	title: string;
	url: string;
	type: string;
	license?: string;
	language?: string;
	registrationRequired?: boolean;
	/** Data ostatniej weryfikacji linku (ISO) — QG-5 od dnia 1. */
	verifiedAt?: string;
	notes?: string;
};

export type AtomItemInput = {
	/** Tożsamość pozycji = (moduleSlug, slug) — klucz upsertu ingestu. */
	slug: string;
	position: number;
	kind: string;
	title: string;
	contentMd: string;
	concepts?: AtomConceptInput[];
	questions?: AtomQuestionInput[];
	/** Pozycja przeglądu: reuse pytań po refach (także z innych modułów). */
	questionRefs?: string[];
	/** Drabinka hintów 3-stopniowa PER ATOM (treść Sophii) → configJson.hints. */
	hints?: string[];
	/** Haki konfiguracyjne (np. checks dla labów — implementacja 1E.6). */
	config?: Record<string, unknown>;
	resources?: AtomResourceInput[];
};

export type AtomModuleContent = {
	moduleSlug: string;
	items: AtomItemInput[];
};

function validateQuestion(q: AtomQuestionInput, where: string): string[] {
	const problems: string[] = [];
	if (typeof q.ref !== "string" || !KEBAB.test(q.ref)) {
		problems.push(`${where}: ref pusty/niezgodny z kebab-case`);
	}
	if (typeof q.conceptSlug !== "string" || !KEBAB.test(q.conceptSlug)) {
		problems.push(`${where}: conceptSlug pusty/niezgodny z kebab-case`);
	}
	if (![1, 2, 3].includes(q.difficulty)) problems.push(`${where}: difficulty spoza 1–3`);
	if (!QUESTION_TYPES.has(q.type)) problems.push(`${where}: nieznany typ "${q.type}"`);
	if (typeof q.stem !== "string" || q.stem.trim().length < 10) {
		problems.push(`${where}: stem pusty/za krótki`);
	}
	if (typeof q.explanationMd !== "string" || q.explanationMd.trim().length === 0) {
		problems.push(`${where}: explanationMd obowiązkowy (R13)`);
	}
	if (CHOICE_TYPES.has(q.type)) {
		if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 6) {
			problems.push(`${where}: typy choice wymagają 3–6 opcji`);
		} else {
			if (new Set(q.options.map((o) => o.trim())).size !== q.options.length) {
				problems.push(`${where}: zduplikowane opcje`);
			}
			const max = q.options.length - 1;
			if (q.type === "single_choice") {
				const c = q.answer.correct;
				if (typeof c !== "number" || !Number.isInteger(c) || c < 0 || c > max) {
					problems.push(`${where}: answer.correct poza zakresem opcji`);
				}
			} else {
				const c = q.answer.correct;
				if (
					!Array.isArray(c) ||
					c.length < 1 ||
					!c.every((i) => Number.isInteger(i) && i >= 0 && i <= max) ||
					new Set(c).size !== c.length
				) {
					problems.push(`${where}: multi_choice wymaga unikalnych indeksów w zakresie opcji`);
				}
			}
			if (q.optionFeedback !== undefined) {
				if (!Array.isArray(q.optionFeedback) || q.optionFeedback.length !== q.options.length) {
					problems.push(`${where}: optionFeedback musi być wyrównany 1:1 z options`);
				} else {
					for (const [i, fb] of q.optionFeedback.entries()) {
						if (typeof fb?.feedbackMd !== "string" || fb.feedbackMd.trim().length === 0) {
							problems.push(`${where}: optionFeedback[${i}].feedbackMd pusty`);
						}
					}
				}
			}
		}
	} else {
		if (q.options !== undefined) problems.push(`${where}: options tylko dla typów choice`);
		if (q.optionFeedback !== undefined) {
			problems.push(`${where}: optionFeedback tylko dla typów choice`);
		}
		if (q.type === "numeric") {
			const { value, tolerance } = q.answer as { value?: unknown; tolerance?: unknown };
			if (typeof value !== "number" || Number.isNaN(value)) {
				problems.push(`${where}: numeric bez value`);
			}
			if (typeof tolerance !== "number" || tolerance < 0) {
				problems.push(`${where}: numeric bez tolerance >= 0`);
			}
		}
		if (q.type === "short_text") {
			const accepted = (q.answer as { accepted?: unknown }).accepted;
			if (
				!Array.isArray(accepted) ||
				accepted.length === 0 ||
				!accepted.every((a) => typeof a === "string" && a.trim().length > 0)
			) {
				problems.push(`${where}: short_text wymaga niepustej listy answer.accepted`);
			}
		}
	}
	// Samozgodność klucza (wzorzec banku A5): poprawna odpowiedź przechodzi grading.
	const correct = correctAnswerForAtom(q);
	if (!correct || !gradeAnswer(q.type, q.answer, correct)) {
		problems.push(`${where}: klucz odpowiedzi nie przechodzi przez gradeAnswer (niesamozgodny)`);
	}
	return problems;
}

/** Poprawna odpowiedź wyprowadzona z klucza — test samozgodności gradeAnswer. */
export function correctAnswerForAtom(q: AtomQuestionInput): Record<string, unknown> | null {
	switch (q.type) {
		case "single_choice":
			return typeof q.answer.correct === "number" ? { selected: q.answer.correct } : null;
		case "multi_choice":
			return Array.isArray(q.answer.correct) ? { selected: q.answer.correct } : null;
		case "numeric":
			return typeof q.answer.value === "number" ? { value: String(q.answer.value) } : null;
		case "short_text":
			return Array.isArray(q.answer.accepted) && typeof q.answer.accepted[0] === "string"
				? { value: q.answer.accepted[0] }
				: null;
		default:
			return null;
	}
}

/** Walidacja jednego pliku modułu treści. */
export function validateModuleContent(content: AtomModuleContent): string[] {
	const problems: string[] = [];
	if (typeof content.moduleSlug !== "string" || !KEBAB.test(content.moduleSlug)) {
		problems.push(`moduleSlug "${content.moduleSlug}" niezgodny z kebab-case`);
	}
	if (!Array.isArray(content.items) || content.items.length === 0) {
		problems.push(`moduł "${content.moduleSlug}": brak pozycji`);
		return problems;
	}
	const slugs = new Set<string>();
	const positions = new Set<number>();
	for (const item of content.items) {
		const where = `moduł "${content.moduleSlug}" pozycja "${item.slug}"`;
		if (typeof item.slug !== "string" || !KEBAB.test(item.slug)) {
			problems.push(`${where}: slug pusty/niezgodny z kebab-case`);
		}
		if (slugs.has(item.slug)) problems.push(`${where}: zduplikowany slug pozycji`);
		slugs.add(item.slug);
		if (!Number.isInteger(item.position) || item.position <= 0) {
			problems.push(`${where}: position musi być dodatnią liczbą całkowitą`);
		}
		if (positions.has(item.position)) problems.push(`${where}: zduplikowana position`);
		positions.add(item.position);
		if (!ITEM_KINDS.has(item.kind)) {
			problems.push(`${where}: kind "${item.kind}" spoza theory|exercise|lab (treść 1E.2)`);
		}
		if (typeof item.title !== "string" || item.title.trim().length === 0) {
			problems.push(`${where}: pusty title`);
		}
		if (typeof item.contentMd !== "string" || item.contentMd.trim().length === 0) {
			problems.push(`${where}: pusty contentMd`);
		}

		const conceptSlugs = new Set((item.concepts ?? []).map((c) => c.slug));
		for (const c of item.concepts ?? []) {
			if (!KEBAB.test(c.slug)) problems.push(`${where}: koncept "${c.slug}" nie-kebab-case`);
			if (typeof c.name !== "string" || c.name.trim().length === 0) {
				problems.push(`${where}: koncept "${c.slug}" bez name`);
			}
		}

		const hasQuestions = (item.questions ?? []).length > 0;
		const hasRefs = (item.questionRefs ?? []).length > 0;
		if (hasQuestions && hasRefs) {
			problems.push(`${where}: questions i questionRefs wykluczają się`);
		}
		if ((item.kind === "exercise" || item.kind === "theory") && !hasQuestions && !hasRefs) {
			problems.push(`${where}: atom ${item.kind} wymaga pytań albo questionRefs (przegląd)`);
		}
		if (hasQuestions && item.kind !== "lab" && (item.questions ?? []).length !== 3) {
			problems.push(`${where}: atom ma ${item.questions?.length} pytań (wymagane DOKŁADNIE 3)`);
		}
		// Drabinka hintów 3-stopniowa wszędzie tam, gdzie są własne pytania lub
		// zadanie wykonawcze (lab); pozycje przeglądu (reuse) jej nie mają.
		if ((hasQuestions || item.kind === "lab") && !hasRefs) {
			if (
				!Array.isArray(item.hints) ||
				item.hints.length !== 3 ||
				!item.hints.every((h) => typeof h === "string" && h.trim().length > 0)
			) {
				problems.push(`${where}: drabinka hintów musi mieć DOKŁADNIE 3 niepuste stopnie`);
			}
		}
		for (const [qi, q] of (item.questions ?? []).entries()) {
			problems.push(...validateQuestion(q, `${where} pytanie[${qi}] (${q.ref})`));
			if (!conceptSlugs.has(q.conceptSlug)) {
				problems.push(
					`${where} pytanie ${q.ref}: conceptSlug "${q.conceptSlug}" niezadeklarowany na pozycji`,
				);
			}
		}
		for (const [ri, r] of (item.resources ?? []).entries()) {
			if (!RESOURCE_TYPES.has(r.type)) {
				problems.push(`${where} zasób[${ri}]: type "${r.type}" spoza video|docs|course|book`);
			}
			if (typeof r.url !== "string" || !/^https:\/\//.test(r.url)) {
				problems.push(`${where} zasób[${ri}]: url musi być https`);
			}
			if (typeof r.title !== "string" || r.title.trim().length === 0) {
				problems.push(`${where} zasób[${ri}]: pusty title`);
			}
		}
	}
	return problems;
}

/**
 * Walidacja CAŁEGO zestawu plików treści (spójność między modułami):
 * refy globalnie unikalne, questionRefs rozwiązywalne, ta sama nazwa
 * konceptu przy tym samym slugu.
 */
export function validateContentSet(contents: AtomModuleContent[]): string[] {
	const problems: string[] = [];
	const moduleSlugs = new Set<string>();
	for (const c of contents) {
		if (moduleSlugs.has(c.moduleSlug)) {
			problems.push(`zduplikowany moduleSlug "${c.moduleSlug}" w zestawie plików`);
		}
		moduleSlugs.add(c.moduleSlug);
		problems.push(...validateModuleContent(c));
	}
	const refs = new Set<string>();
	const conceptNames = new Map<string, string>();
	for (const c of contents) {
		for (const item of c.items) {
			for (const q of item.questions ?? []) {
				if (refs.has(q.ref)) problems.push(`zduplikowany ref pytania "${q.ref}"`);
				refs.add(q.ref);
			}
			for (const concept of item.concepts ?? []) {
				const known = conceptNames.get(concept.slug);
				if (known !== undefined && known !== concept.name) {
					problems.push(
						`koncept "${concept.slug}": rozjazd nazwy ("${known}" vs "${concept.name}")`,
					);
				}
				conceptNames.set(concept.slug, concept.name);
			}
		}
	}
	for (const c of contents) {
		for (const item of c.items) {
			for (const ref of item.questionRefs ?? []) {
				if (!refs.has(ref)) {
					problems.push(
						`moduł "${c.moduleSlug}" pozycja "${item.slug}": questionRef "${ref}" nie istnieje w zestawie`,
					);
				}
			}
		}
	}
	return problems;
}
