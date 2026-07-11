/**
 * 1.18 — ślady realnej aktywności studenta (decyzja Darka: streak z faktycznej
 * pracy, nie z formularzy). Jedno zapytanie UNION ALL po tabelach, w których
 * aktywność zostawia znacznik czasu:
 *  - project_submissions.updated_at (submit / re-submit / zmiana statusu pracą),
 *  - tutor_turns.created_at (rozmowa z tutorem),
 *  - assessment_answers.answered_at (diagnoza),
 *  - viva_answers.answered_at (obrona),
 *  - project_reflections.updated_at (refleksja),
 *  - study_checkins.created_at (ręczny check-in — też jest aktywnością).
 *
 * Odczyt owner-side (serwer liczy streak dla właściciela sesji; RLS chroni
 * odczyty ról app_*). Okno 26 tygodni — streak dłuższy i tak prezentujemy
 * jako „26+" (cap trzyma koszt zapytania w ryzach).
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";

export const ACTIVITY_WINDOW_WEEKS = 26;

export type ActivityTrace = {
	/** Znaczniki czasu śladów w oknie (malejąco). */
	dates: Date[];
	/** Najświeższy ślad KIEDYKOLWIEK (nie tylko w oknie) — do detekcji zastoju. */
	lastActivityAt: Date | null;
};

export async function getActivityTrace(studentId: string): Promise<ActivityTrace> {
	const windowStart = Date.now() - ACTIVITY_WINDOW_WEEKS * 7 * 24 * 60 * 60 * 1000;
	// Płaskie wiersze zamiast array_agg — node-postgres nie parsuje tablic
	// timestamptz (wracałyby stringiem "{...}"). LIMIT to bezpiecznik kosztu;
	// pierwszy wiersz (ORDER BY DESC) = najświeższy ślad kiedykolwiek.
	// 1E.1f — ślad curriculum WYŁĄCZNIE za zapaloną flagą: przy OFF zapytanie
	// nie dotyka tabeli (bezpieczny deploy na prod PRZED migracją 0035 —
	// lekcja „migracja przed deploy"); przy ON odpowiedź na pytanie atomu
	// liczy się do streaka jak każda realna praca.
	const curriculumTrace = isFeatureEnabled("curriculumPath")
		? sql`
			UNION ALL
			SELECT answered_at FROM curriculum_item_answers WHERE student_id = ${studentId}`
		: sql``;
	const result = await db.execute(sql`
		WITH traces AS (
			SELECT updated_at AS ts FROM project_submissions WHERE student_id = ${studentId}
			UNION ALL
			SELECT created_at FROM tutor_turns WHERE student_id = ${studentId}
			UNION ALL
			SELECT answered_at FROM assessment_answers WHERE student_id = ${studentId}
			UNION ALL
			SELECT answered_at FROM viva_answers WHERE student_id = ${studentId}
			UNION ALL
			SELECT updated_at FROM project_reflections WHERE student_id = ${studentId}
			UNION ALL
			SELECT created_at FROM study_checkins WHERE student_id = ${studentId}${curriculumTrace}
		)
		SELECT ts FROM traces WHERE ts IS NOT NULL ORDER BY ts DESC LIMIT 2000
	`);
	const all = (result.rows as { ts: string | Date }[]).map((r) => new Date(r.ts));
	return {
		dates: all.filter((d) => d.getTime() >= windowStart),
		lastActivityAt: all[0] ?? null,
	};
}
