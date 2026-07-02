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
 * Czy projekt należy do kierunku. Porównujemy kompetencje WYMAGANE projektu do zbioru
 * kompetencji rynku danego kierunku. Wymagamy, by WSZYSTKIE wymagane kompetencje projektu
 * pasowały do kierunku (`every`) — inaczej generyczne liście („Python", „SQL", „Git")
 * podpinałyby projekt Data/ML do niemal każdego kierunku (dopasowanie po jednej kompetencji
 * jest za szerokie). Cyber-projekt [SIEM, SOC, Splunk] trafia więc tylko do cyber; data-projekt
 * [Python, Pandas] wypada z cyber (cyber nie ma Pandas).
 */
export function projectMatchesCareer(
	projectCompetencies: Array<{ competencyName: string; role: string }>,
	careerCompetencyNames: string[],
): boolean {
	const required = projectCompetencies.filter((c) => c.role === "required");
	const pool = required.length > 0 ? required : projectCompetencies;
	if (pool.length === 0) return false;
	return pool.every((pc) =>
		careerCompetencyNames.some((cn) => competencyMatches(pc.competencyName, cn)),
	);
}

/**
 * Ile kierunków (spośród wszystkich) wymienia daną kompetencję — miara „generyczności".
 * „SQL"/„Python" są w prawie każdym kierunku (wysoki spread), „SIEM"/„React"/„Tableau" w
 * niewielu (niski spread = wyróżniające). Liczone dopasowaniem rozmytym, jak reszta.
 */
function competencySpread(compName: string, careers: Array<[string, string[]]>): number {
	return careers.filter(([, names]) => names.some((cn) => competencyMatches(compName, cn))).length;
}

// Kompetencja jest „wyróżniająca" dla kierunku, jeśli występuje w co najwyżej tylu kierunkach.
// Próg dobrany tak, by SIEM/Tableau/React kotwiczyły, a SQL/Python/Git/Linux — nie.
const MAX_DISTINCTIVE_SPREAD = 8;

/**
 * Legacy projekty „Data Analyst" (sprzed procesu kuratorskiego QG-1…QG-7 dla nowych
 * ścieżek) — kotwica algorytmiczna (Python/Pandas/Statystyka jako required LUB acquired,
 * niski spread) błędnie przypisywała je też do „Data Scientist", mimo że nigdy nie przeszły
 * runbooka dla tej ścieżki. Jawne wykluczenie per slug+kierunek, dopóki nie ma pola
 * autorstwa/kuratorstwa w schemacie.
 */
const CAREER_EXCLUSIONS: Record<string, Set<string>> = {
	"analiza-wynagrodzen-gus": new Set(["Data Scientist"]),
	"demografia-powiatow": new Set(["Data Scientist"]),
	"analiza-jakosci-powietrza": new Set(["Data Scientist"]),
	"dashboard-edukacja-gus": new Set(["Data Scientist"]),
	"predykcja-cen-mieszkan": new Set(["Data Scientist"]),
	"analiza-budzetow-gmin": new Set(["Data Scientist"]),
	"pipeline-etl-transport": new Set(["Data Scientist"]),
};

/**
 * Blocklist bezpośredni — używany tam, gdzie widok pomija filtr `careerGoals` (np. widok
 * „projekty zamykające lukę", który celowo nie zawęża po kierunku, żeby nie maskować luki
 * słabo zakotwiczonym projektem kuratorskim). Niezależny od algorytmu kotwicy.
 */
export function isProjectExcludedFromCareer(slug: string, careerGoal: string): boolean {
	return CAREER_EXCLUSIONS[slug]?.has(careerGoal) ?? false;
}

/**
 * Autorstwo per konwencja sluga (runbook): prefiks sluga = ścieżka, dla której projekt
 * powstał (`ds-` → Data Scientist, jak `cyber-` → Cybersecurity). Projekty kuratorskie mają
 * wymagane kompetencje albo z KURACJI EKSPERCKIEJ (liście `absent` — poza zrzutem tagów, więc
 * poza pulą `careerToCompetencies` budowaną z job_market_data), albo FUNDAMENTALNE bez
 * wyróżniającej kotwicy (SQL/Git). Inferencja rynkowa gubi je z ICH WŁASNEJ ścieżki (bramka
 * `every` albo brak kotwicy) → w katalogu DS widać było 4 z 10. Przypisujemy je do ścieżki
 * autorskiej JAWNIE, niezależnie od inferencji. Docelowo: kolumna autorstwa w schemacie.
 */
const AUTHORED_CAREER_BY_PREFIX: Array<[string, string]> = [["ds-", "Data Scientist"]];

function authoredCareerForSlug(slug: string): string | null {
	for (const [prefix, careerGoal] of AUTHORED_CAREER_BY_PREFIX) {
		if (slug.startsWith(prefix)) return careerGoal;
	}
	return null;
}

/**
 * Dla listy projektów i mapy kierunek→kompetencje zwraca dla każdego projektu listę
 * kierunków, do których pasuje. Liczone w pamięci (bez zmian w bazie).
 *
 * Projekt trafia do kierunku, gdy JEDNOCZEŚNIE:
 *   (1) BRAMKA: wszystkie jego kompetencje WYMAGANE pasują do kierunku (`projectMatchesCareer`),
 *   (2) KOTWICA: ma co najmniej jedną kompetencję (wymaganą LUB nabywaną) wyróżniającą ten
 *       kierunek — obecną w katalogu kierunku i o niskim spread. To odsiewa projekty oparte
 *       wyłącznie na generycznym „SQL"/„Python" (np. dashboard GUS → Data Analyst, nie cyber).
 */
export function computeCareerGoalsForProjects<
	P extends {
		id: string;
		slug: string;
		competencies: Array<{ competencyName: string; role: string }>;
	},
>(projects: P[], careerToCompetencies: Map<string, string[]>): Map<string, string[]> {
	const careers = [...careerToCompetencies.entries()];
	const spreadCache = new Map<string, number>();
	const spreadOf = (name: string) => {
		const cached = spreadCache.get(name);
		if (cached !== undefined) return cached;
		const s = competencySpread(name, careers);
		spreadCache.set(name, s);
		return s;
	};

	const out = new Map<string, string[]>();
	for (const project of projects) {
		const excluded = CAREER_EXCLUSIONS[project.slug];
		const goals: string[] = [];
		for (const [careerGoal, compNames] of careers) {
			if (excluded?.has(careerGoal)) continue;
			if (!projectMatchesCareer(project.competencies, compNames)) continue;
			// Kotwica: kompetencja projektu obecna w tym kierunku I wyróżniająca (niski spread).
			const anchored = project.competencies.some(
				(pc) =>
					compNames.some((cn) => competencyMatches(pc.competencyName, cn)) &&
					spreadOf(pc.competencyName) <= MAX_DISTINCTIVE_SPREAD,
			);
			if (anchored) goals.push(careerGoal);
		}
		// Ścieżka autorska (prefiks sluga) — dołóż niezależnie od inferencji, jeśli kierunek
		// istnieje w danych rynku i nie jest jawnie wykluczony.
		const authored = authoredCareerForSlug(project.slug);
		if (
			authored &&
			careerToCompetencies.has(authored) &&
			!excluded?.has(authored) &&
			!goals.includes(authored)
		) {
			goals.push(authored);
		}
		out.set(project.id, goals);
	}
	return out;
}
