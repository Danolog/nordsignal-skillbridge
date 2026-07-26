// ============================================================================
// 1E.4 (SLICE R5) — hook zasiewu konceptów do harmonogramu powtórek przy ZDANYM
// mastery gate (1E.3). Punkt wpięcia (JEDEN, decyzja Sophii D1): po zamknięciu
// transakcji egzaminu, w gałęzi `completed && passed` trasy
// /api/exam/[id]/complete. NIE atom-pass, NIE corrective (decyzja Sophii).
//
// ── OWNER-SIDE, POZA transakcją egzaminu ──────────────────────────────────
// `app_student` ma na review_states TYLKO SELECT (RLS 0042) → każdy INSERT spod
// roli runtime byłby ODMÓWIONY. Zasiew MUSI iść przez połączenie owner (`db`),
// jawnym filtrem student_id jako granicą najemcy (parytet reconcile-verified.ts
// i review-service.ts). Dlatego hook NIE wchodzi do transakcji studenckiej
// egzaminu (self-critique Ethana #4, plan §6) — jest wołany PO jej domknięciu.
//
// ── BEST-EFFORT (wołający dokłada .catch) ─────────────────────────────────
// Zasiew to DODATEK edukacyjny; nie może wywalić studentowi ZDANEGO egzaminu
// (§7 konstytucji: mastery gate > powtórki). Wołający (trasa) opakowuje to
// wywołanie w `.catch(logError)`, więc błąd tu NIE propaguje do odpowiedzi
// trasy. Idempotencja (enrollConcepts → ON CONFLICT DO NOTHING) czyni ponowny
// zapłon (np. przy retry) bezpiecznym — powtórka nie zdubluje stanu.
//
// ── BRAMKA FLAGI JEST W MIEJSCU WYWOŁANIA, nie tutaj ──────────────────────
// Ten hook zakłada, że wołający już sprawdził isFeatureEnabled("spacedRepetition").
// Przy fladze OFF hook NIGDY nie jest wołany → ZERO dodatkowych zapytań, odpowiedź
// trasy identyczna jak dziś (inwariant, który Quinn dowodzi bajt-w-bajt).
// ============================================================================

import { and, eq, exists } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	curriculumItemConcepts,
	curriculumModuleItems,
	questionConcepts,
	questionItems,
} from "@/lib/db/schema";
import { enrollConcepts } from "./review-service";

/**
 * enrollModuleConceptsOnMasteryPass — zasiewa koncepty KLUCZOWE modułu do
 * harmonogramu powtórek studenta po zdanym mastery gate tego modułu.
 *
 * Kroki:
 *   1. Zapytanie: koncepty modułu (przez curriculum_module_items →
 *      curriculum_item_concepts → question_concepts), zawężone do `active` i
 *      `trunk = 'market'` (decyzja Sophii 2 — foundations 1E.2 nie idą do
 *      powtórek rynkowych) + filtr pojemności „≥1 aktywne pytanie w banku"
 *      (patrz niżej). Bierzemy UUID-y konceptów WPROST z bazy — NIE
 *      `result.failedConcepts` (to slugi, zła jednostka; scheduler operuje na id).
 *   2. Batch-enroll przez enrollConcepts (JEDEN wielowierszowy INSERT ...
 *      ON CONFLICT DO NOTHING, bez N+1).
 *
 * ── FILTR POJEMNOŚCI (decyzja R5, zawężony N1) ────────────────────────────
 * Zawężamy do konceptów mających ≥1 AKTYWNE pytanie TYPU `single_choice` w banku
 * (EXISTS na question_items). Powód: koncept bez POWTARZALNEGO pytania nie da się
 * powtórzyć — zasiew takiego to martwy wiersz review_states, którego kolejka R4
 * (loadReviewQuestions) i tak nigdy nie pokaże. Wolę NIE tworzyć śmiecia niż
 * polegać wyłącznie na pominięciu w kolejce (Built-to-Sell: tabela nie kłamie o
 * „zaplanowanych" powtórkach, których nie ma). To kontrakt pojemności §6 Sophii
 * egzekwowany u ŹRÓDŁA.
 *
 * ── PARYTET Z R4 (N1) ─────────────────────────────────────────────────────
 * Kolejka R4 serwuje WYŁĄCZNIE `single_choice` (loadReviewQuestions /
 * buildReviewQuestionPayload — grade.ts ocenia po kluczu `correct`). Wcześniej filtr
 * był type-agnostyczny („≥1 aktywne pytanie"), więc koncept `trunk='market'`, którego
 * jedyne aktywne pytanie było np. numeric, BYŁ enrollowany, ale nigdy nie wchodził do
 * kolejki → PHANTOM-wiersz review_states. N1 domyka lukę u źródła: predykat EXISTS
 * niesie ten sam warunek typu co kolejka, więc zbiór zasianych konceptów = zbiór
 * powtarzalnych. Brak backfillu (plan §3): jeśli kwalifikujące pytanie dojdzie później,
 * zasiew nastąpi przy KOLEJNYM zdanym mastery gate, nie wstecz. Indeks pod ten EXISTS:
 * idx_question_items_concept_status_type (migracja 0043, N2).
 *
 * ── best-effort / owner-side / gating: patrz nagłówek pliku ───────────────
 */
export async function enrollModuleConceptsOnMasteryPass(
	studentId: string,
	moduleId: string,
): Promise<void> {
	const rows = await db
		.selectDistinct({ conceptId: questionConcepts.id })
		.from(curriculumModuleItems)
		.innerJoin(curriculumItemConcepts, eq(curriculumItemConcepts.itemId, curriculumModuleItems.id))
		.innerJoin(questionConcepts, eq(questionConcepts.id, curriculumItemConcepts.conceptId))
		.where(
			and(
				eq(curriculumModuleItems.moduleId, moduleId),
				eq(questionConcepts.status, "active"),
				eq(questionConcepts.trunk, "market"),
				// Filtr pojemności: koncept ma ≥1 AKTYWNE pytanie TYPU single_choice
				// (korelowany EXISTS). Zawężenie do single_choice = parytet z kolejką R4
				// (loadReviewQuestions serwuje WYŁĄCZNIE single_choice) — patrz nota
				// "FILTR POJEMNOŚCI" w docstringu.
				exists(
					db
						.select({ one: questionItems.id })
						.from(questionItems)
						.where(
							and(
								eq(questionItems.conceptId, questionConcepts.id),
								eq(questionItems.status, "active"),
								eq(questionItems.type, "single_choice"),
							),
						),
				),
			),
		);

	const conceptIds = rows.map((r) => r.conceptId);
	if (conceptIds.length === 0) return;

	// `now` liczony tu (poza gorącą ścieżką egzaminu) — spójny moment zasiewu dla
	// całej paczki konceptów jednego zdanego egzaminu.
	await enrollConcepts(studentId, conceptIds, new Date());
}
