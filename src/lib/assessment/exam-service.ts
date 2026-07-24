// ============================================================================
// 1E.3 (ADR-014 D3) — warstwa serwisowa egzaminu modułowego: odczyty banku
// owner-side + budowa payloadu pytania (bez klucza).
//
// R4 (decyzja Ethana, migracja-wolna): pytania egzaminacyjne żyją w
// `question_items` (tabela DENY — zero grantów app_*, klucz owner-side, reuse
// gwarancji banku A5). Pozycja egzaminu (`curriculum_module_items` kind='exam')
// enumeruje ich ID w `config_json.examSlots` (TYLKO UUID-y + ref wariantu +
// slug konceptu — bezpieczne pod grantem `SELECT` app_student, dokładnie jak
// atom trzyma `config_json.questionItemIds`). Klucz (`answer_json`) i treść nie
// wchodzą do config_json; hydratuje je owner-side ten serwis z question_items.
// Zero nowej kolumny, zero migracji — patrz nagłówek exam.ts.
//
// WSZYSTKIE odczyty banku owner-side (`db`). Payload pytania = stem + opcje,
// NIGDY `correct` (wzorzec service.ts diagnozy).
// ============================================================================

import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { type ExamConfig, parseExamConfig } from "@/lib/curriculum/exam-config";
import { db } from "@/lib/db";
import {
	curriculumItemConcepts,
	curriculumModuleItems,
	curriculumModules,
	questionConcepts,
	questionItems,
	students,
} from "@/lib/db/schema";
import {
	assembleCorrectives,
	CORRECTIVES_ATOM_KINDS,
	type CorrectivesAtomRow,
	type CorrectivesPackage,
} from "./correctives";
import { type ExamBank, type ExamSlot, type ExamVariant, parseExamSlotRefs } from "./exam";

/** TTL sesji egzaminu (wzorzec diagnozy) — sprawdzany leniwie przy wznowieniu. */
export const EXAM_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isExamSessionExpired(startedAt: Date, now: Date = new Date()): boolean {
	return now.getTime() - startedAt.getTime() > EXAM_SESSION_TTL_MS;
}

/** Student zalogowanego użytkownika (owner-side; trasy wymagają istniejącego studenta). */
export async function getStudentByUserId(userId: string) {
	return db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
}

/**
 * Odcisk wejścia sesji egzaminu: moduł + numer podejścia. Wznowienie na innym
 * podejściu (retry P4 zamraża INNY plan wariantów) → mismatch → nowa sesja.
 */
export function computeExamInputHash(moduleId: string, attempt: number): string {
	return createHash("sha256")
		.update(JSON.stringify([moduleId, attempt]), "utf8")
		.digest("hex");
}

/** Parametry egzaminu modułu (exam_config_json) — null, gdy moduł bez egzaminu. */
export async function loadModuleExamConfig(moduleId: string): Promise<ExamConfig | null> {
	const [module] = await db
		.select({ examConfigJson: curriculumModules.examConfigJson })
		.from(curriculumModules)
		.where(eq(curriculumModules.id, moduleId));
	if (!module) return null;
	return parseExamConfig(module.examConfigJson);
}

// parseExamSlotRefs + ExamSlotRef — WSPÓLNY guard granicy examSlots (read-side tu,
// write-side w packerze/teście W1). Przeniesiony do exam.ts (czysta logika bez DB),
// re-eksport niżej dla warstwy serwisowej i tras. Jedna definicja = jeden kontrakt.

/**
 * Bank egzaminacyjny modułu — hydratowany owner-side z question_items po ID
 * z `config_json.examSlots` pozycji egzaminu. null, gdy moduł nie ma pozycji
 * egzaminu z examSlots (jawna degradacja, jak `uncovered` diagnozy). Pytanie
 * retired / brakujące w banku → slot zredukowany; walidator banku (packer)
 * gwarantuje komplet przed ingestem, tu strażnik defensywny.
 */
export async function loadExamBank(moduleId: string, moduleSlug: string): Promise<ExamBank | null> {
	const [examItem] = await db
		.select({ configJson: curriculumModuleItems.configJson })
		.from(curriculumModuleItems)
		.where(
			and(eq(curriculumModuleItems.moduleId, moduleId), eq(curriculumModuleItems.kind, "exam")),
		);
	if (!examItem) return null;
	const slotRefs = parseExamSlotRefs(examItem.configJson);
	if (!slotRefs) return null;

	const itemIds = slotRefs.flatMap((s) => s.variants.map((v) => v.itemId));
	if (itemIds.length === 0) return null;
	const rows = await db
		.select({
			id: questionItems.id,
			type: questionItems.type,
			stem: questionItems.stem,
			optionsJson: questionItems.optionsJson,
			answerJson: questionItems.answerJson,
			status: questionItems.status,
		})
		.from(questionItems)
		.where(inArray(questionItems.id, itemIds));
	const byId = new Map(rows.map((r) => [r.id, r]));

	const slots: ExamSlot[] = [];
	for (const s of slotRefs) {
		const variants: ExamVariant[] = [];
		for (const v of s.variants) {
			const item = byId.get(v.itemId);
			if (!item || item.status !== "active" || item.type !== "single_choice") continue;
			const options = Array.isArray(item.optionsJson)
				? item.optionsJson.filter((o): o is string => typeof o === "string")
				: [];
			const correct = (item.answerJson as { correct?: unknown } | null)?.correct;
			if (typeof correct !== "number" || !Number.isInteger(correct)) continue;
			variants.push({
				ref: v.ref,
				variant: v.variant,
				itemId: item.id,
				stem: item.stem,
				options,
				correct,
				feedbackMd: "",
			});
		}
		if (variants.length > 0) {
			slots.push({ slotRef: s.slotRef, conceptSlug: s.conceptSlug, variants });
		}
	}
	if (slots.length === 0) return null;
	return { moduleSlug, slots };
}

/**
 * buildCorrectivesPackage — paczka remediacji dla OBLANEGO egzaminu po cap 2
 * (P4, ADR-014 D3). Dla każdego konceptu błędnego pytania (`failedConcepts`)
 * wskazuje ≤3 atomy uczące (theory/exercise) przez kręgosłup konceptów.
 *
 * Mapowanie koncept→atom (relacja): question_concepts.slug ─(id)→
 * curriculum_item_concepts.concept_id ─→ .item_id ─→ curriculum_module_items
 * (kind ∈ theory/exercise). LEFT JOIN od question_concepts: koncept bez atomu
 * (R2) i tak wraca (z nazwą, pustą listą atomów) — degradacja, nie wywrotka.
 * Dedup i przycięcie ≤3 robi assembleCorrectives (czyste). Sort (koncept,
 * moduł, pozycja) daje deterministyczne „pierwsze 3".
 *
 * Odczyt owner-side (`db`): curriculum to treść STATYCZNA (niemutowana przez
 * complete), więc czytanie poza transakcją sesji jest bezpieczne — brak
 * zależności od stanu zapisywanego w tej samej transakcji.
 *
 * `errorCount` + `maxErrors` sterują WYŁĄCZNIE mikrocopy paczki: N = dystans do
 * progu = `errorCount − maxErrors` (Sophia nota 3, §5 banku F1). Nie wpływają na
 * dobór atomów. Wołający (complete route) podaje `result.maxErrors` z gradeExam.
 */
export async function buildCorrectivesPackage(
	failedConcepts: readonly string[],
	errorCount: number,
	maxErrors: number,
): Promise<CorrectivesPackage> {
	if (failedConcepts.length === 0) {
		return assembleCorrectives([], errorCount, maxErrors, []);
	}
	const rows = await db
		.select({
			conceptSlug: questionConcepts.slug,
			conceptName: questionConcepts.name,
			atomSlug: curriculumModuleItems.slug,
			atomTitle: curriculumModuleItems.title,
			atomKind: curriculumModuleItems.kind,
			moduleSlug: curriculumModules.slug,
		})
		.from(questionConcepts)
		.leftJoin(curriculumItemConcepts, eq(curriculumItemConcepts.conceptId, questionConcepts.id))
		// Filtr rodzaju atomu w warunku JOIN (nie WHERE) — inaczej LEFT JOIN gubi
		// koncepty, które mają WYŁĄCZNIE atomy innego rodzaju (np. lab), zamiast
		// zwrócić je z pustą listą (R2).
		.leftJoin(
			curriculumModuleItems,
			and(
				eq(curriculumModuleItems.id, curriculumItemConcepts.itemId),
				inArray(curriculumModuleItems.kind, [...CORRECTIVES_ATOM_KINDS]),
			),
		)
		.leftJoin(curriculumModules, eq(curriculumModules.id, curriculumModuleItems.moduleId))
		.where(inArray(questionConcepts.slug, [...failedConcepts]))
		.orderBy(
			asc(questionConcepts.slug),
			asc(curriculumModules.slug),
			asc(curriculumModuleItems.position),
		);
	return assembleCorrectives(failedConcepts, errorCount, maxErrors, rows as CorrectivesAtomRow[]);
}

// buildExamQuestionPayload / ExamQuestionPayload — czysta logika payloadu:
// przeniesione do exam.ts (bez zależności od DB), re-eksport dla tras.
// parseExamSlotRefs / ExamSlotRef — wspólny guard granicy examSlots (exam.ts,
// bez DB); re-eksport, żeby konsumenci serwisu (trasy) mieli jedno wejście.
export {
	buildExamQuestionPayload,
	type ExamQuestionPayload,
	type ExamSlotRef,
	parseExamSlotRefs,
} from "./exam";
