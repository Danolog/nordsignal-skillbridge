// ============================================================================
// 1E.6a — treść pozycji curriculum w kształcie DLA KLIENTA.
//
// GRANICA BEZPIECZEŃSTWA (najważniejsza rzecz w tym module): klucz odpowiedzi
// (`question_items.answer_json`), feedback per opcja (`option_feedback_json`)
// i wyjaśnienie (`explanation_md`) NIGDY nie opuszczają serwera przy ODCZYCIE
// pozycji. Wracają wyłącznie PO OCENIE odpowiedzi (trasa `.../answer`).
// Dlatego kolumny selektujemy JAWNIE (nigdy `findFirst` bez `columns` /
// `SELECT *`) — ten sam wzorzec, co `buildQuestionPayload` w
// `src/lib/assessment/service.ts` (stem + opcje, zero klucza).
//
// Prerekwizyty egzekwuje SERWER (ADR-014 D3): zablokowany moduł albo
// zablokowana pozycja w sekwencji → odmowa (403 w trasie), nie ukrycie
// przycisku w UI.
// ============================================================================

import { and, asc, eq, inArray } from "drizzle-orm";
import { questionIdsFromConfig } from "@/lib/curriculum/completion";
import { getGrantedDepths, MAX_HINT_DEPTH } from "@/lib/curriculum/hints";
import { parseChecks } from "@/lib/curriculum/lab-checks";
import { atomCode, isLabTokenConfigured } from "@/lib/curriculum/lab-token";
import { getModuleItems, isModuleUnlocked, type LadderItem } from "@/lib/curriculum/ladder";
import { db } from "@/lib/db";
import {
	curriculumItemAnswers,
	curriculumItemResources,
	curriculumModuleItems,
	curriculumModules,
	questionItems,
} from "@/lib/db/schema";

/** Pytanie w kształcie dla klienta — stem + opcje, ZERO klucza/feedbacku. */
export interface CurriculumQuestion {
	id: string;
	type: string;
	stem: string;
	/** Lista opcji dla typów choice; null dla numeric/short_text. */
	options: string[] | null;
}

export interface CurriculumItemResource {
	id: string;
	title: string;
	url: string;
	type: string;
	language: string | null;
	registrationRequired: boolean;
}

export interface CurriculumItemView {
	module: { id: string; slug: string; title: string };
	item: {
		id: string;
		moduleId: string;
		position: number;
		kind: string;
		title: string;
		status: LadderItem["status"];
		/** Markdown teorii atomu — renderowany przez `TheoryMarkdown` (ADR-006). */
		contentMd: string | null;
		/** Szacowany czas z config_json.estimated (np. „10–15 min"). */
		estimatedTime: string | null;
		/**
		 * ADR-018 — podpowiedzi JUŻ PRZYZNANE studentowi serwerową drabinką, per
		 * pytanie. NIE zawiera podpowiedzi nieodsłoniętych (zamknięcie wycieku:
		 * cała lista już nie jedzie do przeglądarki). Pusty klucz = zero przyznań.
		 */
		hintsByQuestion: Record<string, string[]>;
		/** Liczba dostępnych podpowiedzi do napisu „(2/3)" — liczba, nie treść. */
		hintsTotal: number;
		/**
		 * Jawnie PUBLICZNA lista podpowiedzi dla pozycji `lab` (§8a planu — laby nie
		 * mają pętli pytań, więc niczego tu nie mierzymy). Osobne pole pilnuje, żeby
		 * nikt nie pomylił jej z drabinką MIERZONĄ (`hintsByQuestion`). `[]` poza labem.
		 */
		labHints: string[];
		/**
		 * 1E.6b (ADR-015) — kod atomu dla pozycji `lab`: student przepisuje go do
		 * komórki-pieczątki w notebooku, a pieczątka podpisuje nim ładunek.
		 * `null` dla pozycji, które nie są labem.
		 *
		 * To NIE jest sekret w sensie bezpieczeństwa (patrz `lab-token.ts`) —
		 * jest per student+pozycja, więc token kolegi nie przejdzie.
		 */
		atomCode: string | null;
		/** Czy lab ma realny kontrakt checków (a nie atrapę z 1E.2). */
		hasChecks: boolean;
		/**
		 * Krok 4 — link „Otwórz notebook w Colab" (config_json.notebookUrl).
		 * Laby (zaliczenie pieczątką) i — od partii F1 — ćwiczenia z notebookiem
		 * towarzyszącym (WE + brudnopisy). Tylko https na colab.research.google.com
		 * (walidowane też w packerze); null dla pozycji bez notebooka.
		 */
		notebookUrl: string | null;
	};
	questions: CurriculumQuestion[];
	/** Pytania już zaliczone poprawnie — pętla nie każe ich powtarzać. */
	answeredCorrectQuestionIds: string[];
	resources: CurriculumItemResource[];
}

export type ItemViewResult =
	| { ok: true; view: CurriculumItemView }
	| { ok: false; reason: "not_found" | "module_locked" | "item_locked" };

/** Podpowiedzi z config_json (tablica stringów markdown; brak → []). */
export function hintsFromConfig(configJson: unknown): string[] {
	if (typeof configJson !== "object" || configJson === null) return [];
	const hints = (configJson as { hints?: unknown }).hints;
	if (!Array.isArray(hints)) return [];
	return hints.filter((h): h is string => typeof h === "string");
}

/** Szacowany czas z config_json (`estimated`); brak → null. */
function estimatedFromConfig(configJson: unknown): string | null {
	if (typeof configJson !== "object" || configJson === null) return null;
	const estimated = (configJson as { estimated?: unknown }).estimated;
	return typeof estimated === "string" ? estimated : null;
}

/**
 * Link do notebooka Colab z config_json — guard hosta powtórzony przy odczycie,
 * żeby zepsuty rekord w bazie nie wyrenderował linku poza Colaba (treść jest
 * ingestowana, ale defense-in-depth jest tania).
 */
function notebookUrlFromConfig(configJson: unknown): string | null {
	if (typeof configJson !== "object" || configJson === null) return null;
	const url = (configJson as { notebookUrl?: unknown }).notebookUrl;
	if (typeof url !== "string") return null;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:" || parsed.host !== "colab.research.google.com") return null;
	} catch {
		return null;
	}
	return url;
}

/**
 * Treść pozycji dla studenta (odczyt owner-side) z twardym egzekwowaniem
 * sekwencji. `reason` mapuje trasa na kod HTTP (403 dla obu blokad).
 */
export async function getItemView(studentId: string, itemId: string): Promise<ItemViewResult> {
	const item = await db.query.curriculumModuleItems.findFirst({
		where: eq(curriculumModuleItems.id, itemId),
		columns: {
			id: true,
			moduleId: true,
			position: true,
			kind: true,
			title: true,
			contentMd: true,
			configJson: true,
		},
	});
	if (!item) return { ok: false, reason: "not_found" };

	if (!(await isModuleUnlocked(studentId, item.moduleId))) {
		return { ok: false, reason: "module_locked" };
	}
	const siblings = await getModuleItems(studentId, item.moduleId);
	const state = siblings.find((i) => i.id === item.id);
	if (!state || state.status === "locked") return { ok: false, reason: "item_locked" };

	const module_ = await db.query.curriculumModules.findFirst({
		where: eq(curriculumModules.id, item.moduleId),
		columns: { id: true, slug: true, title: true },
	});
	if (!module_) return { ok: false, reason: "not_found" };

	const questionIds = questionIdsFromConfig(item.configJson);

	// Kolumny JAWNE: id/type/stem/optionsJson — answer_json, option_feedback_json
	// i explanation_md NIE są nawet czytane z bazy na tej ścieżce.
	const questionRows =
		questionIds.length > 0
			? await db
					.select({
						id: questionItems.id,
						type: questionItems.type,
						stem: questionItems.stem,
						optionsJson: questionItems.optionsJson,
					})
					.from(questionItems)
					.where(inArray(questionItems.id, questionIds))
			: [];
	const byId = new Map(questionRows.map((q) => [q.id, q]));
	// Kolejność z config_json (źródło prawdy pozycji), nie z bazy.
	const questions: CurriculumQuestion[] = questionIds.flatMap((id) => {
		const row = byId.get(id);
		if (!row) return [];
		const options = Array.isArray(row.optionsJson)
			? row.optionsJson.filter((o): o is string => typeof o === "string")
			: null;
		return [{ id: row.id, type: row.type, stem: row.stem, options }];
	});

	const [answered, resources] = await Promise.all([
		questionIds.length > 0
			? db
					.selectDistinct({ questionItemId: curriculumItemAnswers.questionItemId })
					.from(curriculumItemAnswers)
					.where(
						and(
							eq(curriculumItemAnswers.studentId, studentId),
							eq(curriculumItemAnswers.itemId, item.id),
							eq(curriculumItemAnswers.isCorrect, true),
						),
					)
			: Promise.resolve([] as { questionItemId: string }[]),
		db
			.select({
				id: curriculumItemResources.id,
				title: curriculumItemResources.title,
				url: curriculumItemResources.url,
				type: curriculumItemResources.type,
				language: curriculumItemResources.language,
				registrationRequired: curriculumItemResources.registrationRequired,
			})
			.from(curriculumItemResources)
			.where(eq(curriculumItemResources.itemId, item.id))
			.orderBy(asc(curriculumItemResources.position)),
	]);

	// ADR-018 — zamknięcie wycieku: do klienta wychodzą WYŁĄCZNIE podpowiedzi
	// przyznane serwerowo (per pytanie), a nie cała lista z config_json. Dla labów
	// (bez pętli mierzonej) cała lista jest jawnie publiczna osobnym polem (§8a).
	const isLab = item.kind === "lab";
	const allHints = hintsFromConfig(item.configJson);
	const grantedDepths = isLab
		? new Map<string, number>()
		: await getGrantedDepths(studentId, item.id);
	const hintsByQuestion: Record<string, string[]> = {};
	for (const qid of questionIds) {
		const depth = grantedDepths.get(qid) ?? 0;
		if (depth > 0) hintsByQuestion[qid] = allHints.slice(0, depth);
	}

	return {
		ok: true,
		view: {
			module: module_,
			item: {
				id: item.id,
				moduleId: item.moduleId,
				position: item.position,
				kind: item.kind,
				title: item.title,
				status: state.status,
				contentMd: item.contentMd,
				estimatedTime: estimatedFromConfig(item.configJson),
				hintsByQuestion,
				hintsTotal: Math.min(allHints.length, MAX_HINT_DEPTH),
				labHints: isLab ? allHints : [],
				// 1E.6b: kod atomu tylko dla labów — student przepisuje go do pieczątki.
				// Brak LAB_TOKEN_SECRET ⇒ null (fail-closed: lab niekompletowalny),
				// ale strona nadal się renderuje — teoria i instrukcja są do przeczytania.
				atomCode:
					item.kind === "lab" && isLabTokenConfigured() ? atomCode(studentId, item.id) : null,
				hasChecks:
					item.kind === "lab" && isLabTokenConfigured() && parseChecks(item.configJson).length > 0,
				notebookUrl:
					item.kind === "lab" || item.kind === "exercise"
						? notebookUrlFromConfig(item.configJson)
						: null,
			},
			questions,
			answeredCorrectQuestionIds: answered.map((a) => a.questionItemId),
			resources,
		},
	};
}
