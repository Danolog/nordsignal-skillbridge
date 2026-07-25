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
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { type ExamConfig, parseExamConfig } from "@/lib/curriculum/exam-config";
import { db } from "@/lib/db";
import {
	assessmentSessions,
	curriculumItemAnswers,
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
import {
	clampAttempt,
	EXAM_MAX_ATTEMPTS,
	type ExamBank,
	type ExamResultJson,
	type ExamSlot,
	type ExamVariant,
	parseExamSlotRefs,
} from "./exam";

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

// ============================================================================
// MASZYNA STANÓW CYKLU (P5 D1/D2/D4 Sophii) — scoping podejścia do BIEŻĄCEGO
// cyklu + odmowa 3. próby w S-C. Derywacja z istniejących danych (znaczniki czasu
// assessment_sessions + curriculum_item_answers), ZERO nowej kolumny / migracji.
// ============================================================================

/** Stan cyklu egzaminu dla /start (D1/D2). */
export interface ExamCycleState {
	/** Liczba oblanych sesji w BIEŻĄCYM cyklu (0..EXAM_MAX_ATTEMPTS). */
	failedInCycle: number;
	/** Podejście do zbudowania planu = clampAttempt(failedInCycle + 1) ∈ {1,2}. */
	attempt: number;
	/**
	 * S-C: failedInCycle ≥ EXAM_MAX_ATTEMPTS i correctives bieżącego cyklu NIEODBYTE
	 * → /start odrzuca (nie tworzy sesji). Niezmiennik: correctives odbyte przesuwają
	 * granicę cyklu i zerują failedInCycle, więc `failedInCycle ≥ 2` ⟺ correctives
	 * cyklu nieodbyte — jeden warunek domyka i licznik, i blokadę.
	 */
	correctivesRequired: boolean;
	/**
	 * Paczka correctives bieżącego (zablokowanego) cyklu — z result_json oblanej
	 * cap-2 sesji (P4 ją zapisał; ta sama pokazana przy 2. oblaniu). Obecna ⟺
	 * correctivesRequired.
	 */
	correctivesPackage?: CorrectivesPackage;
}

/**
 * Id atomów UKOŃCZALNYCH (curriculum_module_items kind ∈ theory/exercise) uczących
 * danych konceptów — kręgosłup koncept→atom (jak buildCorrectivesPackage). Tylko te
 * bramkują „correctives odbyte" (D4): lab i koncept-bez-atomu NIE (brak zdarzenia
 * retrieval do sprawdzenia). Zdeduplikowane PER KONCEPT.
 *
 * BATCH (spłata długu N+1): jedno zapytanie dla WSZYSTKICH konceptów oblanych sesji
 * naraz, zwrócone jako mapa koncept→atomy. Wołający składa `requiredItemIds` sesji =
 * dedup unia atomów jej `failedConcepts` — dokładnie ten sam ZBIÓR co dawne
 * per-sesyjne `loadCompletableCorrectiveItemIds(session.failedConcepts)` (zmienia się
 * liczba zapytań, nie semantyka).
 */
async function loadCompletableCorrectiveItemIdsByConcept(
	failedConcepts: readonly string[],
): Promise<Map<string, string[]>> {
	if (failedConcepts.length === 0) return new Map();
	const rows = await db
		.select({ conceptSlug: questionConcepts.slug, itemId: curriculumModuleItems.id })
		.from(questionConcepts)
		.innerJoin(curriculumItemConcepts, eq(curriculumItemConcepts.conceptId, questionConcepts.id))
		.innerJoin(
			curriculumModuleItems,
			and(
				eq(curriculumModuleItems.id, curriculumItemConcepts.itemId),
				inArray(curriculumModuleItems.kind, [...CORRECTIVES_ATOM_KINDS]),
			),
		)
		.where(inArray(questionConcepts.slug, [...failedConcepts]));
	const byConcept = new Map<string, string[]>();
	const seen = new Map<string, Set<string>>();
	for (const r of rows) {
		let list = byConcept.get(r.conceptSlug);
		let seenSet = seen.get(r.conceptSlug);
		if (!list || !seenSet) {
			list = [];
			seenSet = new Set<string>();
			byConcept.set(r.conceptSlug, list);
			seen.set(r.conceptSlug, seenSet);
		}
		if (!seenSet.has(r.itemId)) {
			seenSet.add(r.itemId); // dedup itemId per koncept (jak Set w wersji per-sesja)
			list.push(r.itemId);
		}
	}
	return byConcept;
}

/**
 * Czasy poprawnych re-ukończeń (`answered_at`) per UKOŃCZALNY atom — jedno zapytanie
 * dla WSZYSTKICH wymaganych atomów wszystkich oblanych sesji naraz (batch N+1).
 * Zwraca WSZYSTKIE kwalifikujące `answeredAt` per itemId (nie `min`), bo domknięcie
 * „PO failedAt danej sesji" liczy się per sesja W PAMIĘCI (computeCorrectivesDoneAt).
 *
 * `sinceExclusive` = najwcześniejszy `failedAt` spośród oblanych sesji: bezpieczne
 * przycięcie zapytania. Każda sesja i tak filtruje `answeredAt > swój failedAt`
 * (≥ sinceExclusive) w pamięci — odpowiedzi ≤ sinceExclusive są wykluczone przez
 * KAŻDĄ sesję, więc ich nieobecność tu niczego nie zmienia (dowód równoważności).
 */
async function loadCorrectiveAnswerTimes(
	studentId: string,
	itemIds: readonly string[],
	sinceExclusive: Date,
): Promise<Map<string, Date[]>> {
	if (itemIds.length === 0) return new Map();
	const rows = await db
		.select({
			itemId: curriculumItemAnswers.itemId,
			answeredAt: curriculumItemAnswers.answeredAt,
		})
		.from(curriculumItemAnswers)
		.where(
			and(
				eq(curriculumItemAnswers.studentId, studentId),
				eq(curriculumItemAnswers.isCorrect, true),
				gt(curriculumItemAnswers.answeredAt, sinceExclusive),
				inArray(curriculumItemAnswers.itemId, [...itemIds]),
			),
		);
	const byItem = new Map<string, Date[]>();
	for (const r of rows) {
		const list = byItem.get(r.itemId);
		if (list) list.push(r.answeredAt);
		else byItem.set(r.itemId, [r.answeredAt]);
	}
	return byItem;
}

/**
 * Moment „correctives odbyte" dla OBLANEJ cap-2 sesji (D4) — CZYSTA funkcja (0 DB):
 * każdy UKOŃCZALNY atom paczki ma poprawną odpowiedź retrieval z answered_at PO
 * completed_at (`failedAt`) TEJ sesji. Zwraca czas domknięcia (max po atomach z
 * NAJWCZEŚNIEJSZEJ kwalifikującej odpowiedzi = moment, w którym padł ostatni brakujący
 * atom) albo null, gdy któryś wymagany atom nie ma jeszcze re-ukończenia PO failedAt.
 * Pusty zbiór wymaganych atomów (same koncepty bez atomu / lab) → NIE bramkuje:
 * domknięcie = failedAt sesji (D4 „koncept bez ukończalnego atomu nie może blokować").
 *
 * TO JEST kalka dawnego zapytania `correctivesDoneAt` (min(answered_at) WHERE
 * answered_at > failedAt, group by itemId, wszystkie wymagane obecne, boundary = max),
 * przeniesiona do pamięci — DOKŁADNIE ta sama definicja `doneAt` i te same krawędzie
 * (strict `>` na failedAt, min po kwalifikujących, null gdy któregoś brak, max po
 * atomach). `answersByItem` niesie odpowiedzi już po pruningu `> minFailedAt`; ostry
 * filtr per sesja `> failedAt` egzekwujemy tutaj — równoważny, bo failedAt ≥ minFailedAt.
 */
export function computeCorrectivesDoneAt(
	failedAt: Date,
	requiredItemIds: readonly string[],
	answersByItem: ReadonlyMap<string, readonly Date[]>,
): Date | null {
	if (requiredItemIds.length === 0) return failedAt;
	let boundary = failedAt;
	for (const itemId of requiredItemIds) {
		let firstAt: Date | null = null; // min(answered_at) z tych PO failedAt tej sesji
		for (const t of answersByItem.get(itemId) ?? []) {
			if (t.getTime() <= failedAt.getTime()) continue; // strict `>` failedAt (per sesja)
			if (firstAt === null || t.getTime() < firstAt.getTime()) firstAt = t;
		}
		if (firstAt === null) return null; // wymagany atom bez re-ukończenia → NIEODBYTE
		if (firstAt.getTime() > boundary.getTime()) boundary = firstAt;
	}
	return boundary;
}

/**
 * evaluateExamCycle — stan bieżącego cyklu egzaminu (student, moduł) dla /start.
 *
 * Granica cyklu = najpóźniejsze DOMKNIĘTE correctives spośród oblanych cap-2 sesji
 * (result_json.correctives === true). failedInCycle = oblane sesje z completed_at
 * PO tej granicy → clampAttempt(failedInCycle + 1) naturalnie resetuje podejście do
 * 1 po correctives. Reszta silnika (buildExamPlan/gradeExam/flaga correctives) bez
 * zmian — to jedyna zmiana logiki zliczania (D1).
 *
 * Niezmiennik blokady (D2): w S-C student nie może wystartować 3. sesji, więc
 * NIEDOMKNIĘTE correctives mogą dotyczyć tylko OSTATNIEJ cap-2 sesji (cyklu
 * otwartego). Dlatego max po domkniętych = granica ostatniego zamkniętego cyklu, a
 * `failedInCycle ≥ EXAM_MAX_ATTEMPTS` jednoznacznie znaczy „correctives cyklu
 * nieodbyte" (gdyby były odbyte, granica przesunęłaby się i licznik spadłby < 2).
 */
export async function evaluateExamCycle(
	studentId: string,
	moduleId: string,
): Promise<ExamCycleState> {
	const failed = await db
		.select({
			completedAt: assessmentSessions.completedAt,
			resultJson: assessmentSessions.resultJson,
		})
		.from(assessmentSessions)
		.where(
			and(
				eq(assessmentSessions.studentId, studentId),
				eq(assessmentSessions.kind, "module_exam"),
				eq(assessmentSessions.moduleId, moduleId),
				eq(assessmentSessions.status, "completed"),
				sql`(${assessmentSessions.resultJson} ->> 'passed') = 'false'`,
			),
		)
		.orderBy(asc(assessmentSessions.completedAt));

	// Sesje otwierające bramkę correctives: oblanie cap-2 (correctives === true) z
	// completed_at. Ten sam predykat co dawna pętla (`!result?.correctives || !completedAt
	// → continue`), tylko zebrany raz, by zbatchować zapytania (spłata N+1: dawniej
	// 2 zapytania per taka sesja → dziś 2 zapytania łącznie dla wszystkich).
	const correctiveSessions = failed
		.map((s) => ({ completedAt: s.completedAt, result: s.resultJson as ExamResultJson | null }))
		.filter(
			(s): s is { completedAt: Date; result: ExamResultJson } =>
				Boolean(s.completedAt) && Boolean(s.result?.correctives),
		);

	// BATCH 1: koncept→ukończalne atomy dla wszystkich oblanych sesji. Per sesja
	// składamy `requiredItemIds` = dedup unia atomów jej failedConcepts (identyczny
	// ZBIÓR co dawne loadCompletableCorrectiveItemIds(session.failedConcepts)).
	const allConcepts = [
		...new Set(correctiveSessions.flatMap((s) => s.result.failedConcepts ?? [])),
	];
	const itemIdsByConcept = await loadCompletableCorrectiveItemIdsByConcept(allConcepts);
	const perSession = correctiveSessions.map((s) => {
		const required = new Set<string>();
		for (const concept of s.result.failedConcepts ?? []) {
			for (const id of itemIdsByConcept.get(concept) ?? []) required.add(id);
		}
		return { failedAt: s.completedAt, requiredItemIds: [...required] };
	});

	// BATCH 2: czasy re-ukończeń dla WSZYSTKICH wymaganych atomów naraz, przycięte do
	// answered_at > najwcześniejszego failedAt (bezpieczny prune — patrz
	// loadCorrectiveAnswerTimes). Domknięcie per sesja liczymy w pamięci z zachowanym
	// PER-SESJA failedAt (computeCorrectivesDoneAt) — semantyka `> failedAt` nietknięta.
	const allRequiredItemIds = [...new Set(perSession.flatMap((p) => p.requiredItemIds))];
	const minFailedAt = perSession.reduce<Date | null>(
		(min, p) => (min === null || p.failedAt.getTime() < min.getTime() ? p.failedAt : min),
		null,
	);
	const answersByItem =
		minFailedAt !== null
			? await loadCorrectiveAnswerTimes(studentId, allRequiredItemIds, minFailedAt)
			: new Map<string, Date[]>();

	let lastBoundary: Date | null = null;
	for (const p of perSession) {
		const doneAt = computeCorrectivesDoneAt(p.failedAt, p.requiredItemIds, answersByItem);
		if (doneAt && (!lastBoundary || doneAt.getTime() > lastBoundary.getTime())) {
			lastBoundary = doneAt;
		}
	}

	const inCycle = failed.filter(
		(s) => s.completedAt && (!lastBoundary || s.completedAt.getTime() > lastBoundary.getTime()),
	);
	const failedInCycle = inCycle.length;
	const correctivesRequired = failedInCycle >= EXAM_MAX_ATTEMPTS;
	const attempt = clampAttempt(failedInCycle + 1);

	let correctivesPackage: CorrectivesPackage | undefined;
	if (correctivesRequired) {
		// Paczka zablokowanego cyklu = z result_json ostatniej cap-2 sesji w cyklu
		// (kontrakt D2: ta sama, którą P4 pokazał przy 2. oblaniu).
		for (let i = inCycle.length - 1; i >= 0; i--) {
			const result = inCycle[i].resultJson as ExamResultJson | null;
			if (result?.correctives && result.correctivesPackage) {
				correctivesPackage = result.correctivesPackage;
				break;
			}
		}
	}

	return { failedInCycle, attempt, correctivesRequired, correctivesPackage };
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
