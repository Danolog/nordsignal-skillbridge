/**
 * Czyste funkcje logiki samooceny B4 — moduł produkcyjny.
 *
 * Wyodrębnione z route handlerów, aby:
 *   1. Wyeliminować duplikację kodu między GET/PATCH/advance/tests (lekcja B0).
 *   2. Umożliwić testy jednostkowe bez importowania server-only Next.js.
 *   3. Utrzymać jeden punkt prawdy dla reguł biznesowych (spec §3.4, PRD §4.3).
 *
 * Importowane przez:
 *   - src/app/api/self-assessment/route.ts (GET)
 *   - src/app/api/self-assessment/ratings/[competencyId]/route.ts (PATCH)
 *   - src/app/api/onboarding/advance/route.ts (POST advance)
 *   - tests/unit/b4/*.test.ts
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §3.4–3.5
 * Decyzja mapowania: Darek 2026-06-01 (ratyfikowane, zamknięte — PRD §4.3 KA2)
 */

// Typ wartości kolumny status kompetencji (z Drizzle pgEnum).
// "acquired" = nabyta, "in_progress" = w trakcie, "missing" = brakująca.
export type CompetencyStatus = "acquired" | "in_progress" | "missing";

/**
 * levelToStatus — mapowanie poziom samooceny → status kompetencji w bazie.
 *
 * Decyzja Darka 2026-06-01 (ratyfikowane, zamknięte):
 *   NULL → 'missing'   (nieocenione = brakująca — student nie deklaruje znajomości)
 *   1    → 'missing'   (nie znam)
 *   2    → 'in_progress' (uczę się)
 *   3    → 'acquired'  (znam)
 *   4    → 'acquired'  (dobrze znam)
 *
 * Pokrycie: 5 przypadków (null + 4 wartości) — czerwona linia DoD Bety.
 */
export function levelToStatus(level: number | null): CompetencyStatus {
	if (level === null) return "missing";
	if (level === 1) return "missing";
	if (level === 2) return "in_progress";
	// level 3 i 4: student 'zna' lub 'dobrze zna' → acquired
	return "acquired";
}

/**
 * computeRequiredCount — próg bramujący advance krok 4 → 5.
 *
 * Reguła: min(5, N) — gdy student ma < 5 kompetencji, próg = wszystkie.
 * Backend jest JEDYNYM źródłem prawdy (spec §3.4 „reguła progu").
 * Frontend bramuje CTA „Idź dalej" na tej liczbie — nie zgaduje.
 */
export function computeRequiredCount(total: number): number {
	return Math.min(5, total);
}

/**
 * Kształt pojedynczej kompetencji w odpowiedzi GET /api/self-assessment.
 * Spójność front↔back jest testowana w self-assessment-contract.test.ts.
 */
export interface AssessmentCompetency {
	competencyId: string;
	name: string;
	level: number | null; // 1–4 lub null (null = nieocenione, ○ w UI)
}

/**
 * Kształt pełnej odpowiedzi GET /api/self-assessment.
 */
export interface AssessmentGetResponse {
	assessmentId: string;
	status: "draft" | "submitted";
	requiredCount: number; // min(5, N) — backend jest źródłem prawdy
	competencies: AssessmentCompetency[];
}

/**
 * buildAssessmentResponse — buduje obiekt odpowiedzi GET /api/self-assessment.
 *
 * @param studentId  - ID studenta (używane do assemblyId)
 * @param rows       - wiersze z bazy: id, name, selfAssessment (level 1–4 lub null)
 */
export function buildAssessmentResponse(
	studentId: string,
	rows: Array<{ id: string; name: string; selfAssessment: number | null }>,
): AssessmentGetResponse {
	const requiredCount = computeRequiredCount(rows.length);
	return {
		assessmentId: `asm_${studentId}`,
		status: "draft",
		requiredCount,
		competencies: rows.map((c) => ({
			competencyId: c.id,
			name: c.name,
			level: c.selfAssessment ?? null,
		})),
	};
}

/**
 * Kształt odpowiedzi PATCH /api/self-assessment/ratings/:id.
 */
export interface PatchResponse {
	competencyId: string;
	level: number;
	verifiedByMethod: string;
	savedAt: string;
}

/**
 * Kształt odpowiedzi advance (sukces).
 */
export interface AdvanceResponse {
	success: boolean;
	fromStep: 4;
	toStep: 5;
	nextUrl: string;
}

/**
 * Kształt odpowiedzi advance (błąd 422 — niewystarczająca liczba ocen).
 */
export interface AdvanceErrorResponse {
	error: string;
	ratedCount: number;
	requiredCount: number;
	missing: number;
}

/**
 * evaluateAdvance — sprawdza bramkę progu przed advance krok 4 → 5.
 *
 * Zwraca null gdy próg spełniony (advance OK),
 * albo obiekt błędu 422 gdy za mało ocenionych kompetencji.
 *
 * @param ratedCount - liczba kompetencji z selfAssessment !== null
 * @param total      - łączna liczba kompetencji studenta
 */
export function evaluateAdvance(
	ratedCount: number,
	total: number,
): { ok: true } | { ok: false; body: AdvanceErrorResponse } {
	const requiredCount = computeRequiredCount(total);
	if (ratedCount < requiredCount) {
		return {
			ok: false,
			body: {
				error: "Insufficient ratings",
				ratedCount,
				requiredCount,
				missing: requiredCount - ratedCount,
			},
		};
	}
	return { ok: true };
}
