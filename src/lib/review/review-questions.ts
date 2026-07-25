// ============================================================================
// 1E.4 (SLICE R4) — hydratacja treści pytań powtórki z banku, owner-side.
//
// Format powtórki (plan §Format, v0.1): JEDNO pytanie na koncept wymagalny,
// ciągnięte z istniejącego banku `question_items` — zero nowej treści. Ten moduł
// robi dwie rzeczy, obie OWNER-SIDE (question_items to tabela DENY — app_student
// ma ZERO grantów, więc treść i klucz muszą iść przez połączenie owner `db`,
// dokładnie jak loadExamBank; parytet z decyzją K4 owner-side w nagłówku tras R4):
//
//   1. loadReviewQuestions — kolejka R4: dla listy conceptId ładuje po JEDNYM
//      pytaniu na koncept HURTEM (jeden `inArray`, ZERO N+1 — wzorzec loadExamBank),
//      buduje payload BEZ klucza (buildReviewQuestionPayload wypisuje pola jawnie —
//      answer_json/explanation nigdy nie opuszczają serwera).
//   2. loadGradableQuestion — trasa answer R4: ładuje JEDEN item razem z kluczem
//      (do gradingu grade.ts, owner-side) i waliduje przynależność do konceptu (K3).
//
// Dobór pytania per koncept jest DETERMINISTYCZNY (difficulty ASC → id ASC): ta sama
// para (student, koncept) dostaje to samo pytanie między wywołaniami kolejki, dopóki
// bank się nie zmieni — bez migotania treści powtórki (parytet z tie-breakiem
// conceptId w getDueQueue). MVP v0.1 ogranicza się do `single_choice` (grade.ts po
// kluczu `correct`); inne typy pomijamy defensywnie (kontrakt pojemności — patrz niżej).
// ============================================================================

import { and, asc, eq, inArray } from "drizzle-orm";
import type { QuestionType } from "@/lib/assessment/types";
import { db } from "@/lib/db";
import { questionItems } from "@/lib/db/schema";

/**
 * Pytanie powtórki BEZ klucza — jawnie WYPISANE pola (nie spread wiersza), żeby
 * `answer_json`/`explanation_md`/`option_feedback_json` nie wyciekły przez
 * przypadkowy spread. Odpowiednik ExamQuestionPayload/buildExamQuestionPayload:
 * klucz nigdy nie opuszcza serwera. `questionItemId` NIE jest sekretem (jak
 * `slotRef` egzaminu) — klient odsyła go w /answer, gdzie serwer i tak rewaliduje
 * przynależność do konceptu i studenta (K3).
 */
export interface ReviewQuestionPayload {
	questionItemId: string;
	type: "single_choice";
	stem: string;
	options: string[];
}

/** Item z kluczem do gradingu (owner-side) — używany WYŁĄCZNIE serwerowo w /answer. */
export interface GradableReviewQuestion {
	questionItemId: string;
	conceptId: string;
	type: QuestionType;
	/** Klucz z banku (question_items.answer_json) — grade.ts, NIGDY do odpowiedzi API. */
	answerKey: unknown;
	/** Wyjaśnienie edukacyjne (ocena formująca §7) — może wrócić po ocenie, nie klucz. */
	explanationMd: string | null;
}

/** Surowy wiersz banku istotny dla payloadu (mapowany niżej). */
interface QuestionRow {
	id: string;
	conceptId: string;
	type: string;
	stem: string;
	optionsJson: unknown;
}

/**
 * buildReviewQuestionPayload — wiersz banku → payload bez klucza. Jawnie wypisuje
 * dozwolone pola; `options` filtrowane do stringów (jak loadExamBank). Zwraca null,
 * gdy item nie nadaje się na powtórkę MVP (typ ≠ single_choice albo brak opcji) —
 * wołający pomija taki koncept (kontrakt pojemności).
 */
export function buildReviewQuestionPayload(row: QuestionRow): ReviewQuestionPayload | null {
	if (row.type !== "single_choice") return null;
	const options = Array.isArray(row.optionsJson)
		? row.optionsJson.filter((o): o is string => typeof o === "string")
		: [];
	if (options.length === 0) return null;
	return {
		questionItemId: row.id,
		type: "single_choice",
		stem: row.stem,
		options,
	};
}

/**
 * loadReviewQuestions — dla listy conceptId zwraca mapę conceptId → payload (bez
 * klucza), po JEDNYM pytaniu na koncept. JEDNO zapytanie po indeksie
 * idx_question_items_concept_difficulty (concept_id, difficulty) + `inArray` —
 * ZERO N+1 (gorąca ścieżka kolejki, lekcja loadExamBank). Tylko itemy `active`;
 * pierwszy po (difficulty ASC → id ASC) na koncept = deterministyczny wybór.
 *
 * Koncept bez KWALIFIKUJĄCEGO pytania (brak itemu / sam retired / nie single_choice)
 * NIE trafia do mapy → wołający (trasa queue) pomija go defensywnie. To „kontrakt
 * pojemności" (plan §Ryzyka): nie generujemy pustej powtórki dla konceptu bez pytania.
 */
export async function loadReviewQuestions(
	conceptIds: readonly string[],
): Promise<Map<string, ReviewQuestionPayload>> {
	const result = new Map<string, ReviewQuestionPayload>();
	if (conceptIds.length === 0) return result;

	const rows = await db
		.select({
			id: questionItems.id,
			conceptId: questionItems.conceptId,
			type: questionItems.type,
			stem: questionItems.stem,
			optionsJson: questionItems.optionsJson,
		})
		.from(questionItems)
		.where(
			and(inArray(questionItems.conceptId, [...conceptIds]), eq(questionItems.status, "active")),
		)
		// Deterministyczny „pierwszy na koncept": difficulty ASC (najłatwiejsze do
		// retrieval), tie-break id ASC (stabilny między wywołaniami).
		.orderBy(asc(questionItems.conceptId), asc(questionItems.difficulty), asc(questionItems.id));

	for (const row of rows) {
		if (result.has(row.conceptId)) continue; // pierwszy wygrywa (kolejność wyżej)
		const payload = buildReviewQuestionPayload(row);
		if (payload) result.set(row.conceptId, payload);
	}
	return result;
}

/**
 * loadGradableQuestion — item Z KLUCZEM do oceny (owner-side), z walidacją
 * przynależności (K3): item musi ISTNIEĆ, być `active` i należeć do `conceptId`
 * podanego przez klienta. Niepasujący (inny koncept, retired, nieistniejący) →
 * null; trasa mapuje to na 404/409, NIGDY surowe 500. Klucz (`answerKey`) zostaje
 * po stronie serwera — grade.ts liczy poprawność, do klienta wraca tylko werdykt.
 */
export async function loadGradableQuestion(
	questionItemId: string,
	conceptId: string,
): Promise<GradableReviewQuestion | null> {
	const [row] = await db
		.select({
			id: questionItems.id,
			conceptId: questionItems.conceptId,
			type: questionItems.type,
			answerJson: questionItems.answerJson,
			explanationMd: questionItems.explanationMd,
			status: questionItems.status,
		})
		.from(questionItems)
		.where(and(eq(questionItems.id, questionItemId), eq(questionItems.conceptId, conceptId)));
	if (!row || row.status !== "active") return null;
	return {
		questionItemId: row.id,
		conceptId: row.conceptId,
		type: row.type as QuestionType,
		answerKey: row.answerJson,
		explanationMd: row.explanationMd,
	};
}
