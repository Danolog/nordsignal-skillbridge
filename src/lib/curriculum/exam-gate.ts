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
//    „Dokończ powtórkę" + paczka (Ekran 5 z ostatniego wyniku).
//
// SEAM INTEGRACYJNY (P4.5): `correctivesResolved` = sygnał „correctives cyklu
// odbyte" (Sophia D4, [WYMÓG BACKENDU]). Do czasu merge P4.5 assembler czyta go
// jako `null` (nieznane) i konserwatywnie pokazuje S-C po oblaniu cap-2 — nie
// zgaduje, że correctives odbyte. Po merge: podłączyć realny sygnał (patrz TODO).
// ============================================================================

import { and, desc, eq, inArray } from "drizzle-orm";
import type { CorrectivesPackage } from "@/lib/assessment/correctives";
import type { ExamResultJson } from "@/lib/assessment/exam";
import type { ModuleStatus } from "@/lib/curriculum/ladder";
import { db } from "@/lib/db";
import { assessmentSessions, curriculumModuleProgress, curriculumModules } from "@/lib/db/schema";

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
	/** Ostatnia DOMKNIĘTA sesja egzaminu tego modułu (wykrycie S-C). */
	lastExam: { passed: boolean; correctives: boolean; pkg: CorrectivesPackage | null } | null;
	/**
	 * P4.5 [WYMÓG BACKENDU — Sophia D4]: czy correctives bieżącego cyklu odbyte.
	 * `null` = sygnał jeszcze niepodłączony (P4.5 niezmergowane) → konserwatywnie
	 * traktuj jak „nieodbyte" (pokaż S-C). `true` → bramka wraca do „Podejdź".
	 */
	correctivesResolved: boolean | null;
}

/**
 * Derywacja pod-stanu bramki. Kolejność warunków jest istotna: E4 (zaliczony)
 * wygrywa nad wszystkim; S-C (correctives) przed E3 (bo po 2. oblaniu wszystkie
 * pozycje też są zrobione); E3 przed E1. Czysta funkcja — sedno testowalne bez DB.
 */
export function deriveExamGate(input: ExamGateInput): ExamGateView {
	const { hasExam, moduleStatus, completedItems, itemCount, verifiedByMethod, lastExam } = input;
	if (!hasExam) return { kind: "none" };
	if (verifiedByMethod === "exam" || verifiedByMethod === "test_out") {
		return { kind: "verified" };
	}
	// S-C: oblany po wyczerpaniu cap 2, correctives wymagane i NIE odbyte.
	if (
		lastExam &&
		!lastExam.passed &&
		lastExam.correctives &&
		lastExam.pkg &&
		input.correctivesResolved !== true
	) {
		return { kind: "correctives_in_progress", pkg: lastExam.pkg };
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
 * Czyta sam: istnienie egzaminu, wiersz progress (status + verified_by_method),
 * ostatnią domkniętą sesję egzaminu. Strona podaje tylko liczby pozycji, które
 * i tak już ma (getModuleItems). NIE dotyka tras ani silnika egzaminu.
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

	// Ostatnia domknięta sesja egzaminu tego modułu — wykrycie S-C (correctives).
	const [last] = await db
		.select({ resultJson: assessmentSessions.resultJson })
		.from(assessmentSessions)
		.where(
			and(
				eq(assessmentSessions.studentId, studentId),
				eq(assessmentSessions.kind, "module_exam"),
				eq(assessmentSessions.moduleId, moduleId),
				eq(assessmentSessions.status, "completed"),
			),
		)
		.orderBy(desc(assessmentSessions.completedAt))
		.limit(1);

	let lastExam: ExamGateInput["lastExam"] = null;
	if (last?.resultJson) {
		const r = last.resultJson as ExamResultJson;
		lastExam = {
			passed: r.passed,
			correctives: r.correctives,
			pkg: r.correctivesPackage ?? null,
		};
	}

	return deriveExamGate({
		hasExam,
		moduleStatus: coarseStatus(progressRow?.status),
		completedItems: params.completedItems,
		itemCount: params.itemCount,
		verifiedByMethod: progressRow?.verifiedByMethod ?? null,
		lastExam,
		// TODO(P4.5 merge): podłączyć realny sygnał „correctives cyklu odbyte"
		// (Sophia D4 — derywacja z curriculum_item_answers po completedAt 2. oblania).
		// Do tego czasu null = nieznane → S-C pokazywany konserwatywnie.
		correctivesResolved: null,
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
