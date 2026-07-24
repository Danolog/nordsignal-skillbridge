// ============================================================================
// 1E.3 · P5 — stan bramki egzaminu dla Ekranu 1 (drabina + strona modułu).
//
// CZYSTA derywacja (`deriveExamGate`) + read-only assembler (`getModuleExamGate`)
// czytający owner-side wg wzorca ladder.ts (server component fetch, zero zapisów,
// NIE dotyka tras/silnika egzaminu). Za flagą OFF strona modułu w ogóle tego
// nie woła — zero nowych zapytań, zero zmiany zachowania (deploy ≠ release).
//
// Cztery pod-stany Bloku A/B (Mila 3.2 + Sophia D6.1 — 4. pod-stan „correctives
// w toku"):
//  - verified: moduł zaliczony egzaminem/test-out (E4) — brak karty bramki,
//  - gate: wszystkie pozycje zrobione, egzamin nie zdany (E3) — „Podejdź",
//  - test_out: available, 0 pozycji (E1) — Blok B „Test out" (mniej eksponowany),
//  - correctives_in_progress: 2 oblania w cyklu, correctives NIE odbyte (S-C) —
//    „Dokończ powtórkę" + paczka (z result_json zablokowanego cyklu).
//
// INTEGRACJA P4.5 (Sophia D4): stan S-C czytamy z `evaluateExamCycle` (warstwa
// serwisowa egzaminu) — JEDYNE źródło prawdy cyklu. Zwraca `correctivesRequired`
// (correctives cyklu wymagane i NIEODBYTE) + `correctivesPackage` (paczka
// zablokowanego cyklu). Reset cyklu (correctives odbyte) → `correctivesRequired
// = false` → bramka wraca do „Podejdź". NIE liczymy cyklu tutaj — konsumujemy
// werdykt serwisu (zero duplikacji logiki znaczników czasu / granicy cyklu).
// ============================================================================

import { and, eq, inArray } from "drizzle-orm";
import type { CorrectivesPackage } from "@/lib/assessment/correctives";
import { evaluateExamCycle } from "@/lib/assessment/exam-service";
import type { ModuleStatus } from "@/lib/curriculum/ladder";
import { db } from "@/lib/db";
import { curriculumModuleProgress, curriculumModules } from "@/lib/db/schema";

/** Widok bramki egzaminu — jeden z pod-stanów Ekranu 1 (Mila 3.2 / Sophia D6.1). */
export type ExamGateView =
	| { kind: "none" }
	| { kind: "verified" }
	| { kind: "gate" }
	| { kind: "test_out" }
	| { kind: "correctives_in_progress"; pkg: CorrectivesPackage };

/** Wejście derywacji — komplet pól potrzebnych do rozstrzygnięcia pod-stanu. */
export interface ExamGateInput {
	/** Czy moduł ma skonfigurowany egzamin (`exam_config_json` niepuste). */
	hasExam: boolean;
	moduleStatus: ModuleStatus;
	completedItems: number;
	itemCount: number;
	/** `curriculum_module_progress.verified_by_method` — E4 gdy exam/test_out. */
	verifiedByMethod: string | null;
	/**
	 * P4.5 (Sophia D4) — `evaluateExamCycle.correctivesRequired`: correctives
	 * bieżącego cyklu WYMAGANE i NIEODBYTE (S-C, 2 oblania w cyklu). Reset cyklu
	 * (correctives odbyte / cykl świeży) → `false` → bramka wraca do „Podejdź".
	 */
	correctivesRequired: boolean;
	/**
	 * Paczka correctives zablokowanego cyklu (`evaluateExamCycle.correctivesPackage`).
	 * Obecna ⟺ `correctivesRequired`; `null` w każdym innym stanie.
	 */
	correctivesPackage: CorrectivesPackage | null;
}

/**
 * Derywacja pod-stanu bramki. Kolejność warunków jest istotna: E4 (zaliczony)
 * wygrywa nad wszystkim; S-C (correctives) przed E3 (bo po 2. oblaniu wszystkie
 * pozycje też są zrobione); E3 przed E1. Czysta funkcja — sedno testowalne bez DB.
 */
export function deriveExamGate(input: ExamGateInput): ExamGateView {
	const { hasExam, moduleStatus, completedItems, itemCount, verifiedByMethod } = input;
	if (!hasExam) return { kind: "none" };
	if (verifiedByMethod === "exam" || verifiedByMethod === "test_out") {
		return { kind: "verified" };
	}
	// S-C: correctives cyklu wymagane i NIEODBYTE (werdykt evaluateExamCycle, D2/D4).
	if (input.correctivesRequired && input.correctivesPackage) {
		return { kind: "correctives_in_progress", pkg: input.correctivesPackage };
	}
	// E3: wszystkie pozycje zrobione, egzamin nie zdany (moduł nie zaliczony).
	if (itemCount > 0 && completedItems >= itemCount) {
		return { kind: "gate" };
	}
	// E1: test-out — moduł dostępny, zero pozycji zrobionych.
	if (moduleStatus === "available" && completedItems === 0 && itemCount > 0) {
		return { kind: "test_out" };
	}
	return { kind: "none" };
}

/** Mapowanie surowego statusu progress → ModuleStatus (brak wiersza = available). */
function coarseStatus(rawStatus: string | undefined): ModuleStatus {
	if (rawStatus === "completed") return "completed";
	if (rawStatus === "in_progress") return "in_progress";
	return "available";
}

/**
 * getModuleExamGate — owner-side read (wzorzec ladder.ts) zbierający wejście
 * derywacji dla strony modułu. Wołany WYŁĄCZNIE gdy flaga masteryGate ON.
 * Czyta: istnienie egzaminu, wiersz progress (status + verified_by_method); stan
 * S-C (correctives) deleguje do `evaluateExamCycle` (warstwa serwisowa egzaminu)
 * — nie liczy cyklu sam. Strona podaje tylko liczby pozycji, które i tak już ma
 * (getModuleItems). NIE dotyka tras ani silnika egzaminu (tylko odczyt cyklu).
 */
export async function getModuleExamGate(params: {
	studentId: string;
	moduleId: string;
	completedItems: number;
	itemCount: number;
}): Promise<ExamGateView> {
	const { studentId, moduleId } = params;

	const [[moduleRow], [progressRow]] = await Promise.all([
		db
			.select({ examConfigJson: curriculumModules.examConfigJson })
			.from(curriculumModules)
			.where(eq(curriculumModules.id, moduleId)),
		db
			.select({
				status: curriculumModuleProgress.status,
				verifiedByMethod: curriculumModuleProgress.verifiedByMethod,
			})
			.from(curriculumModuleProgress)
			.where(
				and(
					eq(curriculumModuleProgress.studentId, studentId),
					eq(curriculumModuleProgress.moduleId, moduleId),
				),
			),
	]);

	const hasExam = moduleRow?.examConfigJson != null;
	if (!hasExam) return { kind: "none" };

	// P4.5 (Sophia D4): stan cyklu = jedyne źródło S-C. evaluateExamCycle derywuje
	// granicę cyklu + correctivesRequired z assessment_sessions + curriculum_item_answers
	// (owner-side, znaczniki czasu). Konsumujemy werdykt — zero duplikacji logiki cyklu.
	const cycle = await evaluateExamCycle(studentId, moduleId);

	return deriveExamGate({
		hasExam,
		moduleStatus: coarseStatus(progressRow?.status),
		completedItems: params.completedItems,
		itemCount: params.itemCount,
		verifiedByMethod: progressRow?.verifiedByMethod ?? null,
		correctivesRequired: cycle.correctivesRequired,
		correctivesPackage: cycle.correctivesPackage ?? null,
	});
}

/**
 * modulesWithExam — batch: które z podanych modułów mają skonfigurowany egzamin
 * (`exam_config_json IS NOT NULL`). Jeden odczyt dla całej drabiny (Mila 3.1 —
 * „zmiana minimalna", bez per-moduł zapytań). Wołany tylko przy fladze ON.
 */
export async function modulesWithExam(moduleIds: string[]): Promise<Set<string>> {
	const result = new Set<string>();
	if (moduleIds.length === 0) return result;
	const rows = await db
		.select({ id: curriculumModules.id, examConfigJson: curriculumModules.examConfigJson })
		.from(curriculumModules)
		.where(inArray(curriculumModules.id, moduleIds));
	for (const row of rows) {
		if (row.examConfigJson != null) result.add(row.id);
	}
	return result;
}
