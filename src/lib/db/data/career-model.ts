// ============================================================================
// MODEL KARIERY v4.0 — hierarchia obszar→konkret + bank projektów
//
// Kuracja Sophii v4.0 (scratchpad/sophia-merged-model.md). Decyzja Darka (4 dyrektywy):
//   (1) % popytu przy KAŻDEJ kompetencji (liść też),
//   (2) hierarchia: obszar wiedzy (duży % ścieżki) → narzędzia-liście (własny realny %),
//   (3) koniec ramki junior/senior — wszystkie ~23 kotwice widoczne; „Software Engineer"
//       → „Embedded / C++ Developer",
//   (4) bank projektów 3-poziomowy, projekt kotwiczy na liściu.
//
// TEN PLIK = STRUKTURA (deklaratywna, od Sophii): jakie ścieżki, jakie obszary,
// jakie liście, jakie warianty nazw, jakie projekty. PROCENTY liczy silnik
// (tools/etl-justjoinit.ts) z danych — tu ich NIE wpisujemy (poza obszarami, których
// % bierze z popytu ścieżki). Wynik: src/lib/db/data/career-model.json.
//
// SCHEMA: świadomie NIE migrujemy (czerwona linia Darka). `jobMarketData` zostaje
// płaski (liście-konkrety z realnym %); hierarchia + projekty + typy węzłów żyją tu
// i w career-model.json, konsumowane przez kod aplikacji. Rekomendacja tabeli pod
// projekty = osobny sign-off Ethana/Darka (patrz docs/data/job-market-provenance.md).
// ============================================================================

// ── Typy węzłów hierarchii ───────────────────────────────────────────────────
//
// Rozróżnienie Sophii (§0): obszar wiedzy z REALNYM % (z danych — np. AI 53%) vs
// grupnik prezentacyjny BEZ % (jej etykieta organizacyjna — np. „Wizualizacja BI").
// UI renderuje liczbę tylko tam, gdzie jest realny %.
//
//  - "knowledge-area"        — obszar wiedzy; % = popyt ścieżki na tę nazwę (z danych).
//  - "presentation-group"    — grupnik prezentacyjny; % = null (etykieta Sophii).
//  - "leaf"                  — narzędzie-konkret; % liczony w obrębie ścieżki (bez progu).
export type NodeType = "knowledge-area" | "presentation-group" | "leaf";

/** Źródło % liścia. "dane" = policzone z CSV; "kuracja ekspercka" = brak w zrzucie. */
export type LeafSource = "dane" | "kuracja ekspercka";

/** Liść-konkret (narzędzie). % wlicza silnik; tu deklarujemy nazwę + wariant + źródło. */
export type LeafSpec = {
	name: string; // nazwa wyświetlana (jak w modelu/przewodniku)
	// Nazwa(-y) do zliczania w danych (wariant obecny w zrzucie). Gdy brak — używa `name`.
	// Tablica = sumuj warianty (np. Airflow + Apache Airflow).
	countAs?: string[];
	// true = narzędzie realnie nieobecne w zrzucie 2026-02 → demandPercentage:null,
	// source:"kuracja ekspercka", label „brak w zrzucie 2026-02".
	absent?: boolean;
};

/** Obszar wiedzy lub grupnik prezentacyjny → liście. */
export type AreaSpec = {
	name: string; // nazwa obszaru/grupnika
	type: "knowledge-area" | "presentation-group";
	// Dla "knowledge-area": nazwa(-y) liczone jako % popytu ścieżki (z danych).
	// Brak → % liczony z `name`. Dla "presentation-group" ignorowane (% = null).
	demandAs?: string[];
	leaves: LeafSpec[];
};

/** Ścieżka kariery (kotwica) z hierarchią + (opcjonalnie) notką. */
export type PathSpec = {
	label: string; // MUSI zgadzać się z `careerGoal` w artefakcie jobMarketData
	note?: string; // krótka informacja (np. „rola docelowa")
	areas: AreaSpec[];
};

// ── Bank projektów (3 poziomy) ───────────────────────────────────────────────
// v5 (Sophia §7): drabina junior→senior. Poziom „latwy" = junior bez doświadczenia,
// „zaawansowany" = mid/senior. anchorLeaves MUSZĄ być podzbiorem liści ścieżki
// (zweryfikowane względem policzonego %); marketRationale = „dlaczego te liście".

export type ProjectLevel = "latwy" | "sredni" | "zaawansowany";

export type ProjectSpec = {
	level: ProjectLevel;
	title: string;
	anchorLeaves: string[]; // liście-konkrety, na których kotwiczy projekt
	description: string;
	portfolioOutcome: string; // co student pokazuje pracodawcy
	marketRationale?: string; // v5: jednozdaniowe „dlaczego te liście" (popyt rynku)
	todo?: boolean; // true = luka — szablon do wypełnienia w kolejnej iteracji
};

// ── v5: rodziny e-CF + ramy per ścieżka + warstwa juniora ────────────────────

/** Pięć rodzin e-CF (makro-procesy EN 16234) — grupowanie nadrzędne (Sophia §1). */
export const FAMILIES: Array<{ id: string; name: string; eCfArea: string }> = [
	{ id: "I", name: "Dane i Sztuczna Inteligencja", eCfArea: "PLAN / BUILD / ENABLE" },
	{ id: "II", name: "Inżynieria Oprogramowania", eCfArea: "BUILD" },
	{ id: "III", name: "Infrastruktura, Chmura i Bezpieczeństwo", eCfArea: "RUN / ENABLE" },
	{ id: "IV", name: "Jakość, Testy i Architektura", eCfArea: "PLAN / ENABLE" },
	{ id: "V", name: "Zarządzanie, Produkt i Systemy Biznesowe", eCfArea: "MANAGE / PLAN" },
];

/** Ramy kompetencyjne ścieżki (Sophia §3 — dziedziczone ze ścieżki dokumentu). */
export type PathFrameworks = {
	family: string; // nazwa rodziny e-CF (np. „I — Dane i Sztuczna Inteligencja")
	eCfArea: string; // procesy e-CF
	sfiaCategory: string;
	iscoCode: string;
	iscoLabel: string;
	escoOccupation: string;
};

/** Metadane produktowe ścieżki v5: ramy + warstwa juniora. Klucz = label ścieżki. */
export type PathMeta = {
	frameworks: PathFrameworks;
	juniorFriendliness: "Wysoka" | "Średnia" | "Niska" | "rola docelowa";
	targetRole: boolean; // rola docelowa (widoczna, nie punkt startu)
	tShapePairs: string[]; // ścieżki łączone T-shape (Sophia §4d)
	note?: string; // nadpisuje note z PathSpec, jeśli podane
};

/** Pomocnik: składa nazwę rodziny „<id> — <name>" z FAMILIES. */
function familyName(id: string): string {
	const f = FAMILIES.find((x) => x.id === id);
	return f ? `${f.id} — ${f.name}` : id;
}

/**
 * Szablon-zaślepka projektu dla ścieżki bez napisanego zestawu (Sophia §7: kolejna
 * iteracja, nie zgadujemy). `topLeaves` = wskazówka, na których top-liściach
 * (już policzonych w hierarchii) ma się oprzeć projekt. todo:true.
 */
function todoProject(path: string, topLeaves: string): ProjectSpec {
	return {
		level: "latwy",
		title: `(do dopisania) Projekty 3-poziomowe dla ${path}`,
		anchorLeaves: [],
		description: `Szablon gotowy — top liście do zakotwiczenia: ${topLeaves}. Pełne 3 poziomy w kolejnej iteracji produktowej Sophii (metoda autorowania: projekt z top buildable-leaves ścieżki).`,
		portfolioOutcome: "(do uzupełnienia)",
		todo: true,
	};
}

// ── RAMY + WARSTWA JUNIORA PER ŚCIEŻKA (Sophia §3, §4) ───────────────────────
// Klucz = label ścieżki (musi zgadzać się z PATHS i z `careerGoal` w artefakcie).
// DWIE FINALNE ZMIANY DARKA: (1) Business Analyst → Rodzina V (nie I — konkret BA
// to UML/BPMN/analiza systemowa, ISCO 2511); (2) widełki precz (obsłużone w silniku).
export const PATH_META: Record<string, PathMeta> = {
	"Data Engineer": {
		frameworks: {
			family: familyName("I"),
			eCfArea: "BUILD + ENABLE",
			sfiaCategory: "Development & Implementation (Data engineering) · Strategy & Architecture",
			iscoCode: "ISCO 251 / 252",
			iscoLabel: "ICT professionals",
			escoOccupation: "data engineer",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: ["Data Scientist"],
	},
	"Data Analyst": {
		frameworks: {
			family: familyName("I"),
			eCfArea: "BUILD + ENABLE",
			sfiaCategory: "Development & Implementation (Data engineering)",
			iscoCode: "ISCO 252",
			iscoLabel: "Database and network professionals",
			escoOccupation: "data analyst",
		},
		juniorFriendliness: "Wysoka",
		targetRole: false,
		tShapePairs: ["Data Scientist"],
	},
	// DARK: Business Analyst → Rodzina V (nie I).
	"Business Analyst": {
		frameworks: {
			family: familyName("V"),
			eCfArea: "PLAN + ENABLE",
			sfiaCategory: "Change & Transformation (Business analysis)",
			iscoCode: "ISCO 2511",
			iscoLabel: "Systems analysts",
			escoOccupation: "business analyst",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: [],
	},
	"Data Scientist": {
		frameworks: {
			family: familyName("I"),
			eCfArea: "PLAN + BUILD",
			sfiaCategory: "Development & Implementation (Data science, ML)",
			iscoCode: "ISCO 25",
			iscoLabel: "ICT professionals",
			escoOccupation: "data scientist",
		},
		juniorFriendliness: "Niska",
		targetRole: false,
		tShapePairs: [],
	},
	"AI Engineer": {
		frameworks: {
			family: familyName("I"),
			eCfArea: "PLAN + BUILD",
			sfiaCategory: "Development & Implementation (Machine learning)",
			iscoCode: "ISCO 25",
			iscoLabel: "ICT professionals",
			escoOccupation: "Machine Learning Engineer",
		},
		juniorFriendliness: "Niska",
		targetRole: false,
		tShapePairs: [],
	},
	"Java Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation (Programming / software development)",
			iscoCode: "ISCO 2512",
			iscoLabel: "Software developers",
			escoOccupation: "software developer",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: ["DevOps Engineer"],
	},
	".NET Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation (Programming / software development)",
			iscoCode: "ISCO 2512",
			iscoLabel: "Software developers",
			escoOccupation: "software developer",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: ["DevOps Engineer"],
	},
	"Python Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation",
			iscoCode: "ISCO 2512 / 2514",
			iscoLabel: "Software / applications developers",
			escoOccupation: "software developer",
		},
		juniorFriendliness: "Wysoka",
		targetRole: false,
		tShapePairs: ["DevOps Engineer"],
	},
	"Backend Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation",
			iscoCode: "ISCO 2512 / 2514",
			iscoLabel: "Software / applications developers",
			escoOccupation: "software developer",
		},
		juniorFriendliness: "Wysoka",
		targetRole: false,
		tShapePairs: ["DevOps Engineer"],
	},
	"PHP Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation",
			iscoCode: "ISCO 2514",
			iscoLabel: "Applications programmers",
			escoOccupation: "software developer",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: [],
	},
	"Embedded / C++ Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation",
			iscoCode: "ISCO 2512",
			iscoLabel: "Software developers",
			escoOccupation: "embedded systems developer",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: [],
	},
	"Frontend Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation",
			iscoCode: "ISCO 2513",
			iscoLabel: "Web and multimedia developers",
			escoOccupation: "front-end developer",
		},
		juniorFriendliness: "Wysoka",
		targetRole: false,
		tShapePairs: ["UX/UI Designer"],
	},
	"Full-Stack Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation",
			iscoCode: "ISCO 2513 / 2512",
			iscoLabel: "Web developers / software developers",
			escoOccupation: "full-stack developer",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: ["UX/UI Designer", "DevOps Engineer"],
	},
	"Android Developer": {
		frameworks: {
			family: familyName("II"),
			eCfArea: "BUILD",
			sfiaCategory: "Development & Implementation",
			iscoCode: "ISCO 2514 / 2513",
			iscoLabel: "Applications programmers",
			escoOccupation: "mobile application developer",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: [],
	},
	"DevOps Engineer": {
		frameworks: {
			family: familyName("III"),
			eCfArea: "RUN + BUILD",
			sfiaCategory: "Delivery & Operations (Systems / infrastructure)",
			iscoCode: "ISCO 2522",
			iscoLabel: "Systems administrators",
			escoOccupation: "DevOps engineer",
		},
		juniorFriendliness: "Niska",
		targetRole: false,
		tShapePairs: [],
	},
	"Cybersecurity Specialist": {
		frameworks: {
			family: familyName("III"),
			eCfArea: "RUN + ENABLE",
			sfiaCategory: "Security (Delivery & Operations / Strategy)",
			iscoCode: "ISCO 2529",
			iscoLabel: "ICT security specialists",
			escoOccupation: "ICT security specialist",
		},
		juniorFriendliness: "Niska",
		targetRole: false,
		tShapePairs: [],
	},
	"QA Engineer": {
		frameworks: {
			family: familyName("IV"),
			eCfArea: "BUILD + ENABLE",
			sfiaCategory: "Development & Implementation (Testing) / Skills & Quality",
			iscoCode: "ISCO 251",
			iscoLabel: "ICT professionals",
			escoOccupation: "software tester",
		},
		juniorFriendliness: "Wysoka",
		targetRole: false,
		tShapePairs: ["DevOps Engineer"],
	},
	"Solution Architect": {
		frameworks: {
			family: familyName("IV"),
			eCfArea: "PLAN",
			sfiaCategory: "Strategy & Architecture (Solution / Enterprise architecture)",
			iscoCode: "ISCO 2511 / 133",
			iscoLabel: "ICT system architect / ICT managers",
			escoOccupation: "ICT system architect",
		},
		juniorFriendliness: "rola docelowa",
		targetRole: true,
		tShapePairs: [],
		note: "Rola docelowa, nie punkt startu — wymaga podstaw programistycznych. Widoczna jako cel awansu.",
	},
	"Engineering Manager": {
		frameworks: {
			family: familyName("IV"),
			eCfArea: "MANAGE",
			sfiaCategory: "Change & Transformation + Relationships & Engagement",
			iscoCode: "ISCO 133 / 1330",
			iscoLabel: "ICT managers",
			escoOccupation: "ICT manager",
		},
		juniorFriendliness: "rola docelowa",
		targetRole: true,
		tShapePairs: [],
		note: "Rola docelowa (po latach) — knowledge-heavy. Widoczna jako ścieżka awansu, nie punkt startu.",
	},
	"Project Manager": {
		frameworks: {
			family: familyName("V"),
			eCfArea: "MANAGE",
			sfiaCategory: "Change & Transformation + Relationships & Engagement",
			iscoCode: "ISCO 1330",
			iscoLabel: "ICT service managers",
			escoOccupation: "project manager",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: [],
	},
	"Product Owner / Manager": {
		frameworks: {
			family: familyName("V"),
			eCfArea: "MANAGE / PLAN",
			sfiaCategory: "Change & Transformation",
			iscoCode: "ISCO 1330",
			iscoLabel: "ICT service managers",
			escoOccupation: "product owner",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: [],
	},
	"Salesforce Developer": {
		frameworks: {
			family: familyName("V"),
			eCfArea: "BUILD + ENABLE + MANAGE",
			sfiaCategory: "Change & Transformation (Business analysis) / Delivery & Operations",
			iscoCode: "ISCO 2511",
			iscoLabel: "Systems analysts",
			escoOccupation: "ERP/CRM consultant",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: [],
	},
	"UX/UI Designer": {
		frameworks: {
			family: familyName("V"),
			eCfArea: "PLAN + ENABLE",
			sfiaCategory: "Development & Implementation (User experience)",
			iscoCode: "ISCO 2166",
			iscoLabel: "Graphic and multimedia designers",
			escoOccupation: "UX designer",
		},
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: ["Frontend Developer"],
	},
};

// ── HIERARCHIA PER ŚCIEŻKA (Sophia §1, v4 — ZAMROŻONA warstwa) ───────────────
// Procenty obszarów/liści NIE są tu wpisane — liczy je silnik z danych. Wyjątek:
// nazwy wariantów (countAs/demandAs) i flaga absent — to wkład kuracji, nie dane.

export const PATHS: PathSpec[] = [
	{
		// KURACJA SOPHII 2026-06-27 (lift-branch, Tor 1) — zastępuje stereotyp pentest.
		// Polski rynek cyber = monitoring (SIEM/SOC) + tożsamość (IAM/PAM) + zgodność
		// (GRC/NIST), NIE testy penetracyjne. Lista wg krotności w danych JustJoinIT
		// 2026-02; §7: silnik liczy %, człowiek (Sophia) zatwierdza zestaw. countAs
		// zweryfikowane wobec realnych napisów w CSV (Ethan). Wyrzucone z uzasadnieniem:
		// Burp/Kali/Metasploit/Nmap/Wireshark (n=1-2, pentest); Python (krotność 0,73 —
		// rzadszy w cyber niż rynek); AWS/Azure (generyczna chmura); OAuth2/JWT/Keycloak
		// (tagi backend-dev, ~0% w ofertach security).
		label: "Cybersecurity Specialist",
		note: "Polski rynek cyber = monitoring bezpieczeństwa (SIEM/SOC) + tożsamość (IAM/PAM) + zgodność (GRC/NIST), nie testy penetracyjne. Lista wg krotności w danych JustJoinIT 2026-02 — kuracja Sophii.",
		areas: [
			{
				// Filar 1 — najsilniejszy realny sygnał roli (obszar SIEM ~12% popytu ścieżki).
				name: "Monitoring i reagowanie (SIEM / SOC)",
				type: "knowledge-area",
				demandAs: ["SIEM"],
				leaves: [
					{ name: "SIEM" },
					{ name: "SOC", countAs: ["SoC"] },
					{ name: "Splunk", countAs: ["Splunk", "Splunk Enterprise Security"] },
					{ name: "SOAR" },
					{ name: "EDR / XDR", countAs: ["EDR", "EDR/XDR", "EDR / XDR"] },
					{ name: "Microsoft Defender" },
					{ name: "CrowdStrike", countAs: ["Crowdstrike"] },
					{ name: "Incident Response" }, // n=3 < bramka — w hierarchii, poza katalogiem studenta
				],
			},
			{
				// Filar 2 — tożsamość i dostęp (polski rynek = zarządzanie tożsamością, nie pentest).
				name: "Tożsamość i dostęp (IAM / PAM)",
				type: "knowledge-area",
				demandAs: ["IAM"],
				leaves: [
					{ name: "PAM" },
					{ name: "CyberArk" }, // weryfikacja Ethan: n=9 ≥4 → present (Sophia: absent)
					{ name: "Active Directory", countAs: ["Active Directory", "Active Directory (AD)"] },
					{ name: "IAM" }, // weryfikacja Ethan: n=27 ≥4 → present (Sophia: absent)
				],
			},
			{
				// Filar 3 — zgodność i ład (banki, korpo, RODO definiują polski rynek cyber).
				name: "Zgodność i ład (GRC / standardy)",
				type: "knowledge-area",
				demandAs: ["GRC"],
				leaves: [
					{ name: "NIST" },
					{ name: "GRC" },
					{ name: "DLP" }, // n=4 < bramka — w hierarchii, poza katalogiem studenta
					{ name: "OWASP" }, // weryfikacja Ethan: n=11 ≥4 → present (Sophia: absent)
					{
						name: "ISO 27001", // weryfikacja Ethan: n=8 ≥4 → present (Sophia: absent)
						countAs: ["ISO 27001", "ISO 27001 - Information Security Management", "ISO27001"],
					},
				],
			},
			{
				// Filar 4 — fundament techniczny (wejście juniora: sieci/systemy; T-shape Admin→Cyber).
				name: "Fundament: sieci i systemy",
				type: "presentation-group",
				leaves: [
					{ name: "Linux" },
					{ name: "Network" },
					{ name: "Firewall / IDS-IPS", countAs: ["Firewall", "IDS/IPS"] },
					{ name: "DevSecOps" }, // weryfikacja Ethan: n=10 ≥4 → present (Sophia: absent)
				],
			},
		],
	},
	{
		label: "AI Engineer",
		areas: [
			{
				name: "AI",
				type: "knowledge-area",
				leaves: [{ name: "LangChain", countAs: ["Langchain"] }, { name: "Hugging Face" }],
			},
			{
				name: "Machine Learning",
				type: "knowledge-area",
				leaves: [
					{ name: "Pandas" },
					{ name: "NumPy" },
					{ name: "Scikit-learn", countAs: ["scikit-learn"] },
					{ name: "XGBoost" },
					{ name: "PyTorch" },
					{ name: "TensorFlow" },
				],
			},
			{
				name: "LLM / RAG / GenAI",
				type: "knowledge-area",
				demandAs: ["LLM"],
				leaves: [
					{ name: "LangChain", countAs: ["Langchain"] },
					{ name: "FastAPI", countAs: ["fastapi"] },
					{ name: "Streamlit" },
				],
			},
			{
				name: "Konkret bazowy",
				type: "presentation-group",
				leaves: [
					{ name: "Python" },
					{ name: "Docker" },
					{ name: "AWS" },
					{ name: "Azure" },
					{ name: "SQL" },
					{ name: "Jupyter Notebook", absent: true },
				],
			},
		],
	},
	{
		label: "Data Scientist",
		areas: [
			{
				name: "Machine Learning",
				type: "knowledge-area",
				leaves: [
					{ name: "Pandas" },
					{ name: "NumPy" },
					{ name: "Scikit-learn", countAs: ["scikit-learn"] },
					{ name: "XGBoost" },
					{ name: "PyTorch" },
					{ name: "TensorFlow" },
				],
			},
			{
				name: "AI / Data Science",
				type: "knowledge-area",
				demandAs: ["AI"],
				leaves: [{ name: "Python" }, { name: "Jupyter Notebook", absent: true }, { name: "R" }],
			},
			{
				name: "Konkret bazowy",
				type: "presentation-group",
				leaves: [{ name: "SQL" }, { name: "Databricks" }],
			},
		],
	},
	{
		label: "Data Engineer",
		areas: [
			{
				name: "Big Data / ETL",
				type: "knowledge-area",
				demandAs: ["ETL"],
				leaves: [
					{ name: "Apache Spark" },
					{ name: "PySpark" },
					{ name: "Airflow", countAs: ["Airflow", "Apache Airflow"] },
					{ name: "dbt", countAs: ["DBT"] },
					{ name: "Snowflake" },
					{ name: "BigQuery" },
				],
			},
			{
				name: "Konkret bazowy",
				type: "presentation-group",
				leaves: [
					{ name: "Python" },
					{ name: "SQL" },
					{ name: "Databricks" },
					{ name: "Docker" },
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"] },
					{ name: "Scala" },
				],
			},
			{
				name: "Cloud",
				type: "knowledge-area",
				demandAs: ["Azure"],
				leaves: [{ name: "Azure" }, { name: "AWS" }, { name: "GCP" }],
			},
		],
	},
	{
		label: "Data Analyst",
		areas: [
			{
				name: "Wizualizacja BI",
				type: "presentation-group",
				leaves: [{ name: "Power BI" }, { name: "Tableau" }, { name: "MS Excel" }],
			},
			{
				name: "ETL",
				type: "knowledge-area",
				leaves: [
					{ name: "dbt", countAs: ["DBT"] },
					{ name: "Airflow", countAs: ["Airflow", "Apache Airflow"] },
				],
			},
			{
				name: "Konkret bazowy",
				type: "presentation-group",
				leaves: [{ name: "SQL" }, { name: "Python" }, { name: "BigQuery" }],
			},
		],
	},
	{
		// DODANE przez Maxa: sekcja 1 Sophii NIE zawierała bloku DevOps (przeoczenie —
		// DevOps jest w jej §3 rodzinach i banku projektów oraz jest jedną z największych
		// kotwic, 528 ofert). Hierarchię złożyłem z liści banku projektów Sophii + profilu
		// DevOps z danych. Do potwierdzenia przez Sophię (prowenicja §7).
		label: "DevOps Engineer",
		areas: [
			{
				name: "CI/CD",
				type: "knowledge-area",
				leaves: [
					{ name: "GitHub Actions" },
					{ name: "Jenkins" },
					{ name: "GitLab CI", absent: true },
				],
			},
			{
				name: "Infrastruktura jako kod",
				type: "presentation-group",
				leaves: [{ name: "Terraform" }, { name: "Ansible" }],
			},
			{
				name: "Konteneryzacja i orkiestracja",
				type: "presentation-group",
				leaves: [{ name: "Docker" }, { name: "Kubernetes" }],
			},
			{
				name: "Cloud",
				type: "knowledge-area",
				demandAs: ["AWS"],
				leaves: [{ name: "AWS" }, { name: "Azure" }, { name: "GCP" }],
			},
			{
				name: "Monitoring",
				type: "presentation-group",
				leaves: [{ name: "Prometheus" }, { name: "Grafana" }],
			},
			{
				name: "Konkret bazowy",
				type: "presentation-group",
				leaves: [{ name: "Linux" }, { name: "Python" }, { name: "Bash" }],
			},
		],
	},
	{
		label: "Java Developer",
		areas: [
			{
				name: "Język i framework",
				type: "presentation-group",
				leaves: [
					{ name: "Java" },
					{ name: "Spring Boot" },
					{ name: "Spring" },
					{ name: "Hibernate" },
					{ name: "Maven" },
					{ name: "JUnit" },
				],
			},
			{
				name: "Bazy danych",
				type: "presentation-group",
				leaves: [{ name: "SQL" }, { name: "PostgreSQL" }, { name: "Oracle" }],
			},
			{
				name: "Konteneryzacja i integracja",
				type: "presentation-group",
				leaves: [
					{ name: "Docker" },
					{ name: "Kubernetes" },
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"] },
					{ name: "Swagger" },
				],
			},
			{
				name: "REST API / Microservices",
				type: "knowledge-area",
				demandAs: ["REST API"],
				leaves: [{ name: "Swagger" }, { name: "OpenAPI" }],
			},
			{
				// DODANE w v5 (Max): projekt zaawansowany Java kotwiczy na CI/CD; CI/CD
				// jest realnym obszarem dla Java (8% ofert), liść buildable = Jenkins (6%).
				name: "CI/CD",
				type: "knowledge-area",
				leaves: [{ name: "Jenkins" }, { name: "GitHub Actions" }],
			},
		],
	},
	{
		label: ".NET Developer",
		areas: [
			{
				name: "Język i framework",
				type: "presentation-group",
				leaves: [
					{ name: ".Net" },
					{ name: "C#" },
					{ name: "ASP.NET" },
					{ name: "ASP.NET Core" },
					{ name: ".NET Core" },
					{ name: "Entity Framework" },
				],
			},
			{
				name: "Bazy danych",
				type: "presentation-group",
				leaves: [{ name: "SQL" }, { name: "SQL Server" }, { name: "MS SQL" }],
			},
			{
				name: "Konteneryzacja i chmura",
				type: "presentation-group",
				leaves: [
					{ name: "Docker" },
					{ name: "Kubernetes" },
					{ name: "Azure" },
					{ name: "RabbitMQ" },
				],
			},
			{
				name: "REST API",
				type: "knowledge-area",
				leaves: [{ name: "Swagger" }, { name: "OAuth2" }, { name: "JWT" }],
			},
		],
	},
	{
		label: "Backend Developer",
		areas: [
			{
				name: "Języki",
				type: "presentation-group",
				leaves: [
					{ name: "Python" },
					{ name: "Java" },
					{ name: "TypeScript" },
					{ name: "Node.js" },
					{ name: "Django" },
					{ name: "FastAPI", countAs: ["fastapi"] },
				],
			},
			{
				name: "Bazy i cache",
				type: "presentation-group",
				leaves: [{ name: "SQL" }, { name: "PostgreSQL" }, { name: "MongoDB" }, { name: "Redis" }],
			},
			{
				name: "Konteneryzacja",
				type: "presentation-group",
				leaves: [
					{ name: "Docker" },
					{ name: "Kubernetes" },
					{ name: "AWS" },
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"] },
					{ name: "Celery" },
					{ name: "GraphQL" },
				],
			},
		],
	},
	{
		label: "Python Developer",
		areas: [
			{
				name: "Język i frameworki",
				type: "presentation-group",
				leaves: [
					{ name: "Python" },
					{ name: "Django" },
					{ name: "Flask" },
					{ name: "FastAPI", countAs: ["fastapi"] },
				],
			},
			{
				name: "Infrastruktura",
				type: "presentation-group",
				leaves: [
					{ name: "Docker" },
					{ name: "Kubernetes" },
					{ name: "Linux" },
					{ name: "PostgreSQL" },
					{ name: "AWS" },
					{ name: "Git" },
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"] },
					{ name: "Redis" },
					{ name: "MongoDB" },
				],
			},
			{
				name: "CI/CD",
				type: "knowledge-area",
				leaves: [{ name: "GitHub Actions" }, { name: "Jenkins" }],
			},
		],
	},
	{
		label: "Frontend Developer",
		areas: [
			{
				name: "Język i framework",
				type: "presentation-group",
				leaves: [
					{ name: "JavaScript" },
					{ name: "TypeScript" },
					{ name: "React" },
					{ name: "Next.js" },
					{ name: "Angular" },
					{ name: "Node.js" },
					{ name: "Redux" },
				],
			},
			{
				name: "Styling",
				type: "presentation-group",
				leaves: [
					{ name: "CSS" },
					{ name: "CSS3" },
					{ name: "HTML" },
					{ name: "HTML5" },
					{ name: "Tailwind CSS" },
					{ name: "SASS" },
				],
			},
			{
				// DODANE w v5 (Max): projekt zaawansowany Frontend kotwiczy na testach E2E;
				// Playwright (1,3%) i Cypress (2%) są realnie obecne dla Frontend.
				name: "Testowanie",
				type: "presentation-group",
				leaves: [{ name: "Playwright" }, { name: "Cypress" }, { name: "Jest" }],
			},
		],
	},
	{
		label: "Full-Stack Developer",
		areas: [
			{
				name: "Frontend",
				type: "presentation-group",
				leaves: [
					{ name: "React" },
					{ name: "TypeScript" },
					{ name: "JavaScript" },
					{ name: "Next.js" },
					{ name: "Tailwind CSS" },
				],
			},
			{
				name: "Backend dla fullstacka",
				type: "presentation-group",
				leaves: [
					{ name: "Node.js" },
					{ name: "NestJS" },
					{ name: "Express" },
					{ name: "Java" },
					{ name: "Spring Boot" },
					{ name: ".Net" },
					{ name: "Python" },
					{ name: "MongoDB" },
				],
			},
			{
				name: "Bazy i infra",
				type: "presentation-group",
				leaves: [{ name: "SQL" }, { name: "Docker" }, { name: "AWS" }],
			},
		],
	},
	{
		label: "Android Developer",
		areas: [
			{
				name: "Natywny Android",
				type: "presentation-group",
				leaves: [
					{ name: "Kotlin" },
					{ name: "Java" },
					{ name: "Android SDK" },
					{ name: "Jetpack Compose" },
					{ name: "Android Studio" },
				],
			},
			{
				name: "iOS / hybrydowy",
				type: "presentation-group",
				leaves: [
					{ name: "Swift" },
					{ name: "SwiftUI" },
					{ name: "Flutter" },
					{ name: "React Native" },
					{ name: "Firebase" },
				],
			},
			{
				name: "Konkret bazowy",
				type: "presentation-group",
				leaves: [{ name: "Git" }],
			},
		],
	},
	{
		label: "QA Engineer",
		areas: [
			{
				name: "Automatyzacja",
				type: "knowledge-area",
				demandAs: ["Test Automation"],
				leaves: [{ name: "Selenium" }, { name: "Playwright" }, { name: "Cypress" }],
			},
			{
				name: "Testowanie API",
				type: "knowledge-area",
				demandAs: ["API Testing"],
				leaves: [{ name: "Postman" }],
			},
			{
				name: "Zarządzanie testami",
				type: "presentation-group",
				leaves: [{ name: "Xray" }, { name: "Zephyr" }, { name: "TestRail" }, { name: "Jira" }],
			},
			{
				name: "Języki",
				type: "presentation-group",
				leaves: [
					{ name: "Java" },
					{ name: "JavaScript" },
					{ name: "Python" },
					{ name: "TypeScript" },
					{ name: "C#" },
					{ name: "SQL" },
				],
			},
		],
	},
	{
		label: "Business Analyst",
		areas: [
			{
				name: "Notacje i modelowanie",
				type: "knowledge-area",
				demandAs: ["UML"],
				leaves: [{ name: "UML" }, { name: "BPMN" }, { name: "Enterprise Architect" }],
			},
			{
				name: "Narzędzia analityka",
				type: "presentation-group",
				leaves: [
					{ name: "Jira" },
					{ name: "Confluence" },
					{ name: "Postman" },
					{ name: "Miro", absent: true },
				],
			},
			{
				name: "Dane",
				type: "presentation-group",
				leaves: [{ name: "SQL" }],
			},
		],
	},
	{
		label: "Project Manager",
		areas: [
			{
				name: "Narzędzia śledzenia",
				type: "presentation-group",
				leaves: [{ name: "Jira" }, { name: "Trello" }, { name: "Asana" }],
			},
			{
				name: "Dokumentacja",
				type: "presentation-group",
				leaves: [{ name: "Confluence" }, { name: "MS Project" }, { name: "Miro", absent: true }],
			},
			{
				name: "Agile",
				type: "knowledge-area",
				leaves: [{ name: "Scrum" }, { name: "Kanban" }, { name: "PRINCE2" }],
			},
		],
	},
	{
		label: "Product Owner / Manager",
		areas: [
			{
				name: "Narzędzia produktowe",
				type: "presentation-group",
				leaves: [{ name: "Jira" }, { name: "Confluence" }, { name: "Miro", absent: true }],
			},
			{
				name: "Analiza danych produktu",
				type: "presentation-group",
				leaves: [{ name: "SQL" }, { name: "Power BI" }],
			},
			{
				name: "Product Management",
				type: "knowledge-area",
				leaves: [{ name: "Scrum" }, { name: "SaaS" }],
			},
		],
	},
	{
		label: "UX/UI Designer",
		areas: [
			{
				name: "Narzędzia projektowe",
				type: "presentation-group",
				leaves: [{ name: "Figma" }, { name: "Adobe XD" }],
			},
			{
				name: "Współpraca",
				type: "presentation-group",
				leaves: [{ name: "Jira" }, { name: "Confluence" }],
			},
			{
				name: "UX",
				type: "knowledge-area",
				demandAs: ["UX/UI"],
				leaves: [{ name: "WCAG" }],
			},
		],
	},
	{
		label: "Salesforce Developer",
		areas: [
			{
				name: "Ekosystem Salesforce",
				type: "knowledge-area",
				demandAs: ["Salesforce"],
				leaves: [
					{ name: "Salesforce" },
					{ name: "Apex" },
					{ name: "LWC" },
					{ name: "Visualforce" },
					{ name: "Aura" },
				],
			},
			{
				name: "Web i integracje",
				type: "presentation-group",
				leaves: [{ name: "HTML" }, { name: "CSS" }, { name: "SQL" }],
			},
			{
				name: "API",
				type: "knowledge-area",
				leaves: [{ name: "Swagger" }, { name: "Postman" }],
			},
		],
	},
	{
		label: "PHP Developer",
		areas: [
			{
				name: "Język i framework",
				type: "presentation-group",
				leaves: [{ name: "PHP" }, { name: "Symfony" }, { name: "Laravel" }],
			},
			{
				name: "Bazy danych",
				type: "presentation-group",
				leaves: [{ name: "SQL" }, { name: "MySQL" }, { name: "PostgreSQL" }],
			},
			{
				name: "Infra i front",
				type: "presentation-group",
				leaves: [{ name: "Docker" }, { name: "React" }, { name: "Git" }],
			},
		],
	},
	{
		label: "Solution Architect",
		note: "Rola wymagająca podstaw programistycznych — informacja, nie blokada wyboru.",
		areas: [
			{
				name: "Projektowanie (Architecture)",
				type: "knowledge-area",
				demandAs: ["Architecture"],
				leaves: [{ name: "C4" }, { name: "UML" }],
			},
			{
				name: "Komunikacja i integracja",
				type: "presentation-group",
				leaves: [
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"] },
					{ name: "RabbitMQ" },
					{ name: "gRPC" },
					{ name: "Kubernetes" },
				],
			},
			{
				name: "Języki",
				type: "presentation-group",
				leaves: [{ name: "Java" }, { name: "Python" }],
			},
			{
				name: "Cloud",
				type: "knowledge-area",
				leaves: [{ name: "AWS" }, { name: "Azure" }, { name: "GCP" }],
			},
		],
	},
	{
		label: "Embedded / C++ Developer",
		note: "Było „Software Engineer”; przemianowane (dyrektywa 3) — realny profil C++ 74%.",
		areas: [
			{
				name: "Języki",
				type: "presentation-group",
				leaves: [
					{ name: "C++" },
					{ name: "C" },
					{ name: "Python" },
					{ name: "Java" },
					{ name: "Kotlin" },
				],
			},
			{
				name: "Systemy",
				type: "presentation-group",
				leaves: [{ name: "Linux" }],
			},
		],
	},
	{
		label: "Engineering Manager",
		note: "Rola docelowa (awans) — mało liści-konkretu, dominuje wiedza/przywództwo.",
		areas: [
			{
				name: "Techniczne tło",
				type: "presentation-group",
				leaves: [{ name: "Java" }, { name: "React" }, { name: "Kotlin" }, { name: "TypeScript" }],
			},
			{
				name: "Leadership",
				type: "knowledge-area",
				leaves: [{ name: "Agile" }, { name: "Scrum" }],
			},
		],
	},
];

// ── BANK PROJEKTÓW (Sophia §4) ───────────────────────────────────────────────
// Klucz = label ścieżki. PO/BA/Salesforce w pełni napisane przez Sophię; reszta
// uporządkowana z przewodnika; brakujące poziomy oznaczone todo:true (luka Sophii).

export const PROJECT_BANK: Record<string, ProjectSpec[]> = {
	// ── 6 ZESTAWÓW NAPISANYCH W PEŁNI przez Sophię (v5 §7) — zakotwiczone na
	//    NASZYCH top buildable-leaves z policzonym %. anchorLeaves zweryfikowane
	//    względem hierarchii (Max): CI/CD→Jenkins dodane do Java; Playwright dodane
	//    do Frontend. marketRationale = łańcuch projekt↔kompetencja↔% rynku.
	"Java Developer": [
		{
			level: "latwy",
			title: "REST API katalogu książek (Spring Boot + PostgreSQL)",
			anchorLeaves: ["Java", "Spring Boot", "PostgreSQL", "Swagger", "JUnit"],
			description:
				"Aplikacja CRUD: encje, repozytoria, kontrolery REST, walidacja, dokumentacja Swagger, kilka testów JUnit.",
			portfolioOutcome: "Działające API w repo z dokumentacją.",
			marketRationale: "Spring Boot 48% + PostgreSQL 20% = rdzeń ofert Java.",
		},
		{
			level: "sredni",
			title: "System rezerwacji z autoryzacją (Spring Security + Hibernate + Docker)",
			anchorLeaves: ["Java", "Spring Boot", "Hibernate", "SQL", "Docker", "JUnit"],
			description:
				"Rezerwacje (sale/wizyty), warstwa Hibernate/JPA, autoryzacja ról JWT, konteneryzacja Docker, testy integracyjne.",
			portfolioOutcome: "Aplikacja z auth i bazą w kontenerze.",
			marketRationale: "Hibernate 25% + Docker 20% + Spring = typowy stack mid.",
		},
		{
			level: "zaawansowany",
			title: "Mikrousługi zamówień z Kafka i CI/CD",
			anchorLeaves: ["Java", "Spring Boot", "Kafka", "Docker", "Kubernetes", "Jenkins"],
			description:
				"2-3 usługi Spring Boot komunikujące się przez Kafka, każda w Dockerze, deploy na Kubernetes (minikube), pipeline CI/CD (Jenkins), testy.",
			portfolioOutcome: "System mikrousługowy z pełną dokumentacją.",
			marketRationale: "Kafka 12% + Kubernetes 19% = sygnał ofert senior Java.",
		},
	],
	"Data Engineer": [
		{
			level: "latwy",
			title: "Pipeline czyszczący dane z publicznego API (Python + SQL)",
			anchorLeaves: ["Python", "SQL"],
			description:
				"Skrypt Python pobiera dane z 1 API, czyści (Pandas), ładuje do bazy SQL, podstawowe zapytania analityczne.",
			portfolioOutcome: "Powtarzalny skrypt ETL w repo.",
			marketRationale: "Python 70% + SQL 50% = dwie najczęstsze kompetencje ścieżki.",
		},
		{
			level: "sredni",
			title: "ELT z orkiestracją (Airflow + dbt + Snowflake/BigQuery)",
			anchorLeaves: ["Python", "SQL", "Airflow", "dbt", "BigQuery"],
			description:
				"Airflow uruchamia cyklicznie pobranie z API → ładowanie do hurtowni chmurowej → transformacje w dbt → modele warstwowe.",
			portfolioOutcome: "Udokumentowany pipeline ELT.",
			marketRationale: "Airflow + dbt (DBT 45) + Snowflake/BigQuery = nowoczesny stos danych.",
		},
		{
			level: "zaawansowany",
			title: "Mini-hurtownia end-to-end na Spark/Databricks",
			anchorLeaves: ["Python", "Apache Spark", "PySpark", "Databricks", "SQL", "dbt"],
			description:
				"Warstwy surowa→oczyszczona→martowa, przetwarzanie Spark/PySpark na Databricks, testy jakości danych, dashboard na wierzchu.",
			portfolioOutcome: "Repozytorium z architekturą warstwową.",
			marketRationale: "Databricks 35% + Spark 28% = rdzeń ofert senior DE.",
		},
	],
	"Frontend Developer": [
		{
			level: "latwy",
			title: "Responsywny katalog filmów (React + TypeScript + Tailwind)",
			anchorLeaves: ["JavaScript", "TypeScript", "React", "Tailwind CSS"],
			description: "SPA pobierająca dane z publicznego API (TMDB), RWD, komponenty, routing.",
			portfolioOutcome: "Wdrożona strona (Vercel) w repo.",
			marketRationale: "TypeScript 57% + React 43% = najsilniejszy klaster frontu.",
		},
		{
			level: "sredni",
			title: "Aplikacja z zarządzaniem stanem i autoryzacją (Next.js + Redux)",
			anchorLeaves: ["TypeScript", "React", "Next.js", "Redux", "Node.js"],
			description:
				"Next.js (SSR), logowanie, zarządzanie stanem (Redux), formularze, integracja REST API.",
			portfolioOutcome: "Aplikacja z auth i SSR.",
			marketRationale: "Next.js + Redux = typowe wymagania mid frontu.",
		},
		{
			level: "zaawansowany",
			title: "Produkt SaaS frontend z testami E2E",
			anchorLeaves: ["TypeScript", "React", "Next.js", "Node.js", "Playwright"],
			description:
				"Pełna aplikacja (dashboard + płatności testowe), komponenty wielokrotnego użytku, testy E2E (Playwright), CI, deploy.",
			portfolioOutcome: "Produkt z testami i pipeline.",
			marketRationale: "Pokrycie większości top-liści + jakość produkcyjna.",
		},
	],
	"Project Manager": [
		{
			level: "latwy",
			title: "Kompletny backlog produktu w Jira",
			anchorLeaves: ["Jira"],
			description:
				"Darmowa instancja Jira: Epiki → User Stories → precyzyjne kryteria akceptacji dla wymyślonej aplikacji; konfiguracja tablicy.",
			portfolioOutcome: "Publiczny eksport/zrzut backlogu.",
			marketRationale: "Jira 39% = najczęstsze narzędzie ścieżki.",
		},
		{
			level: "sredni",
			title: "Case study cyklu sprintu (Jira + Confluence)",
			anchorLeaves: ["Jira", "Confluence"],
			description:
				"Symulacja 1 sprintu: plan, rejestr ryzyk w Confluence, diagramy velocity/burndown, raport retrospektywy.",
			portfolioOutcome: "Dokumentacja sprintu pokazująca proces.",
			marketRationale: "Jira + Confluence 23% = rdzeń narzędziowy PM.",
		},
		{
			level: "zaawansowany",
			title: "Symulacja prowadzenia mini-produktu (3 sprinty)",
			anchorLeaves: ["Jira", "Confluence", "MS Project"],
			description:
				"3 sprinty w Jira, roadmapa (MS Project/Confluence), metryki, rejestr decyzji, raport końcowy z wnioskami.",
			portfolioOutcome: "Pełna dokumentacja prowadzenia produktu.",
			marketRationale: "Dodanie MS Project (19) + roadmapa = poziom mid/senior PM.",
		},
	],
	"Business Analyst": [
		{
			level: "latwy",
			title: "Model procesu biznesowego w BPMN",
			anchorLeaves: ["BPMN"],
			description:
				"Modelowanie realnego procesu (np. obsługa reklamacji) w BPMN: as-is, uczestnicy, punkty decyzyjne.",
			portfolioOutcome: "Czytelny diagram procesu w repo.",
			marketRationale: "BPMN 51% = druga najczęstsza kompetencja BA.",
		},
		{
			level: "sredni",
			title: "Specyfikacja systemu (UML + SQL + Enterprise Architect)",
			anchorLeaves: ["UML", "BPMN", "SQL", "Enterprise Architect"],
			description:
				"Diagram przypadków użycia (UML), model danych (ERD/SQL), wymagania funkcjonalne/niefunkcjonalne, mapowanie as-is→to-be (BPMN), spięte w Enterprise Architect.",
			portfolioOutcome: "Pakiet dokumentacji gotowy dla developera.",
			marketRationale: "UML 60% + BPMN 51% + Enterprise Architect 26% = trójca BA.",
		},
		{
			level: "zaawansowany",
			title: "Analiza usprawnienia end-to-end z integracjami (UML/BPMN + Postman + Jira)",
			anchorLeaves: ["UML", "BPMN", "SQL", "Postman", "Jira", "Enterprise Architect"],
			description:
				"Analiza luk as-is/to-be, projekt rozwiązania (UML/BPMN), specyfikacja integracji REST (testy w Postman), business case, backlog w Jira.",
			portfolioOutcome: "Kompletna analiza klasy korporacyjnej.",
			marketRationale: "Pełne pokrycie top-liści BA + integracje.",
		},
	],
	"Salesforce Developer": [
		{
			level: "latwy",
			title: "Konfiguracja CRM bez kodu (Salesforce Flow)",
			anchorLeaves: ["Salesforce"],
			description:
				"Salesforce Developer Org: własny obiekt (np. Zgłoszenie), pola, layout, automatyzacja Flow.",
			portfolioOutcome: "Działająca konfiguracja w org.",
			marketRationale: "Salesforce 31% = rdzeń platformy.",
		},
		{
			level: "sredni",
			title: "Aplikacja CRM z logiką w Apex + LWC",
			anchorLeaves: ["Salesforce", "Apex", "LWC"],
			description:
				"Niestandardowe obiekty, trigger Apex (automatyczne przypisanie), interfejs w Lightning Web Components.",
			portfolioOutcome: "Aplikacja z własnym kodem.",
			marketRationale: "Apex 15% + LWC 8% = sygnał ról deweloperskich Salesforce.",
		},
		{
			level: "zaawansowany",
			title: "Integracja Salesforce z zewnętrznym API (Apex REST + testy)",
			anchorLeaves: ["Salesforce", "Apex", "LWC"],
			description:
				"Wywołanie REST z Apex do zewnętrznego API, obsługa błędów/limitów, komponent LWC prezentujący dane, testy Apex (wymóg 75% pokrycia).",
			portfolioOutcome: "Integracja produkcyjnej klasy.",
			marketRationale: "Dodanie integracji API 39% (obszar) = poziom mid konsultanta.",
		},
	],

	// ── POZOSTAŁE ŚCIEŻKI — szablon `todo` (Sophia §7: kolejna iteracja, nie zgadujemy
	//    60 projektów naraz). Top liście już policzone w hierarchii; szablon gotowy.
	".NET Developer": [
		todoProject(".NET Developer", ".Net, C#, SQL, Azure, ASP.NET, Entity Framework"),
	],
	"Python Developer": [
		todoProject("Python Developer", "Python, Linux, Kubernetes, Docker, Django, FastAPI"),
	],
	"Backend Developer": [
		todoProject(
			"Backend Developer",
			"Python, Java, Node.js, SQL, Docker, Kubernetes, MongoDB, Redis",
		),
	],
	"PHP Developer": [todoProject("PHP Developer", "PHP, Symfony, MySQL, SQL, Docker")],
	"Embedded / C++ Developer": [todoProject("Embedded / C++ Developer", "C++, C, Python, Linux")],
	"Full-Stack Developer": [
		todoProject("Full-Stack Developer", "React, TypeScript, Node.js, Java, MongoDB"),
	],
	"Android Developer": [
		todoProject("Android Developer", "Kotlin, Java, Android SDK, Jetpack Compose, Firebase"),
	],
	"Data Analyst": [todoProject("Data Analyst", "SQL, Python, Power BI, Tableau, MS Excel")],
	"Data Scientist": [
		todoProject("Data Scientist", "Pandas, Scikit-learn, XGBoost, PyTorch, Python, SQL"),
	],
	"AI Engineer": [todoProject("AI Engineer", "Python, PyTorch, LangChain, Hugging Face, FastAPI")],
	"DevOps Engineer": [
		todoProject("DevOps Engineer", "Terraform, Kubernetes, Docker, GitHub Actions, AWS, Ansible"),
	],
	"Cybersecurity Specialist": [
		todoProject("Cybersecurity Specialist", "SIEM, Splunk, IAM, PAM, NIST, Linux"),
	],
	"QA Engineer": [todoProject("QA Engineer", "Selenium, Playwright, Cypress, Postman, Jira")],
	"Solution Architect": [
		todoProject(
			"Solution Architect",
			"C4, UML, Kafka, Kubernetes — projekty dokumentacyjne (rola docelowa)",
		),
	],
	"UX/UI Designer": [todoProject("UX/UI Designer", "Figma, Adobe XD")],
	"Product Owner / Manager": [
		todoProject("Product Owner / Manager", "Jira, Confluence, SQL, Power BI"),
	],
	"Engineering Manager": [
		todoProject(
			"Engineering Manager",
			"rola docelowa, knowledge-heavy — projekty z bazowej ścieżki technicznej",
		),
	],
};
