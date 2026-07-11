/**
 * 1E.1e (ADR-014 D3) — kompletowanie pozycji i modułu (zapisy owner-side).
 *
 * Zaliczenie pozycji = licznik „wszystkie pytania poprawnie" (M10) albo
 * pozytywny wynik checku (lab/project — interfejs; automaty w 1E.6).
 * Zaliczenie modułu w 1E.1 = wszystkie pozycje completed (hak pod egzamin
 * 1E.3: verified_by_method zostaje NULL). Odblokowanie następnego modułu
 * jest DERYWOWANE (ladder.ts) — nie wymaga zapisu.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	curriculumItemProgress,
	curriculumModuleItems,
	curriculumModuleProgress,
} from "@/lib/db/schema";

/** Upsert pozycji na completed + kaskada zaliczenia modułu. */
export async function completeItem(
	studentId: string,
	tenantId: string,
	itemId: string,
	moduleId: string,
): Promise<{ moduleCompleted: boolean }> {
	await db
		.insert(curriculumItemProgress)
		.values({ studentId, tenantId, itemId, status: "completed", completedAt: new Date() })
		.onConflictDoUpdate({
			target: [curriculumItemProgress.studentId, curriculumItemProgress.itemId],
			set: {
				status: "completed",
				completedAt: new Date(),
				updatedAt: new Date(),
			},
		});

	// Moduł completed ⇔ zero pozycji bez statusu completed/skipped.
	const moduleItems = await db
		.select({ id: curriculumModuleItems.id })
		.from(curriculumModuleItems)
		.where(eq(curriculumModuleItems.moduleId, moduleId));
	const doneRows = await db
		.select({ itemId: curriculumItemProgress.itemId })
		.from(curriculumItemProgress)
		.where(
			and(
				eq(curriculumItemProgress.studentId, studentId),
				inArray(
					curriculumItemProgress.itemId,
					moduleItems.map((i) => i.id),
				),
				inArray(curriculumItemProgress.status, ["completed", "skipped_by_placement"]),
			),
		);
	const moduleCompleted = doneRows.length === moduleItems.length && moduleItems.length > 0;

	if (moduleCompleted) {
		await db
			.insert(curriculumModuleProgress)
			.values({ studentId, tenantId, moduleId, status: "completed", completedAt: new Date() })
			.onConflictDoUpdate({
				target: [curriculumModuleProgress.studentId, curriculumModuleProgress.moduleId],
				set: { status: "completed", completedAt: new Date(), updatedAt: new Date() },
			});
	}
	return { moduleCompleted };
}

/** Ślad próby (błędna odpowiedź NIE kończy pozycji — R13). */
export async function recordAttempt(
	studentId: string,
	tenantId: string,
	itemId: string,
): Promise<void> {
	await db
		.insert(curriculumItemProgress)
		.values({
			studentId,
			tenantId,
			itemId,
			status: "in_progress",
			attempts: 1,
			lastAnswerAt: new Date(),
		})
		.onConflictDoUpdate({
			target: [curriculumItemProgress.studentId, curriculumItemProgress.itemId],
			set: {
				// Nie cofaj statusu completed/skipped (idempotencja ponownych prób).
				status: sql`CASE WHEN ${curriculumItemProgress.status} IN ('completed','skipped_by_placement')
					THEN ${curriculumItemProgress.status} ELSE 'in_progress' END`,
				attempts: sql`${curriculumItemProgress.attempts} + 1`,
				lastAnswerAt: new Date(),
				updatedAt: new Date(),
			},
		});
}

/** Czy student odpowiedział poprawnie na WSZYSTKIE pytania pozycji. */
export async function allQuestionsCorrect(
	studentId: string,
	itemId: string,
	questionItemIds: string[],
): Promise<boolean> {
	if (questionItemIds.length === 0) return false;
	const rows = await db.execute(sql`
		SELECT DISTINCT question_item_id FROM curriculum_item_answers
		WHERE student_id = ${studentId} AND item_id = ${itemId}
		  AND is_correct = true
	`);
	const correct = new Set(
		(rows.rows as { question_item_id: string }[]).map((r) => r.question_item_id),
	);
	return questionItemIds.every((id) => correct.has(id));
}

/** Guard przeciw pytaniom spoza pozycji (konfiguracja pozycji = źródło prawdy). */
export function questionIdsFromConfig(configJson: unknown): string[] {
	if (typeof configJson !== "object" || configJson === null) return [];
	const ids = (configJson as { questionItemIds?: unknown }).questionItemIds;
	if (!Array.isArray(ids)) return [];
	return ids.filter((id): id is string => typeof id === "string");
}
