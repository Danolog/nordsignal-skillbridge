// ============================================================================
// 1E.4 (SLICE R3) — warstwa serwisowa powtórek rozłożonych w czasie (FSRS).
//
// Ten moduł SPINA czysty scheduler (R2, `scheduler.ts` — 0 DB) z bazą: czyta
// kolejkę „na dziś", przelicza stan oceną i zapisuje go transakcyjnie, oraz
// idempotentnie zasiewa nowy koncept do harmonogramu. NIE ocenia treści
// odpowiedzi (to grade.ts w warstwie API R4) i NIE ładuje treści pytań (R4).
//
// ── DECYZJA: OWNER-SIDE (`db`), NIE withTenantContext ──────────────────────
// Wszystkie odczyty i zapisy tego serwisu idą przez połączenie OWNER (`db`),
// z JAWNYM filtrem `student_id` jako granicą najemcy — dokładnie wzorzec
// exam-service.ts (odczyty banku owner-side) i reconcile-verified.ts (zapisy
// owner-side). Powód wymuszony schematem R1 (nagłówek review_states w schema.ts):
//   • review_states — app_student ma grant TYLKO SELECT; każdy UPDATE/INSERT
//     spod roli runtime (withTenantContext → SET LOCAL ROLE app_student) zostałby
//     ODMÓWIONY przez RLS. Zapis stanu MUSI być owner-side.
//   • review_logs — wariant DENY-both (zero grantów app_student/app_faculty);
//     spod roli runtime niedostępny ani do odczytu, ani do zapisu. INSERT logu
//     MUSI być owner-side.
// Owner bypassuje RLS, więc izolacja najemcy NIE jest tu egzekwowana przez bazę —
// jest egzekwowana przez KOD: każde zapytanie ma explicit `student_id`, a wołający
// (trasy R4) rozwiązuje `studentId` z sesji (getStudentByUserId), nigdy z payloadu
// klienta. To ta sama umowa co w exam-service. RLS (0042) pozostaje warstwą obrony
// dla ścieżki runtime (SELECT „co na dziś" studenta w R4), nie dla tego serwisu.
// ============================================================================

import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/pg-error";
import { reviewLogs, reviewStates, students } from "@/lib/db/schema";
import {
	applyRating,
	initCard,
	mapAnswerToRating,
	type ReviewCardState,
	type ReviewStateName,
} from "./scheduler";

/** Cztery legalne fazy FSRS (parytet z CHECK review_states_state_values, 0042). */
const REVIEW_STATE_NAMES: readonly ReviewStateName[] = ["new", "learning", "review", "relearning"];

/**
 * Błąd domenowy: ocena dla konceptu, którego nie ma w harmonogramie studenta.
 * Zasiew (enrollConcept) jest ŚWIADOMIE osobny od oceny — recordReview NIE tworzy
 * wiersza „w locie", bo brak stanu ⟺ koncept nie został zapisany (nie zgadujemy
 * S/D/due). Wołający (trasa R4) mapuje to na 404/409, nie 500.
 */
export class ConceptNotScheduledError extends Error {
	constructor(studentId: string, conceptId: string) {
		super(`Koncept ${conceptId} nie jest w harmonogramie powtórek studenta ${studentId}.`);
		this.name = "ConceptNotScheduledError";
	}
}

/** Błąd domenowy: enrollment dla nieistniejącego studenta (tenant_id nie do ustalenia). */
export class ReviewStudentNotFoundError extends Error {
	constructor(studentId: string) {
		super(`Student ${studentId} nie istnieje — nie można zasiać konceptu do harmonogramu.`);
		this.name = "ReviewStudentNotFoundError";
	}
}

/** Pozycja kolejki „na dziś" — bez treści pytania (tę dokłada R4). */
export interface DueQueueEntry {
	conceptId: string;
	state: ReviewStateName;
	due: Date;
	reps: number;
	lapses: number;
}

/** Wejście oceny — poprawność JUŻ policzona przez grade.ts (R4), nie deklaracja studenta. */
export interface RecordReviewInput {
	/** Pytanie, na które padła ta ocena (ślad audytowy w review_logs). */
	questionItemId: string;
	/** Poprawność deterministyczna (grade.ts) — R3 NIE ocenia treści. */
	isCorrect: boolean;
	/** Pewność sprzed odpowiedzi (MIS.1): 1/2/3 lub NULL gdy sonda OFF. */
	confidence: number | null;
	/** Serwerowa głębokość drabinki podpowiedzi (#217): 0..3. */
	hintDepth: number;
}

/** Wynik oceny — echo poprawności + termin następnej powtórki (dla UI R4). */
export interface RecordReviewResult {
	isCorrect: boolean;
	nextDue: Date;
}

/** Wynik zasiewu — czy wiersz powstał (true) czy koncept już był w harmonogramie (false). */
export interface EnrollResult {
	enrolled: boolean;
}

/** Surowy wiersz review_states w kształcie istotnym dla schedulera (mapowany niżej). */
interface ReviewStateRow {
	stability: number;
	difficulty: number;
	due: Date;
	lastReview: Date | null;
	state: string;
	reps: number;
	lapses: number;
}

/**
 * Wiersz review_states → ReviewCardState (kontrakt „warstwa serwisowa mapuje
 * wiersz ↔ ReviewCardState", nagłówek schema.ts). Czysta i eksportowana, żeby
 * mapowanie dało się przetestować bez bazy (unit R3); głębokie testy zapisu na
 * żywej bazie robi Quinn. `state` jest walidowane, nie rzutowane na ślepo — kolumna
 * ma CHECK, ale korupcja/dryf enuma nie może po cichu wpaść do schedulera.
 */
export function rowToCardState(row: ReviewStateRow): ReviewCardState {
	if (!(REVIEW_STATE_NAMES as readonly string[]).includes(row.state)) {
		throw new Error(`Nielegalna faza review_states.state: "${row.state}" (korupcja/dryf CHECK).`);
	}
	return {
		stability: row.stability,
		difficulty: row.difficulty,
		due: row.due,
		lastReview: row.lastReview,
		state: row.state as ReviewStateName,
		reps: row.reps,
		lapses: row.lapses,
	};
}

/**
 * getDueQueue — kolejka konceptów „na dziś": stan studenta z terminem <= now,
 * najpilniejsze pierwsze. JEDNO zapytanie po indeksie idx_review_states_student_due
 * (student_id, due) — ZERO N+1 (gorąca ścieżka, lekcja z loadExamBank). NIE ładuje
 * treści pytań (to R4). Owner-side z jawnym filtrem student_id (patrz nagłówek).
 */
export async function getDueQueue(
	studentId: string,
	now: Date,
	limit: number,
): Promise<DueQueueEntry[]> {
	const rows = await db
		.select({
			conceptId: reviewStates.conceptId,
			state: reviewStates.state,
			due: reviewStates.due,
			reps: reviewStates.reps,
			lapses: reviewStates.lapses,
		})
		.from(reviewStates)
		.where(and(eq(reviewStates.studentId, studentId), lte(reviewStates.due, now)))
		// Tie-break po conceptId: wiele konceptów zasianych w tej samej chwili ma
		// IDENTYCZNE `due`; bez wtórnego klucza to, które trafią pod `limit`, byłoby
		// niedeterministyczne między wywołaniami (migotanie kolejki, niestabilna
		// paginacja w R4). conceptId (uuid, unikalny) daje stabilny, powtarzalny porządek.
		.orderBy(asc(reviewStates.due), asc(reviewStates.conceptId))
		.limit(limit);
	return rows.map((r) => ({
		conceptId: r.conceptId,
		// CHECK review_states_state_values gwarantuje jedną z czterech faz; zawężenie
		// typu bez kosztu zapytania (walidację twardą robi rowToCardState na ścieżce oceny).
		state: r.state as ReviewStateName,
		due: r.due,
		reps: r.reps,
		lapses: r.lapses,
	}));
}

/**
 * recordReview — zapis oceny powtórki w JEDNEJ TRANSAKCJI (oba zapisy albo żaden):
 *   1. UPDATE review_states nowym stanem FSRS,
 *   2. INSERT review_logs (append-only ślad audytowy).
 * Nie może istnieć stan zaktualizowany bez logu ani log bez aktualizacji stanu —
 * dlatego jedna transakcja owner-side.
 *
 * Wiersz stanu blokujemy `FOR UPDATE` (wzorzec exam answer route): dwie równoległe
 * oceny tego samego konceptu SERIALIZUJĄ się — druga czeka, czyta zaktualizowany
 * stan i nakłada ocenę na aktualny S/D, zamiast nadpisać wynik pierwszej stanem
 * sprzed (lost update). tenant_id logu bierzemy z ZABLOKOWANEGO wiersza stanu
 * (jedno źródło), nie z osobnego zapytania.
 *
 * R3 NIE ocenia treści: `isCorrect` przychodzi policzone z grade.ts (R4). Tu tylko
 * mapujemy sygnał → ocena FSRS, przeliczamy stan i utrwalamy.
 *
 * Błędy: brak stanu → ConceptNotScheduledError (nie tworzymy w locie). 23505
 * (owinięty przez Drizzle w `cause`) NIE MOŻE tu powstać — review_logs jest
 * append-only bez UNIQUE, a UPDATE po kluczu nie narusza unikalności; integralność
 * pilnują FK + blokada wiersza. Helper isUniqueViolation jest więc świadomie
 * używany tylko w enrollConcept (jedyna ścieżka z realnym 23505 na
 * uq_review_states_student_concept).
 */
export async function recordReview(
	studentId: string,
	conceptId: string,
	input: RecordReviewInput,
	now: Date,
): Promise<RecordReviewResult> {
	return db.transaction(async (tx) => {
		const [row] = await tx
			.select({
				tenantId: reviewStates.tenantId,
				stability: reviewStates.stability,
				difficulty: reviewStates.difficulty,
				due: reviewStates.due,
				lastReview: reviewStates.lastReview,
				state: reviewStates.state,
				reps: reviewStates.reps,
				lapses: reviewStates.lapses,
			})
			.from(reviewStates)
			.where(and(eq(reviewStates.studentId, studentId), eq(reviewStates.conceptId, conceptId)))
			.for("update");
		if (!row) {
			throw new ConceptNotScheduledError(studentId, conceptId);
		}

		const rating = mapAnswerToRating(input.isCorrect, input.confidence, input.hintDepth);
		const { nextState, logRow } = applyRating(rowToCardState(row), rating, now);

		await tx
			.update(reviewStates)
			.set({
				stability: nextState.stability,
				difficulty: nextState.difficulty,
				due: nextState.due,
				lastReview: nextState.lastReview,
				state: nextState.state,
				reps: nextState.reps,
				lapses: nextState.lapses,
				updatedAt: now,
			})
			.where(and(eq(reviewStates.studentId, studentId), eq(reviewStates.conceptId, conceptId)));

		await tx.insert(reviewLogs).values({
			studentId,
			tenantId: row.tenantId,
			conceptId,
			questionItemId: input.questionItemId,
			rating: logRow.rating,
			stateBefore: logRow.stateBefore,
			stabilityBefore: logRow.stabilityBefore,
			stabilityAfter: logRow.stabilityAfter,
			difficultyAfter: logRow.difficultyAfter,
			elapsedDays: logRow.elapsedDays,
			scheduledDays: logRow.scheduledDays,
			// reviewedAt = `now` oceny FSRS (spójność śladu audytowego z matematyką stanu),
			// zamiast defaultNow() bazy, który mógłby minimalnie odbiegać od `now`.
			reviewedAt: now,
		});

		return { isCorrect: input.isCorrect, nextDue: nextState.due };
	});
}

/**
 * enrollConcept — IDEMPOTENTNY zasiew konceptu do harmonogramu. INSERT stanu
 * początkowego (initCard, karta 'new' wymagalna od `now`) z ON CONFLICT
 * (student_id, concept_id) DO NOTHING — powtórny zasiew istniejącego konceptu to
 * NO-OP (NIE nadpisuje wypracowanego S/D/due). Fundament idempotencji =
 * uq_review_states_student_concept (0042).
 *
 * `.returning` rozróżnia insert (wiersz wraca → enrolled:true) od konfliktu
 * (pusto → enrolled:false). isUniqueViolation to defensywny bezpiecznik: gdyby
 * ON CONFLICT kiedykolwiek rozminął się z realnym constraintem, wyścig dwóch
 * równoległych zasiewów rzuciłby 23505 (owinięty przez Drizzle w `cause`, jak bug
 * złapany przez W2 w 1E.3) — łapiemy go jako ten sam idempotentny no-op, nie 500.
 *
 * tenant_id bierzemy ze studenta (owner-side, poza gorącą ścieżką — zasiew nie jest
 * kolejką „na dziś"). Brak studenta → ReviewStudentNotFoundError (nie zgadujemy tenanta).
 */
export async function enrollConcept(
	studentId: string,
	conceptId: string,
	now: Date,
	// TODO(R5): sprzężenie z 1E.3 (§4 planu — „niższa stabilność początkowa dla
	// konceptu OBLANEGO na egzaminie"). ŚWIADOMIE NIE implementowane w R3: initCard
	// wymusza init 0/0, a applyRating przy pierwszej ocenie i tak nadpisuje S przez
	// init_stability(rating) — bias na karcie 'new' byłby no-opem (scheduler.ts,
	// decyzja 2 + hook R5/G1). Realny coupling (zasiew jako 'review' z obniżoną S /
	// przesunięcie due / niższe request_retention) = decyzja architektoniczna
	// Ethana w R5. Parametr zarezerwowany, by sygnatura serwisu nie zmieniała się
	// przy wpięciu R5; w R3 nie wpływa na wynik.
	priorFailed?: boolean,
): Promise<EnrollResult> {
	void priorFailed; // R5 hook — świadomie nieużywany w R3 (patrz komentarz sygnatury).

	const [student] = await db
		.select({ tenantId: students.tenantId })
		.from(students)
		.where(eq(students.id, studentId));
	if (!student) {
		throw new ReviewStudentNotFoundError(studentId);
	}

	const seed = initCard(now);
	try {
		const inserted = await db
			.insert(reviewStates)
			.values({
				studentId,
				tenantId: student.tenantId,
				conceptId,
				stability: seed.stability,
				difficulty: seed.difficulty,
				due: seed.due,
				lastReview: seed.lastReview,
				state: seed.state,
				reps: seed.reps,
				lapses: seed.lapses,
			})
			.onConflictDoNothing({
				target: [reviewStates.studentId, reviewStates.conceptId],
			})
			.returning({ id: reviewStates.id });
		return { enrolled: inserted.length > 0 };
	} catch (err) {
		// Bezpiecznik: wyścig zasiewu, gdyby ON CONFLICT nie zadziałał → idempotentny no-op.
		if (isUniqueViolation(err)) {
			return { enrolled: false };
		}
		throw err;
	}
}
