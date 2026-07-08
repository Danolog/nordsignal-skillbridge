// ============================================================================
// A5/1.11 — warstwa serwisowa diagnozy: odczyty banku i budowa payloadów pytań.
//
// WSZYSTKIE odczyty banku idą owner-side (`db`) — question_concepts /
// question_items to tabele DENY (zero grantów app_*, spec §2.2); rola
// studenta nigdy nie dotyka banku. Payload pytania zawiera stem + opcje,
// NIGDY answer_json ani explanation_md.
// ============================================================================

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessmentAnswers, questionConcepts, questionItems, students } from "@/lib/db/schema";
import type { BankItem, Difficulty, ExpectedQuestion, QuestionType } from "./types";

/** TTL sesji in_progress (spec §2.5) — sprawdzany leniwie przy wznowieniu/odpowiedzi. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isSessionExpired(startedAt: Date, now: Date = new Date()): boolean {
	return now.getTime() - startedAt.getTime() > SESSION_TTL_MS;
}

/** Student zalogowanego użytkownika (owner-side; trasy wymagają istniejącego studenta). */
export async function getStudentByUserId(userId: string) {
	return db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true, careerGoal: true },
	});
}

/**
 * Aktywne itemy aktywnych konceptów diagnostycznych (diagnostic=true,
 * trunk='market') dla listy kompetencji — wsad dla buildPlan.
 */
export async function loadDiagnosticBank(competencyNames: string[]): Promise<BankItem[]> {
	if (competencyNames.length === 0) return [];
	const rows = await db
		.select({
			id: questionItems.id,
			conceptId: questionItems.conceptId,
			conceptSlug: questionConcepts.slug,
			competencyName: questionConcepts.competencyName,
			difficulty: questionItems.difficulty,
		})
		.from(questionItems)
		.innerJoin(questionConcepts, eq(questionItems.conceptId, questionConcepts.id))
		.where(
			and(
				eq(questionConcepts.diagnostic, true),
				eq(questionConcepts.trunk, "market"),
				eq(questionConcepts.status, "active"),
				eq(questionItems.status, "active"),
				inArray(questionConcepts.competencyName, competencyNames),
			),
		);
	return rows.flatMap((row) =>
		// competency_name NOT NULL dla trunk='market' (CHECK w 0030) — filtr defensywny.
		row.competencyName === null
			? []
			: [
					{
						id: row.id,
						conceptId: row.conceptId,
						conceptSlug: row.conceptSlug,
						competencyName: row.competencyName,
						difficulty: row.difficulty as Difficulty,
					},
				],
	);
}

/**
 * Itemy zadane studentowi w poprzednich sesjach (rotacja wariantów §2.4 —
 * re-diagnoza po re-onboardingu nie powtarza pytań, dopóki bank ma zapas).
 */
export async function loadExcludedItemIds(studentId: string): Promise<Set<string>> {
	const rows = await db
		.select({ questionItemId: assessmentAnswers.questionItemId })
		.from(assessmentAnswers)
		.where(eq(assessmentAnswers.studentId, studentId));
	return new Set(rows.map((r) => r.questionItemId));
}

/** Pytanie w kształcie dla klienta — stem + opcje, zero klucza/feedbacku. */
export interface QuestionPayload {
	itemId: string;
	competencyName: string;
	type: QuestionType;
	stem: string;
	/** Lista opcji dla typów choice; null dla numeric/short_text. */
	options: string[] | null;
	/** Pozycja 0-based w sekwencji sesji + łączna liczba pytań (pasek postępu). */
	position: number;
	total: number;
}

export async function buildQuestionPayload(
	expected: ExpectedQuestion,
	total: number,
): Promise<QuestionPayload | null> {
	const [item] = await db
		.select({
			id: questionItems.id,
			type: questionItems.type,
			stem: questionItems.stem,
			optionsJson: questionItems.optionsJson,
		})
		.from(questionItems)
		.where(eq(questionItems.id, expected.itemId));
	if (!item) return null;
	const options = Array.isArray(item.optionsJson)
		? item.optionsJson.filter((o): o is string => typeof o === "string")
		: null;
	return {
		itemId: item.id,
		competencyName: expected.competencyName,
		type: item.type as QuestionType,
		stem: item.stem,
		options,
		position: expected.position,
		total,
	};
}
