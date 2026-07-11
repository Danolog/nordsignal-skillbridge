/**
 * Follow-up przeglądu Ethana (1E.1, KRYTYCZNE): jawne mapowanie
 * `students.career_goal` (display-string z modelu kariery, np. "Data Scientist")
 * → `curriculum_path_modules.path_key` (slug ścieżki curriculum).
 *
 * Bez tego mapowania drabina była pusta dla KAŻDEGO realnego studenta
 * (lookup po "Data Scientist" vs ingest pod 'data-science').
 *
 * Pilot ADR-014 D10: wyłącznie ścieżka DS. Cel kariery bez wpisu = curriculum
 * jeszcze nie obejmuje tej ścieżki (drabina pusta zgodnie z prawdą, nie bugiem).
 * Rollout kolejnych ścieżek = nowy wpis tutaj + ingest ich drabin (E2.C).
 */

export const CAREER_GOAL_TO_PATH_KEY: Readonly<Record<string, string>> = {
	"Data Scientist": "data-science",
};

export function pathKeyForCareerGoal(careerGoal: string): string | null {
	return CAREER_GOAL_TO_PATH_KEY[careerGoal] ?? null;
}
