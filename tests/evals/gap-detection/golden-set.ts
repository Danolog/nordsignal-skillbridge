// ============================================================================
// GOLDEN SET GAP DETECTION (AG.0) — ręcznie zweryfikowane oczekiwane luki.
//
// Model (decyzja Darka 2026-07-07, spójna z market-gaps.ts): luki liczą się
// WYŁĄCZNIE z katalogu rynku (`job_market_data` per ścieżka) minus zaznaczenia
// studenta. Sylabus jest adnotacją informacyjną bez wpływu na luki i pokrycie —
// dlatego golden set NIE zawiera sylabusów.
//
// Przypadek = (ścieżka kariery, zaznaczenia studenta z poziomami 2/3/4) →
// oczekiwane: liczba luk, pokrycie %, sentinele priorytetów (reguła względna
// r = popyt/max: ≥0.66 krytyczna, ≥0.33 ważna), dla wybranych przypadków pełna
// lista nazw luk. Wszystkie wartości policzone RĘCZNIE z artefaktu ETL
// (job-market-justjoinit.json, snapshot 2026-02) i zweryfikowane z regułami
// market-catalog.ts — to jest wzorzec, nie wynik przepuszczenia przez kod.
//
// UWAGA aktualizacyjna: po odświeżeniu artefaktu ETL (AG.3/AG.4) liczności
// i priorytety wymagają ponownej ręcznej weryfikacji — golden set jest
// przypięty do snapshotu 2026-02.
// ============================================================================

import type { GapPriority, PossessionLevel } from "@/lib/onboarding/market-catalog";

export interface GoldenSelection {
	name: string;
	/** Poziom posiadania z samooceny (2 = uczę się, 3 = znam, 4 = dobrze znam). */
	level: PossessionLevel;
	/**
	 * false = nazwa spoza katalogu ścieżki (nie zdejmuje luki, nie liczy się do
	 * pokrycia — front wysyła tylko pozycje katalogu, to strażnik odporności).
	 */
	inCatalog?: boolean;
}

export interface GoldenExpectation {
	/** Liczba luk = rozmiar katalogu − zaznaczenia katalogowe (ręcznie policzona). */
	gapCount: number;
	/** computeMarketCoverage: poziom 2 waży 0.5, poziomy 3/4 ważą 1.0, zaokrąglenie. */
	coveragePercent: number;
	/** Sentinele priorytetów luk — strażnik reguły względnej 0.66/0.33. */
	priorities?: Record<string, GapPriority>;
	/** Pełna, ręcznie zweryfikowana lista nazw luk (tylko wybrane przypadki). */
	gapNames?: string[];
}

export interface GoldenCase {
	id: string;
	/** Co przypadek sprawdza (dokumentacja — trafia do nazwy testu i raportu). */
	title: string;
	careerGoal: string;
	selections: GoldenSelection[];
	expected: GoldenExpectation;
}

// ── Rozmiary katalogów (artefakt 2026-02): DS 21 · Frontend 38 · Cyber 37 ·
//    DevOps 41 · Java 34. Max popytu: DS 55 (Python) · Frontend 60 (JavaScript) ·
//    Cyber 15 (Python) · DevOps 54 (Terraform) · Java 89 (Java). ─────────────

export const GOLDEN_CASES: GoldenCase[] = [
	// ── Data Scientist (21 pozycji, max 55) ──────────────────────────────────
	{
		id: "ds-01",
		title: "świeży student bez zaznaczeń — cały katalog staje się lukami",
		careerGoal: "Data Scientist",
		selections: [],
		expected: {
			gapCount: 21,
			coveragePercent: 0,
			priorities: {
				// 55/55 = 1.0 → krytyczna; 28/55 = 0.51 → ważna; 3/55 = 0.05 → miło-mieć.
				Python: "critical",
				SQL: "important",
				Kafka: "nice_to_have",
			},
			gapNames: [
				"Python",
				"Azure",
				"SQL",
				"Databricks",
				"GCP",
				"LLM",
				"GenAI",
				"Git",
				"AWS",
				"CI/CD",
				"Pandas",
				"Spark",
				"Kafka",
				"Kubernetes",
				"MLOps",
				"PySpark",
				"Terraform",
				"NLP",
				"NumPy",
				"Snowflake",
				"Statystyka (Statistics)",
			],
		},
	},
	{
		id: "ds-02",
		title: "typowy student po 2 roku — 6 zaznaczeń, pełna lista luk",
		careerGoal: "Data Scientist",
		selections: [
			{ name: "Python", level: 3 },
			{ name: "SQL", level: 2 },
			{ name: "Git", level: 4 },
			{ name: "Statystyka (Statistics)", level: 2 },
			{ name: "NumPy", level: 2 },
			{ name: "Pandas", level: 3 },
		],
		expected: {
			// Pokrycie: 1 + 0.5 + 1 + 0.5 + 0.5 + 1 = 4.5/21 = 21.4 → 21.
			gapCount: 15,
			coveragePercent: 21,
			priorities: {
				// 29/55 = 0.53 i 19/55 = 0.345 → ważne; 12/55 = 0.22 → miło-mieć.
				Azure: "important",
				GCP: "important",
				LLM: "nice_to_have",
			},
			gapNames: [
				"Azure",
				"Databricks",
				"GCP",
				"LLM",
				"GenAI",
				"AWS",
				"CI/CD",
				"Spark",
				"Kafka",
				"Kubernetes",
				"MLOps",
				"PySpark",
				"Terraform",
				"NLP",
				"Snowflake",
			],
		},
	},
	{
		id: "ds-03",
		title: "normalizacja zaznaczeń — wielkość liter i białe znaki nie tworzą luk-duplikatów",
		careerGoal: "Data Scientist",
		selections: [
			{ name: " python ", level: 4 },
			{ name: "sql", level: 3 },
			{ name: "GIT", level: 2 },
		],
		expected: {
			// Pokrycie: 1 + 1 + 0.5 = 2.5/21 = 11.9 → 12.
			gapCount: 18,
			coveragePercent: 12,
		},
	},
	{
		id: "ds-04",
		title: "komplet zaznaczeń na poziomie 4 — zero luk, pokrycie 100%",
		careerGoal: "Data Scientist",
		selections: [
			{ name: "Python", level: 4 },
			{ name: "Azure", level: 4 },
			{ name: "SQL", level: 4 },
			{ name: "Databricks", level: 4 },
			{ name: "GCP", level: 4 },
			{ name: "LLM", level: 4 },
			{ name: "GenAI", level: 4 },
			{ name: "Git", level: 4 },
			{ name: "AWS", level: 4 },
			{ name: "CI/CD", level: 4 },
			{ name: "Pandas", level: 4 },
			{ name: "Spark", level: 4 },
			{ name: "Kafka", level: 4 },
			{ name: "Kubernetes", level: 4 },
			{ name: "MLOps", level: 4 },
			{ name: "PySpark", level: 4 },
			{ name: "Terraform", level: 4 },
			{ name: "NLP", level: 4 },
			{ name: "NumPy", level: 4 },
			{ name: "Snowflake", level: 4 },
			{ name: "Statystyka (Statistics)", level: 4 },
		],
		expected: { gapCount: 0, coveragePercent: 100 },
	},

	// ── Frontend Developer (38 pozycji, max 60) ──────────────────────────────
	{
		id: "fe-01",
		title: "frontend w połowie studiów — podstawy webu bez frameworków",
		careerGoal: "Frontend Developer",
		selections: [
			{ name: "HTML", level: 4 },
			{ name: "CSS", level: 4 },
			{ name: "JavaScript", level: 3 },
			{ name: "Git", level: 3 },
		],
		expected: {
			// Pokrycie: 4×1.0 = 4/38 = 10.5 → 11.
			gapCount: 34,
			coveragePercent: 11,
			priorities: {
				// 58/60 = 0.97 i 55/60 = 0.92 → krytyczne; 26/60 = 0.43 → ważna;
				// 2/60 = 0.03 → miło-mieć.
				TypeScript: "critical",
				React: "critical",
				Angular: "important",
				Jest: "nice_to_have",
			},
		},
	},
	{
		id: "fe-02",
		title: "poziom 2 waży połowę — pięć zaznaczeń „uczę się” + granica ważności REST / API",
		careerGoal: "Frontend Developer",
		selections: [
			{ name: "JavaScript", level: 2 },
			{ name: "TypeScript", level: 2 },
			{ name: "React", level: 2 },
			{ name: "HTML", level: 2 },
			{ name: "CSS", level: 2 },
		],
		expected: {
			// Pokrycie: 5×0.5 = 2.5/38 = 6.6 → 7.
			gapCount: 33,
			coveragePercent: 7,
			priorities: {
				// GRANICA: 20/60 = 0.3333… ≥ 0.33 → ważna (pęknie przy zmianie progu
				// PRIORITY_R_IMPORTANT albo zaokrągleń). 15/60 = 0.25 → miło-mieć.
				"REST / API": "important",
				"Node.js": "important",
				Git: "nice_to_have",
			},
		},
	},

	// ── Cybersecurity Specialist (37 pozycji, max 15 — ścieżka rozdrobniona) ──
	{
		id: "cyber-01",
		title: "ścieżka rozdrobniona — auto-normalizacja reguły względnej (max popytu 15%)",
		careerGoal: "Cybersecurity Specialist",
		selections: [],
		expected: {
			gapCount: 37,
			coveragePercent: 0,
			priorities: {
				// Progi bezwzględne 60/40 dałyby tu WSZYSTKO jako miło-mieć — reguła
				// względna trzyma rdzeń roli na górze: 11/15 = 0.73 → krytyczna;
				// GRANICA: 5/15 = 0.3333… ≥ 0.33 → ważna; 4/15 = 0.27 → miło-mieć.
				Python: "critical",
				SIEM: "critical",
				SOC: "important",
				GCP: "important",
				Splunk: "nice_to_have",
				"Active Directory": "nice_to_have",
			},
		},
	},
	{
		id: "cyber-02",
		title: "student po kursie SOC — zaznaczony rdzeń monitoringu",
		careerGoal: "Cybersecurity Specialist",
		selections: [
			{ name: "SIEM", level: 3 },
			{ name: "SOC", level: 3 },
			{ name: "Splunk", level: 2 },
			{ name: "Linux", level: 3 },
			{ name: "Windows", level: 4 },
			{ name: "TCP/IP", level: 3 },
		],
		expected: {
			// Pokrycie: 1 + 1 + 0.5 + 1 + 1 + 1 = 5.5/37 = 14.9 → 15.
			gapCount: 31,
			coveragePercent: 15,
			priorities: { Python: "critical" },
		},
	},

	// ── DevOps Engineer (41 pozycji, max 54) ─────────────────────────────────
	{
		id: "devops-01",
		title: "adminowe podstawy — luki w rdzeniu automatyzacji",
		careerGoal: "DevOps Engineer",
		selections: [
			{ name: "Linux", level: 4 },
			{ name: "Bash", level: 4 },
			{ name: "Windows Server", level: 3 },
			{ name: "VMware", level: 2 },
			{ name: "Sieci (Network)", level: 3 },
			{ name: "Active Directory", level: 3 },
		],
		expected: {
			// Pokrycie: 1 + 1 + 1 + 0.5 + 1 + 1 = 5.5/41 = 13.4 → 13.
			gapCount: 35,
			coveragePercent: 13,
			priorities: {
				// 40/54 = 0.74 → krytyczna; 27/54 = 0.5 → ważna; GRANICA ODWROTNA:
				// 17/54 = 0.315 < 0.33 → miło-mieć (tuż pod progiem); 13/54 = 0.24.
				Terraform: "critical",
				Kubernetes: "critical",
				"CI/CD": "critical",
				Docker: "important",
				"Azure DevOps": "nice_to_have",
				GCP: "nice_to_have",
			},
		},
	},
	{
		id: "devops-02",
		title: "nazwa spoza katalogu nie zdejmuje luk i nie liczy się do pokrycia",
		careerGoal: "DevOps Engineer",
		selections: [
			{ name: "Docker", level: 3 },
			{ name: "Kubernetes", level: 2 },
			{ name: "Terraform", level: 3 },
			{ name: "OpenTofu", level: 4, inCatalog: false },
		],
		expected: {
			// Luki: 41 − 3 (OpenTofu niczego nie zdejmuje — nie ma go w katalogu).
			// Pokrycie z pozycji katalogowych: 1 + 0.5 + 1 = 2.5/41 = 6.1 → 6.
			gapCount: 38,
			coveragePercent: 6,
		},
	},

	// ── Java Developer (34 pozycje, max 89) ──────────────────────────────────
	{
		id: "java-01",
		title: "granica priorytetu — SQL 29/89 = 0.326 tuż pod progiem ważności",
		careerGoal: "Java Developer",
		selections: [],
		expected: {
			gapCount: 34,
			coveragePercent: 0,
			priorities: {
				// 89/89 = 1.0 i 77/89 = 0.87 → krytyczne; 33/89 = 0.371 → ważna;
				// GRANICA: 29/89 = 0.3258 < 0.33 → miło-mieć (strażnik progu i
				// ewentualnych zaokrągleń r); 24/89 = 0.27 → miło-mieć.
				Java: "critical",
				"Spring / Spring Boot": "critical",
				Kafka: "important",
				SQL: "nice_to_have",
				Hibernate: "nice_to_have",
			},
		},
	},
	{
		id: "java-02",
		title: "zaznaczony rdzeń javowy — luka Kafka zostaje ważna",
		careerGoal: "Java Developer",
		selections: [
			{ name: "Java", level: 4 },
			{ name: "Spring / Spring Boot", level: 3 },
			{ name: "SQL", level: 3 },
			{ name: "Git", level: 4 },
			{ name: "Docker", level: 2 },
			{ name: "Maven", level: 3 },
		],
		expected: {
			// Pokrycie: 1 + 1 + 1 + 1 + 0.5 + 1 = 5.5/34 = 16.2 → 16.
			gapCount: 28,
			coveragePercent: 16,
			priorities: { Kafka: "important", PostgreSQL: "nice_to_have" },
		},
	},
];

/**
 * Próbki dla sędziego opisów luk (generate-why): realne pozycje katalogu
 * z realnym % popytu — od rdzenia roli (55%) po rozdrobniony rynek (11%).
 */
export const WHY_JUDGE_SAMPLES = [
	{ competencyName: "Python", careerGoal: "Data Scientist", marketPercentage: 55 },
	{ competencyName: "SIEM", careerGoal: "Cybersecurity Specialist", marketPercentage: 11 },
	{ competencyName: "Kafka", careerGoal: "Java Developer", marketPercentage: 33 },
	{ competencyName: "HTML", careerGoal: "Frontend Developer", marketPercentage: 39 },
] as const;
