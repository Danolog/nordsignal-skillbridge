/**
 * Dopasowanie projekt ↔ kierunek kariery.
 *
 * Powiązanie jest POŚREDNIE: projekt nie ma kolumny `careerGoal`, ma tylko nazwy
 * kompetencji (`project_competencies.competencyName` = liście ścieżki). Kierunek
 * rozwija się na zbiór nazw kompetencji przez `job_market_data`. Projekt należy do
 * kierunku, jeśli któraś z jego kompetencji WYMAGANYCH (required) pasuje do którejś
 * kompetencji rynku tego kierunku. Ten sam wzorzec porównania nazw co matcher luk
 * (src/lib/ai/match-projects.ts): normalizacja + dopasowanie podłańcuchem w obie strony.
 */

function normalize(s: string): string {
	return s.trim().toLowerCase();
}

/** Czy dwie nazwy kompetencji to praktycznie ta sama (podłańcuch w obie strony). */
export function competencyMatches(a: string, b: string): boolean {
	const na = normalize(a);
	const nb = normalize(b);
	if (!na || !nb) return false;
	return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Czy projekt należy do kierunku. Porównujemy kompetencje projektu (domyślnie tylko
 * `required`, żeby nie przesadzić z szerokimi liśćmi typu „SQL") do zbioru kompetencji
 * rynku danego kierunku.
 */
export function projectMatchesCareer(
	projectCompetencies: Array<{ competencyName: string; role: string }>,
	careerCompetencyNames: string[],
): boolean {
	const required = projectCompetencies.filter((c) => c.role === "required");
	const pool = required.length > 0 ? required : projectCompetencies;
	return pool.some((pc) =>
		careerCompetencyNames.some((cn) => competencyMatches(pc.competencyName, cn)),
	);
}

/**
 * Dla listy projektów i mapy kierunek→kompetencje zwraca dla każdego projektu listę
 * kierunków, do których pasuje. Liczone w pamięci (bez zmian w bazie).
 */
export function computeCareerGoalsForProjects<
	P extends { id: string; competencies: Array<{ competencyName: string; role: string }> },
>(projects: P[], careerToCompetencies: Map<string, string[]>): Map<string, string[]> {
	const out = new Map<string, string[]>();
	for (const project of projects) {
		const goals: string[] = [];
		for (const [careerGoal, compNames] of careerToCompetencies) {
			if (projectMatchesCareer(project.competencies, compNames)) goals.push(careerGoal);
		}
		out.set(project.id, goals);
	}
	return out;
}
