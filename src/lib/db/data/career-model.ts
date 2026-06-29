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

import type { LeafKind } from "./anchor-config";

// ── Typy węzłów hierarchii ───────────────────────────────────────────────────
//
// Rozróżnienie Sophii (§0): obszar wiedzy z REALNYM % (z danych — np. AI 53%) vs
// grupnik prezentacyjny BEZ % (jej etykieta organizacyjna — np. „Wizualizacja BI").
// UI renderuje liczbę tylko tam, gdzie jest realny %.
//
//  - "knowledge-area"        — obszar wiedzy; % = popyt ścieżki na tę nazwę (z danych).
//  - "context-group"         — grupa z kontekstem (proza + unionShare); % = null. Wzorzec
//                              23 ścieżek (kuracja Sophii): obszar mierzony udziałem unii.
//  - "presentation-group"    — grupnik prezentacyjny (etykieta legacy Sophii); % = null.
//  - "leaf"                  — narzędzie-konkret; % liczony w obrębie ścieżki (bez progu).
export type NodeType = "knowledge-area" | "presentation-group" | "context-group" | "leaf";

/** Źródło % liścia. "dane" = policzone z CSV; "kuracja ekspercka" = brak w zrzucie. */
export type LeafSource = "dane" | "kuracja ekspercka";

/** Liść-konkret. % wlicza silnik; tu deklarujemy nazwę + wariant + źródło + (opcj.) kind. */
export type LeafSpec = {
	name: string; // nazwa wyświetlana (jak w modelu/przewodniku)
	// Nazwa(-y) do zliczania w danych (wariant obecny w zrzucie). Gdy brak — używa `name`.
	// Tablica = warianty zliczane razem (np. Airflow + Apache Airflow). DOMYŚLNIE silnik
	// SUMUJE liczniki wariantów; gdy synonimy bywają w jednej ofercie, włącz `countAsUnion`.
	countAs?: string[];
	// true = scalenie wariantów liczone jako UNIA ofert (dedup — oferta z dwoma napisami RAZ),
	// nie suma liczników (Sophia/Leo, partia 2: C#/.NET, ETL/ELT, REST/API, chmury). Działa
	// tylko z `countAs` >1. Domyślnie false = suma (zgodność wsteczna: cyber/partia 1).
	countAsUnion?: boolean;
	// Kuracja kind (Sophia §7): tool=obsługuję · concept=rozumiem/stosuję (SIEM/IAM/NIST) ·
	// soft=miękka. Silnik bierze `leaf.kind ?? auto-klasyfikacja-po-nazwie` — kuracja NADPISUJE
	// auto BEZ wyjątku (także dla cert/meta: ISTQB→concept działa, bo kuracja ma pierwszeństwo).
	kind?: LeafKind;
	// true = narzędzie realnie nieobecne w zrzucie 2026-02 → demandPercentage:null,
	// source:"kuracja ekspercka", label „brak w zrzucie 2026-02".
	absent?: boolean;
	// true = liść ŚWIADOMIE zachowany w PŁASKIM KATALOGU mimo offers < countMin (override IN
	// poniżej bramki minimalnego wolumenu). Jedyne użycie: Solution Architect partia 5
	// (TOGAF/ArchiMate/DDD/ESB, n=2–3) — kuracja Sophii: bez tych liści katalog architekta
	// kłamie „senior Java + chmura". NIE rusza hierarchii (liść i tak był w modelu); zmienia
	// WYŁĄCZNIE bramkę wolumenu w `flattenLeaves`. Domyślnie undefined = bramka działa normalnie
	// (neutralne dla wszystkich pozostałych ścieżek — udowodnione deep-equalem regenu).
	keepBelowGate?: boolean;
};

/** Obszar wiedzy / grupnik / GRUPA z kontekstem → liście. */
export type AreaSpec = {
	name: string; // nazwa obszaru/grupnika/grupy
	// Dyskryminator JAWNY (poprawka Leo, ETAP A): silnik liczy % WYŁĄCZNIE po tym typie,
	// NIE po obecności `description`. knowledge-area → % popytu ścieżki; context-group /
	// presentation-group → null (metryką jest unionShare). Obszar z realnym popytem MOŻE
	// mieć opis i nie traci wtedy % — bo o %-vs-null decyduje `type`, nie opis.
	type: "knowledge-area" | "presentation-group" | "context-group";
	// Dla "knowledge-area": nazwa(-y) liczone jako % popytu ścieżki (z danych).
	// Brak → % liczony z `name`. Dla context-group / presentation-group ignorowane (% = null).
	demandAs?: string[];
	// GRUPA z kontekstem (wzorzec dla 23 ścieżek, decyzja Darka 2026-06-27): proza
	// wyjaśniająca obszar studentowi. Idzie w parze z type:"context-group" — silnik liczy
	// `unionShare` (udział ofert wymagających ≥1 technologii grupy) i renderuje opis w UI.
	// UWAGA: `description` to TYLKO UI — NIE decyduje już o %-vs-null (decyduje `type`).
	description?: string;
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
	// Adnotacja-zastrzeżenie do profilu ścieżki (ETAP H, decyzja Sophii): krótka,
	// uczciwa nota dla studenta o tym, JAK czytać profil tej ścieżki (np. „profil
	// szeroki", „dane wstępne — mała próbka"). To WYŁĄCZNIE etykieta UI — NIE zmienia
	// żadnej liczby popytu/pokrycia ani kolejności kompetencji. ETL przepisuje ją do
	// career-model.json; picker (career-paths.ts) trzyma własną lekką kopię dla klienta.
	profileNote?: string;
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
		juniorFriendliness: "Średnia",
		targetRole: false,
		tShapePairs: ["DevOps Engineer"],
		profileNote:
			"Profil szeroki — łapie też oferty platformowe i DevOps (Linux, Docker, Kubernetes). Python zostaje rdzeniem ścieżki.",
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
		profileNote:
			"Rdzeń ścieżki to PHP, Symfony i Laravel — mimo że ogólny SQL ma w ofertach wyższy udział.",
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
		profileNote:
			"Dane wstępne — mała próbka (81 ofert). Część konkretów architekta jest poniżej progu statystycznego.",
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
		profileNote:
			"Profil oddaje techniczne tło z ogłoszeń. Sygnały przywódcze są w surowych danych słabo widoczne.",
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
		profileNote: "Dane wstępne — profil wciąż w opracowaniu (pełna kuracja w przygotowaniu).",
	},
};

// ── HIERARCHIA PER ŚCIEŻKA (Sophia §1, v4 — ZAMROŻONA warstwa) ───────────────
// Procenty obszarów/liści NIE są tu wpisane — liczy je silnik z danych. Wyjątek:
// nazwy wariantów (countAs/demandAs) i flaga absent — to wkład kuracji, nie dane.

export const PATHS: PathSpec[] = [
	{
		// KURACJA SOPHII v2 2026-06-27 — METODA: SUROWY UDZIAŁ (decyzja Darka, nadpisuje
		// poprzednią kurację po krotności). GRUPY z kontekstem, uszeregowane wg unii
		// (udział ofert wymagających ≥1 technologii z grupy) na 371 ofertach kategorii
		// Security. Unie policzone dokładnie przez Ethana (silnik liczy union z ofert).
		// Wyrzucone: Burp/Kali/Metasploit/Nmap/Wireshark (n=1-2, pentest); Documentation
		// (soft, biurowe tło). Meta poza katalogiem: Cybersecurity/Security/IT Security/Cloud.
		label: "Cybersecurity Specialist",
		note: "Polski rynek cyber = monitoring bezpieczeństwa (SIEM/SOC) + administracja + zgodność (GRC), nie testy penetracyjne. Grupy uszeregowane wg surowego udziału ofert (371 ofert kategorii Security, JustJoinIT 2026-02) — kuracja Sophii.",
		areas: [
			{
				name: "SIEM i Monitorowanie Zdarzeń",
				type: "context-group",
				description:
					"Codzienność tzw. Blue Team — zespołu broniącego firmy od środka — i pracy w SOC (Security Operations Center, centrum monitorowania bezpieczeństwa). System klasy SIEM (Security Information and Event Management — zbieranie i korelowanie zdarzeń) ściąga miliony wpisów z logów w jedno miejsce; Twoim zadaniem jest wypatrzyć w nich ślad włamania. Splunk to najczęściej wymagane narzędzie tej klasy — pierwszy realny warsztat analityka bezpieczeństwa.",
				leaves: [
					{ name: "SIEM", kind: "concept" },
					{ name: "SOC", countAs: ["SoC"], kind: "concept" },
					{ name: "Splunk", countAs: ["Splunk", "Splunk Enterprise Security"], kind: "tool" },
					{ name: "SOAR", kind: "concept" },
					{ name: "EDR / XDR", countAs: ["EDR", "EDR/XDR", "EDR / XDR"], kind: "tool" },
					{ name: "Microsoft Defender", kind: "tool" },
					{ name: "CrowdStrike", countAs: ["Crowdstrike"], kind: "tool" },
					{ name: "Incident Response", kind: "concept" },
				],
			},
			{
				name: "Administracja systemami i skrypty",
				type: "context-group",
				description:
					"Zanim obronisz system, musisz wiedzieć, jak działa od środka. Linux i Windows to dwa światy serwerów spotykane w każdej firmie; PowerShell i Bash to języki poleceń (powłoki), którymi sterujesz nimi bez klikania. To fundament i najczęstsza brama wejścia do cyber — przez administrację przechodzi się do bezpieczeństwa (kariera w kształcie litery T: najpierw szeroka podstawa admina, potem głębia specjalisty).",
				leaves: [
					{ name: "Linux", kind: "tool" },
					{ name: "Windows", kind: "tool" },
					{ name: "PowerShell", countAs: ["PowerShell", "Powershell"], kind: "tool" },
					{ name: "Bash", kind: "tool" },
				],
			},
			{
				name: "Programowanie i automatyzacja",
				type: "context-group",
				description:
					"Python to język, którym specjalista bezpieczeństwa automatyzuje powtarzalną robotę — przerabia logi, łączy się z innymi narzędziami przez ich API (interfejs do sterowania programem z kodu) i pisze własne skrypty wykrywające zagrożenia. Nie musisz być programistą aplikacji, ale bez podstaw Pythona zostajesz przy ręcznym klikaniu. To najczęściej wymieniana pojedyncza technologia w ofertach cyber.",
				leaves: [{ name: "Python", kind: "tool" }],
			},
			{
				name: "Audyt, ryzyko i zgodność (GRC)",
				type: "context-group",
				description:
					"Bezpieczeństwo widziane od strony zarządzania i prawa, nie konsoli. Zarządzanie ryzykiem i zgodność z normami (NIST, ISO 27001 — międzynarodowe normy bezpieczeństwa informacji; RODO i DORA — regulacje unijne) to ogromny rynek w Polsce, bo banki, ubezpieczyciele i korporacje muszą się z nich tłumaczyć przed audytorami. Tędy wchodzi się do cyber bez głębokiego kodu — bliżej procesów, dokumentów i analizy ryzyka.",
				leaves: [
					{ name: "Risk Management", kind: "concept" },
					{ name: "NIST", kind: "concept" },
					{ name: "GRC", kind: "concept" },
					{
						name: "ISO 27001",
						countAs: ["ISO 27001", "ISO 27001 - Information Security Management", "ISO27001"],
						kind: "concept",
					},
					{ name: "RODO / GDPR", countAs: ["RODO", "GDPR"], kind: "concept" },
					{ name: "DORA", kind: "concept" },
				],
			},
			{
				name: "Cloud Security",
				type: "context-group",
				description:
					"Firmy przeniosły dane i aplikacje do chmury (AWS, Azure, Google Cloud), więc bezpieczeństwo przeniosło się razem z nimi. Pilnujesz, kto ma dostęp do zasobów w chmurze, jak ustawione są uprawnienia i czy nic nie wycieka przez źle skonfigurowany serwer. Uczysz się przynajmniej jednej z trzech platform — źle ustawiona chmura to dziś jedna z najczęstszych przyczyn wycieków.",
				leaves: [
					{ name: "AWS", kind: "tool" },
					{ name: "Azure", kind: "tool" },
					{ name: "GCP", countAs: ["GCP", "Google Cloud", "Google Cloud Platform"], kind: "tool" },
				],
			},
			{
				name: "Tożsamość i zarządzanie dostępem (IAM)",
				type: "context-group",
				description:
					"Większość włamań to nie spektakularny atak, tylko ktoś wszedł na cudze konto. IAM (Identity and Access Management — zarządzanie tożsamością i dostępem) to dyscyplina pilnowania, kto, do czego i jak długo ma dostęp; PAM (Privileged Access Management — zarządzanie dostępem uprzywilejowanym) chroni konta administratorów. Active Directory to katalog użytkowników Microsoftu obecny w prawie każdej polskiej firmie — przyjazny dla juniora.",
				leaves: [
					{ name: "IAM", kind: "concept" },
					{ name: "PAM", kind: "concept" },
					{
						name: "Active Directory",
						countAs: ["Active Directory", "Active Directory (AD)"],
						kind: "tool",
					},
					{ name: "CyberArk", kind: "tool" },
				],
			},
			{
				name: "DevSecOps i konteneryzacja",
				type: "context-group",
				description:
					"Nowoczesne firmy wypuszczają nowe wersje aplikacji nawet codziennie, automatyczną taśmą (CI/CD — ciągła integracja i dostarczanie kodu). DevSecOps to wpięcie bezpieczeństwa w tę taśmę — sprawdzasz kod pod kątem dziur, zanim trafi do klienta. Kubernetes to system zarządzania kontenerami (lekkimi, odizolowanymi paczkami z aplikacją) — uczysz się go zabezpieczać, bo to standard uruchamiania aplikacji w chmurze.",
				leaves: [
					{ name: "Kubernetes", kind: "tool" },
					{ name: "CI/CD", kind: "concept" },
					{ name: "DevSecOps", kind: "concept" },
				],
			},
			{
				name: "Infrastruktura i sieci",
				type: "context-group",
				description:
					"Sieć to autostrada, którą poruszają się dane — i którą porusza się atakujący. Rozumienie, jak komputery rozmawiają ze sobą (protokół TCP/IP — podstawowy język sieci) i jak ten ruch filtrować (firewall — zapora sieciowa), to fundament, na którym stoi reszta bezpieczeństwa. Bez tego SIEM pokazuje Ci alerty, których nie rozumiesz.",
				leaves: [
					{ name: "Network", kind: "concept" },
					{ name: "TCP/IP", kind: "concept" },
					{
						name: "Firewall / IDS-IPS",
						countAs: ["Firewall", "IDS/IPS"],
						countAsUnion: true,
						kind: "tool",
					},
				],
			},
			{
				name: "Bezpieczeństwo aplikacji (AppSec)",
				type: "context-group",
				description:
					"Aplikacje internetowe to najczęstszy cel ataku, więc bezpieczeństwo aplikacji (AppSec — application security) ma własny obszar. OWASP to organizacja utrzymująca słynną listę „OWASP Top 10” — dziesięć najczęstszych dziur w aplikacjach webowych. SAST, DAST i SCA to narzędzia automatycznie skanujące kod i działające aplikacje pod kątem tych dziur — uczysz się czytać ich wyniki i odróżniać realny problem od fałszywego alarmu.",
				leaves: [
					{ name: "OWASP", countAs: ["OWASP", "OWASP Top 10"], kind: "concept" },
					{ name: "SAST", kind: "tool" },
					{ name: "DAST", kind: "tool" },
					{ name: "SCA", kind: "tool" },
				],
			},
			{
				name: "Bazy danych (SQL)",
				type: "context-group",
				description:
					"SQL to język, którym rozmawia się z bazami danych — a bazy trzymają to, co atakujący chce ukraść. W cyber używasz SQL z dwóch stron: rozumiesz atak przez wstrzyknięcie zapytania (SQL injection — jedna z dziur z listy OWASP) i sam odpytujesz bazy z logami, szukając śladów incydentu. To kompetencja wspierająca, nie rdzeń roli — ale realnie wymagana.",
				leaves: [{ name: "SQL", kind: "tool" }],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 1 2026-06-27 — 6 grup context-group na 308 ofertach AI.
		// Najczystsza z trzech ścieżek. `kind` z dokumentu Sophii, liczby z danych. Scalenia:
		// LLM←LLMs, API/REST←API+REST API, LangChain←Langchain, LangGraph←Langgraph, FastAPI←fastapi.
		// Wyrzucone meta/szum: AI (65.6%!), Machine Learning, ML, Artificial Intelligence,
		// AI frameworks, Vibe Coding. Konkretne pod-techniki (LLM/RAG/NLP/Deep Learning) zostają.
		label: "AI Engineer",
		areas: [
			{
				name: "Python i praca z danymi",
				type: "context-group",
				description:
					"Python to wspólny język całego AI — prawie trzy na cztery oferty go wymagają. Pandas i NumPy obsługują dane, którymi karmisz modele, a SQL wyciąga je z baz. To fundament, na którym stoi wszystko inne; bez Pythona nie wejdziesz do tej roli w ogóle.",
				leaves: [
					{ name: "Python", kind: "tool" },
					{ name: "SQL", kind: "tool" },
					{ name: "Pandas", kind: "tool" },
					{ name: "NumPy", kind: "tool" },
				],
			},
			{
				name: "Aplikacje LLM i GenAI",
				type: "context-group",
				description:
					"Serce dzisiejszego AI Engineera: wpinanie dużych modeli językowych (LLM) w produkty. RAG (Retrieval-Augmented Generation — generacja wsparta wyszukiwaniem) podaje modelowi Twoje własne dane, żeby nie zmyślał; LangChain i LangGraph to biblioteki, którymi spina się model z resztą aplikacji w wieloetapowy proces; Hugging Face to największe repozytorium gotowych modeli do pobrania. To kompetencja, która najmocniej odróżnia tę rolę od „klasycznego” uczenia maszynowego — i najszybciej rośnie.",
				leaves: [
					{ name: "LLM", countAs: ["LLM", "LLMs"], countAsUnion: true, kind: "concept" },
					{ name: "RAG", kind: "concept" },
					{ name: "LangChain", countAs: ["Langchain"], kind: "tool" },
					{ name: "GenAI", kind: "concept" },
					{ name: "LangGraph", countAs: ["Langgraph"], kind: "tool" },
					{ name: "Hugging Face", kind: "tool" },
				],
			},
			{
				name: "Wdrażanie modeli: chmura, kontenery i MLOps",
				type: "context-group",
				description:
					"Model jest bezużyteczny, dopóki działa tylko na Twoim laptopie. Tu uczysz się go wypchnąć na produkcję i utrzymać: Docker pakuje go w kontener (odizolowaną paczkę), Kubernetes uruchamia i skaluje, jedna z chmur (AWS / Azure / GCP) go hostuje, a MLOps (operacjonalizacja uczenia maszynowego) pilnuje, żeby działał niezawodnie po wdrożeniu. IaC (infrastruktura jako kod) i MLflow (śledzenie eksperymentów) domykają warsztat.",
				leaves: [
					{ name: "AWS", kind: "tool" },
					{ name: "Docker", kind: "tool" },
					{ name: "CI/CD", kind: "concept" },
					{ name: "Azure", kind: "tool" },
					{ name: "Kubernetes", kind: "tool" },
					{ name: "MLOps", kind: "concept" },
					{ name: "GCP", kind: "tool" },
					{ name: "IaC", kind: "concept" },
					{ name: "MLflow", kind: "tool" },
				],
			},
			{
				name: "Uczenie głębokie i modele ML",
				type: "context-group",
				description:
					"Warstwa „buduję i trenuję model”, nie tylko „wołam gotowy”. PyTorch i TensorFlow to dwa wielkie frameworki sieci neuronowych (uczenia głębokiego), scikit-learn obsługuje klasyczne uczenie maszynowe (klasyfikacja, regresja), a NLP i uczenie głębokie to koncepcje, które rozumiesz, żeby wiedzieć, co te narzędzia robią pod spodem. Wciąż mocny popyt, choć rynek przesuwa ciężar ku aplikacjom LLM.",
				leaves: [
					{ name: "PyTorch", kind: "tool" },
					{ name: "TensorFlow", kind: "tool" },
					{ name: "NLP", kind: "concept" },
					{ name: "scikit-learn", kind: "tool" },
					{ name: "Uczenie głębokie (Deep Learning)", countAs: ["Deep Learning"], kind: "concept" },
				],
			},
			{
				name: "Udostępnianie modeli jako API",
				type: "context-group",
				description:
					"Gotowy model trafia do reszty firmy jako API (interfejs, przez który inne programy go wołają) w stylu REST. FastAPI to pythonowy standard wystawiania modelu jako usługi webowej — najkrótsza droga od „mam model” do „inni mogą go używać”. GitHub to miejsce, gdzie ten kod żyje i jest wspólnie rozwijany.",
				leaves: [
					{ name: "API / REST", countAs: ["API", "REST API"], kind: "concept" },
					{ name: "FastAPI", countAs: ["fastapi"], kind: "tool" },
					{ name: "GitHub", kind: "tool" },
				],
			},
			{
				name: "Języki dodatkowe",
				type: "context-group",
				description:
					"Rdzeń modeli pisze się w Pythonie, ale produkcyjne systemy AI bywają wielojęzyczne: Java i Go w usługach zaplecza, TypeScript / JavaScript / React w warstwie webowej, którą użytkownik klika, C++ tam, gdzie liczy się szybkość. Nie musisz znać wszystkich — to mapa, dokąd prowadzi rola, gdy AI staje się częścią większego produktu.",
				leaves: [
					{ name: "TypeScript", kind: "tool" },
					{ name: "Java", kind: "tool" },
					{ name: "Go", kind: "tool" },
					{ name: "JavaScript", kind: "tool" },
					{ name: "C++", kind: "tool" },
					{ name: "React", kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 1 2026-06-27 — ⚠ KATALOG CIENKI I NIETYPOWY. Polski tag
		// „Data Scientist" w JJIT ≠ podręcznikowy profil: klasyczny stos (scikit-learn/R/Jupyter/
		// Tableau/PowerBI) prawie nie istnieje w danych — to Python+SQL na chmurze, dryfujący ku
		// LLM/GenAI, z nakładką Data/AI Engineer. 4 grupy = minimum oparte WYŁĄCZNIE na danych
		// (nie dopisuję kompetencji spoza zrzutu). Ogon poniżej top-40 (NumPy/Statistics/Snowflake/
		// Apache Spark) zweryfikowany buildCandidates(...,200). `kind` z dokumentu Sophii. Scalenia:
		// Azure←Microsoft Azure/MS Azure/Microsoft Platform/Microsoft Azure Cloud, GCP←Google Cloud
		// Platform, AWS←Amazon AWS/Amazon Web Services (AWS), GenAI←Generative AI/Gen AI, Spark←
		// Apache Spark, Kafka←Apache Kafka. Wyrzucone meta/szum: Machine Learning(24%!)/Data Science/
		// AI/Data, miękkie zarządcze, Active Directory/Linux/Bash/SAP/ITIL (administracja obca roli).
		label: "Data Scientist",
		areas: [
			{
				name: "Python, SQL i praca z danymi",
				type: "context-group",
				description:
					"Codzienna klawiatura analityka: Python to język numer jeden (ponad połowa ofert), SQL wyciąga dane z baz (co trzecia oferta), Pandas to jedyna klasyczna biblioteka analityczna, która realnie pojawia się w ogłoszeniach — służy do pracy z danymi w tabelach. Git wersjonuje Twój kod. To jedyna grupa o naprawdę masowym popycie i pierwsza rzecz do nauki.",
				leaves: [
					{ name: "Python", kind: "tool" },
					{ name: "SQL", kind: "tool" },
					{ name: "Git", kind: "tool" },
					{ name: "Pandas", kind: "tool" },
					{ name: "NumPy", kind: "tool" },
				],
			},
			{
				name: "Chmura i platformy danych",
				type: "context-group",
				description:
					"W polskim „data science” pracuje się nie na laptopie, tylko na platformie chmurowej. Databricks to dziś dominujący warsztat danych i uczenia maszynowego (prawie co piąta oferta), a do tego jedna z trzech wielkich chmur: Azure (najczęstsza w polskich korporacjach), GCP lub AWS. To często ważniejszy wymóg niż konkretna biblioteka uczenia maszynowego — wybierasz przynajmniej jedną platformę.",
				leaves: [
					{
						name: "Azure",
						countAs: [
							"Azure",
							"Microsoft Azure",
							"MS Azure",
							"Microsoft Platform",
							"Microsoft Azure Cloud",
						],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Databricks", kind: "tool" },
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "AWS",
						countAs: ["AWS", "Amazon AWS", "Amazon Web Services (AWS)"],
						kind: "tool",
					},
					{ name: "Snowflake", kind: "tool" },
				],
			},
			{
				name: "Sztuczna inteligencja: LLM, GenAI i uczenie maszynowe",
				type: "context-group",
				description:
					"Rdzeń dziedziny widziany przez to, co rynek faktycznie nazywa. W tym zrzucie „uczenie maszynowe” pojawia się głównie jako ogólny tag, nie jako konkretne biblioteki (scikit-learn/PyTorch ledwo się przebijają) — dlatego grupa opiera się na nazwanych pod-technikach. Najmocniejszy realny sygnał to LLM (duże modele językowe) i GenAI (sztuczna inteligencja generatywna): polski „data scientist” coraz częściej znaczy „ktoś, kto umie wpiąć model językowy”. NLP (przetwarzanie języka naturalnego) i statystyka to fundament metodyczny, choć w tagach cienki.",
				leaves: [
					{ name: "LLM", kind: "concept" },
					{
						name: "GenAI",
						countAs: ["GenAI", "Generative AI", "Gen AI"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "MLOps", kind: "concept" },
					{ name: "NLP", kind: "concept" },
					{ name: "Statystyka (Statistics)", countAs: ["Statistics"], kind: "concept" },
				],
			},
			{
				name: "Wielkie zbiory danych i wdrażanie (Big Data / MLOps)",
				type: "context-group",
				description:
					"Granica, na której „data science” styka się z inżynierią danych. Gdy danych jest za dużo na jedną maszynę, przetwarza się je narzędziem Spark (i jego pythonowym interfejsem PySpark); Kafka przesyła strumienie danych na żywo. Kubernetes i Terraform pakują i uruchamiają modele w chmurze. To pokazuje studentowi prawdę: w PL od „data scientist” często oczekuje się też kawałka roboty inżyniera danych.",
				leaves: [
					{ name: "CI/CD", kind: "concept" },
					{ name: "Kubernetes", kind: "tool" },
					{ name: "Spark", countAs: ["Spark", "Apache Spark"], kind: "tool" },
					{ name: "PySpark", kind: "tool" },
					{ name: "Terraform", kind: "tool" },
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"], kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 4 2026-06-27 (scratchpad/sophia-a4-partia4.md) — 5 grup
		// context-group na 226 ofertach, najczystsza ścieżka partii (Python 70%, SQL 53%). Domyka
		// trio danych (Data Scientist + Data Analyst). Scalenia UNIĄ (countAsUnion): Spark←Apache
		// Spark, Hadoop←Apache Hadoop, Kafka←Apache Kafka, Airflow←Apache Airflow, ETL (3 zapisy),
		// dbt←DBT, chmury (Azure/AWS/GCP). PySpark NIE scalony ze Spark (silnik vs interfejs).
		// `kind` Sophii. Wykluczone meta/szum: Power BI (przeciek BI), GPS (szum), gołe „Data".
		label: "Data Engineer",
		areas: [
			{
				name: "Języki przetwarzania danych (rdzeń)",
				type: "context-group",
				description:
					"Serce roli — języki, w których przepychasz i przekształcasz dane. Python rządzi (7 na 10 ofert) jako klej całego potoku danych (pipeline — taśma, którą dane płyną od źródła do hurtowni). SQL (język zapytań do baz relacyjnych) to drugi filar — co druga oferta. Scala pojawia się tam, gdzie liczy się wydajność przetwarzania rozproszonego (Apache Spark), Java w starszych systemach Big Data.",
				leaves: [
					{ name: "Python", kind: "tool" },
					{ name: "SQL", kind: "tool" },
					{ name: "Scala", kind: "tool" },
					{ name: "Java", kind: "tool" },
				],
			},
			{
				name: "Big Data i przetwarzanie rozproszone",
				type: "context-group",
				description:
					"Inżynier danych przetwarza wolumeny, których nie udźwignie jeden komputer — dzieli pracę na wiele maszyn (przetwarzanie rozproszone). Apache Spark to dziś standard tego świata, a PySpark to jego interfejs w Pythonie (piszesz po pythonowemu, liczy się rozproszenie). Hadoop i Hive to starsza, wciąż żywa generacja, Kafka dowozi dane strumieniem w czasie rzeczywistym (gdy nie czekasz na nocną paczkę).",
				leaves: [
					{
						name: "Apache Spark",
						countAs: ["Apache Spark", "Spark"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "PySpark", kind: "tool" },
					{ name: "Big Data", kind: "concept" },
					{
						name: "Hadoop",
						countAs: ["Hadoop", "Apache Hadoop"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Hive", kind: "tool" },
					{
						name: "Kafka",
						countAs: ["Apache Kafka", "Kafka"],
						countAsUnion: true,
						kind: "tool",
					},
				],
			},
			{
				name: "Orkiestracja i ETL",
				type: "context-group",
				description:
					"Dane nie płyną same — ktoś układa kolejność kroków i pilnuje, że nocny przepływ się wykonał. To orkiestracja: Airflow (i jego zarządzana odmiana Cloud Composer w chmurze Google) planuje i nadzoruje zadania, Dagster to nowszy konkurent. ETL (Extract-Transform-Load: wyciągnij dane ze źródła, przekształć, załaduj do hurtowni) to fundamentalny wzorzec roli, a dbt przekształca dane już w hurtowni samym SQL-em.",
				leaves: [
					{
						name: "ETL",
						countAs: ["ETL", "ETL/ELT", "ETL tools"],
						countAsUnion: true,
						kind: "concept",
					},
					{
						name: "Airflow",
						countAs: ["Airflow", "Apache Airflow"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "dbt",
						countAs: ["DBT", "dbt"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Dagster", kind: "tool" },
					{ name: "Cloud Composer", kind: "tool" },
				],
			},
			{
				name: "Hurtownie i platformy danych",
				type: "context-group",
				description:
					"Gdzie dane lądują i skąd analityk je bierze. Databricks (37%) i Snowflake (30%) to dwie dominujące platformy nowej generacji — łączą magazyn danych z mocą obliczeniową. Delta Lake to format zapisu Databricks zapewniający spójność danych, BigQuery to hurtownia Google, Oracle — klasyczna baza w starszych systemach.",
				leaves: [
					{ name: "Databricks", kind: "tool" },
					{ name: "Snowflake", kind: "tool" },
					{ name: "Delta Lake", kind: "tool" },
					{ name: "BigQuery", kind: "tool" },
					{ name: "Oracle", kind: "tool" },
				],
			},
			{
				name: "Chmura i wdrażanie",
				type: "context-group",
				description:
					"Współczesny inżynier danych pracuje w chmurze i sam wdraża swoje potoki. Azure (33%) i AWS (28%) to dwie najczęstsze platformy w PL, GCP za nimi. Azure Data Factory orkiestruje przepływy w świecie Microsoftu, Terraform opisuje infrastrukturę kodem (zamiast klikać w panelu — piszesz konfigurację), CI/CD (taśma automatycznego budowania i wdrażania) i Kubernetes (uruchamianie aplikacji na skalę) domykają warsztat.",
				leaves: [
					{
						name: "Azure",
						countAs: ["Azure", "Microsoft Azure"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "AWS",
						countAs: ["AWS", "Amazon AWS"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Azure Data Factory", kind: "tool" },
					{ name: "Azure DevOps", kind: "tool" },
					{ name: "Terraform", kind: "tool" },
					{ name: "CI/CD", kind: "concept" },
					{ name: "Kubernetes", kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 2 2026-06-27 — 7 grup context-group na 698 ofertach (najbogatszy
		// katalog partii). Rdzeń klasyczny: Python+SQL → BI (Power BI) → ETL/hurtownie. Gęstwina
		// synonimów BI/ETL/hurtowni → scalenia UNIĄ (countAsUnion): ETL/ELT (4 warianty), BI (3),
		// Power BI←PowerBi, Data Warehousing (3), chmury. `kind` z dokumentu Sophii. Wyrzucone meta:
		// Data (11.3%!), Data analysis, Analytics, AI, Business Analysis, Jira/Scrum/SAP/ERP.
		label: "Data Analyst",
		areas: [
			{
				name: "Język i zapytania do danych (fundament)",
				type: "context-group",
				description:
					"Dwa najmocniejsze sygnały całej ścieżki. SQL (język zapytań do baz) wyciąga dane — to absolutne minimum analityka, prawie co druga oferta. Python je przerabia i automatyzuje, a biblioteka Pandas obsługuje dane w tabelach. To pierwsza rzecz do nauki i fundament wszystkich pozostałych grup.",
				leaves: [
					{ name: "Python", kind: "tool" },
					{ name: "SQL", kind: "tool" },
					{ name: "Pandas", kind: "tool" },
					{ name: "NumPy", kind: "tool" },
				],
			},
			{
				name: "Business Intelligence i wizualizacja",
				type: "context-group",
				description:
					"Druga połowa roli: surowe dane są bezużyteczne, dopóki ktoś z biznesu ich nie zrozumie. Business Intelligence (BI) to dyscyplina zamiany danych w pulpity (dashboardy) i raporty, na których menedżer podejmuje decyzję. Power BI dominuje w polskich firmach (co piąta oferta), z własnym językiem formuł DAX i narzędziem Power Query do wczytywania danych; Tableau i Looker to konkurenci. To często ważniejsza kompetencja niż zaawansowana statystyka.",
				leaves: [
					{ name: "Power BI", countAs: ["Power BI", "PowerBi"], countAsUnion: true, kind: "tool" },
					{ name: "Tableau", kind: "tool" },
					{ name: "DAX", kind: "tool" },
					{
						name: "Business Intelligence (BI)",
						countAs: ["Business Intelligence (BI)", "BI", "Business Intelligence"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "Power Query", kind: "tool" },
					{ name: "Looker", kind: "tool" },
				],
			},
			{
				name: "ETL i hurtownie danych (przepływy)",
				type: "context-group",
				description:
					"Zanim dane trafią do raportu, ktoś musi je zebrać z wielu systemów, oczyścić i załadować w jedno miejsce — to ETL (Extract-Transform-Load — pobierz, przekształć, załaduj) lub ELT. Wynik ląduje w hurtowni danych (centralnym magazynie do analiz). Modelowanie danych to projektowanie, jak te dane mają być ułożone. To rdzeń pracy „analityka inżynierskiego” — DataStage, dbt, SSIS, Airflow to narzędzia, którymi te rurociągi się buduje.",
				leaves: [
					{
						name: "ETL / ELT",
						countAs: ["ETL", "ELT", "ETL tools", "ETL/ELT"],
						countAsUnion: true,
						kind: "concept",
					},
					{
						name: "Modelowanie danych (Data modeling)",
						countAs: ["Data modeling"],
						kind: "concept",
					},
					{ name: "DataStage", countAs: ["DataStage (ETL)"], kind: "tool" },
					{
						name: "Hurtownia danych (Data Warehousing)",
						countAs: ["Data Warehousing", "Data Warehouse (DW)", "Data Warehouse"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "dbt", countAs: ["DBT"], kind: "tool" },
					{
						name: "Apache Airflow",
						countAs: ["Apache Airflow", "Airflow"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "Integracja danych (Data Integration)",
						countAs: ["Data Integration"],
						kind: "concept",
					},
					{ name: "SSIS", kind: "tool" },
				],
			},
			{
				name: "Arkusze kalkulacyjne (Excel)",
				type: "context-group",
				description:
					"Mimo całej nowoczesnej analityki Excel wciąż pojawia się w 15% ofert — to nie wstyd, tylko prawda o rynku. Dla wielu analityków to pierwsze narzędzie i codzienny warsztat: szybka analiza, tabela przestawna, wykres na już. Najczęstsza brama wejścia do roli i kompetencja, której pracodawcy realnie oczekują obok Power BI.",
				leaves: [{ name: "MS Excel", kind: "tool" }],
			},
			{
				name: "Bazy danych i dialekty SQL",
				type: "context-group",
				description:
					"Dane, które analizujesz, leżą w konkretnych bazach — i każda mówi nieco innym dialektem SQL. Oracle (z dialektem PL/SQL) i MS SQL Server (z dialektem T-SQL) to dwa najczęstsze w polskich korporacjach, PostgreSQL w nowszych projektach. Rozumienie baz relacyjnych (dane powiązane w tabelach) to fundament, na którym stoi cała reszta.",
				leaves: [
					{ name: "Oracle", kind: "tool" },
					{
						name: "MS SQL Server",
						countAs: ["MS SQL Server", "SQL Server"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "PL/SQL", kind: "tool" },
					{ name: "PostgreSQL", kind: "tool" },
					{
						name: "Bazy relacyjne (Relational Databases)",
						countAs: ["Relational Databases"],
						kind: "concept",
					},
					{ name: "T-SQL", kind: "tool" },
				],
			},
			{
				name: "Chmurowe platformy danych",
				type: "context-group",
				description:
					"Analityka coraz częściej żyje w chmurze, gdzie dane są za duże na jedną maszynę. BigQuery (Google) i Snowflake to hurtownie chmurowe, w których odpytujesz miliardy wierszy bez własnego serwera; Databricks dokłada do tego przetwarzanie wielkich zbiorów narzędziem Spark. To granica, na której analityk styka się z inżynierią danych — i kierunek, w którym rynek się przesuwa.",
				leaves: [
					{ name: "BigQuery", kind: "tool" },
					{ name: "Wielkie zbiory danych (Big Data)", countAs: ["Big Data"], kind: "concept" },
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Snowflake", kind: "tool" },
					{
						name: "Azure",
						countAs: ["Azure", "Microsoft Azure", "Microsoft Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "AWS", countAs: ["AWS", "Amazon AWS"], countAsUnion: true, kind: "tool" },
					{ name: "Databricks", kind: "tool" },
					{ name: "Spark", kind: "tool" },
					{ name: "PySpark", kind: "tool" },
				],
			},
			{
				name: "Narzędzia specjalistyczne",
				type: "context-group",
				description:
					"Obszary węższe, ale realne w danych: SAS to weteran analizy statystycznej wciąż obecny w bankach i farmacji; Google Analytics to standard analityki ruchu na stronach i w marketingu. Niszowe względem rdzenia, ale dla części ofert decydujące.",
				leaves: [
					{ name: "Google Analytics", kind: "tool" },
					{ name: "SAS", kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 2 2026-06-27 — 8 grup context-group na 600 ofertach. Najbardziej
		// inżynierska/jednorodna ścieżka: Terraform (54%!) → Kubernetes (43%) → CI/CD (40%). Wymienia
		// placeholder Maxa (presentation/knowledge) na kurację z danych. Scalenia chmur UNIĄ
		// (countAsUnion): Azure (4 warianty), GCP (3), Bash←Shell, Go←Golang, GitHub←GitHub Actions,
		// GitOps←GitOPS, Network←Networking. `kind` z dokumentu Sophii. Wyrzucone meta: AI, DevOps
		// tools, Java/C++ (aplikacja), bazy (rozproszone), Kafka (pogranicze). Brak liści absent.
		label: "DevOps Engineer",
		areas: [
			{
				name: "Infrastruktura jako kod (IaC) — rdzeń roli",
				type: "context-group",
				description:
					"Serce nowoczesnego DevOps i najsilniejszy sygnał rynku. Zamiast ręcznie klikać serwery w panelu, opisujesz całą infrastrukturę kodem — plik mówi „chcę trzy serwery, bazę i sieć”, a narzędzie to tworzy, powtarzalnie i bez pomyłek. Terraform dominuje (ponad połowa ofert!), Ansible konfiguruje już istniejące maszyny, a GitOps (z narzędziami jak ArgoCD) sprawia, że stan infrastruktury jest sterowany przez repozytorium kodu. Od tego zaczyna się ta rola.",
				leaves: [
					{ name: "Terraform", kind: "tool" },
					{ name: "Ansible", kind: "tool" },
					{ name: "IaC", kind: "concept" },
					{ name: "Helm", kind: "tool" },
					{ name: "GitOps", countAs: ["GitOps", "GitOPS"], countAsUnion: true, kind: "concept" },
					{ name: "ArgoCD", kind: "tool" },
					{ name: "Puppet", kind: "tool" },
				],
			},
			{
				name: "Konteneryzacja i orkiestracja",
				type: "context-group",
				description:
					"Sposób, w jaki dziś uruchamia się aplikacje. Docker pakuje aplikację w kontener — lekką, odizolowaną paczkę, która działa tak samo wszędzie. Kubernetes (w prawie połowie ofert!) zarządza setkami takich kontenerów na skalę: sam je uruchamia, restartuje, skaluje pod obciążeniem. OpenShift i AKS to gotowe odmiany Kubernetesa. To druga obowiązkowa kompetencja roli zaraz po IaC.",
				leaves: [
					{ name: "Kubernetes", kind: "tool" },
					{ name: "Docker", kind: "tool" },
					{ name: "OpenShift", kind: "tool" },
					{ name: "AKS", kind: "tool" },
				],
			},
			{
				name: "CI/CD i automatyzacja wydań",
				type: "context-group",
				description:
					"Taśma montażowa oprogramowania: CI/CD (ciągła integracja i dostarczanie) automatycznie buduje, testuje i wdraża kod przy każdej zmianie, bez ręcznej roboty. To Ty jako DevOps tę taśmę budujesz i utrzymujesz — narzędziami Azure DevOps, Jenkins, GitLab czy GitHub Actions. W 40% ofert wprost; w praktyce w każdej.",
				leaves: [
					{ name: "CI/CD", kind: "concept" },
					{ name: "Azure DevOps", kind: "tool" },
					{ name: "Jenkins", kind: "tool" },
					{ name: "GitLab", kind: "tool" },
					{
						name: "GitHub",
						countAs: ["GitHub", "GitHub Actions"],
						countAsUnion: true,
						kind: "tool",
					},
				],
			},
			{
				name: "Chmury",
				type: "context-group",
				description:
					"Na czym stoi cała infrastruktura, którą zarządzasz. AWS i Azure dominują w PL (każda w co czwartej–piątej ofercie), GCP trzeci. Uczysz się przynajmniej jednej — to ona dyktuje konkretne usługi, sieci i sposób rozliczania. DevOps bez chmury dziś praktycznie nie istnieje.",
				leaves: [
					{ name: "AWS", countAs: ["AWS", "Amazon AWS"], countAsUnion: true, kind: "tool" },
					{
						name: "Azure",
						countAs: ["Azure", "Microsoft Azure", "MS Azure", "Microsoft Azure Cloud"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform", "Google Cloud"],
						countAsUnion: true,
						kind: "tool",
					},
				],
			},
			{
				name: "Systemy operacyjne i skrypty",
				type: "context-group",
				description:
					"Fundament pod wszystkim wyżej — żeby zarządzać serwerami, musisz rozumieć ich system. Linux to dom większości serwerów (co piąta oferta), a Bash to język poleceń, którym się nim steruje; PowerShell robi to samo w świecie Windows. Python to język automatyzacji DevOps (drugi po Terraform), którym piszesz własne narzędzia. VMware i OpenStack to wirtualizacja — wiele maszyn na jednym fizycznym serwerze.",
				leaves: [
					{ name: "Python", kind: "tool" },
					{ name: "Linux", kind: "tool" },
					{ name: "Bash", countAs: ["Bash", "Shell"], countAsUnion: true, kind: "tool" },
					{ name: "PowerShell", countAs: ["Powershell"], kind: "tool" },
					{ name: "Windows Server", kind: "tool" },
					{ name: "VMware", kind: "tool" },
					{ name: "Go", countAs: ["Go", "Golang"], countAsUnion: true, kind: "tool" },
					{ name: "Red Hat", kind: "tool" },
					{ name: "OpenStack", kind: "tool" },
					{ name: "Proxmox", kind: "tool" },
				],
			},
			{
				name: "Monitoring i obserwowalność",
				type: "context-group",
				description:
					"Gdy system już działa, ktoś musi pilnować, czy nie umiera o trzeciej w nocy. Prometheus zbiera metryki (ile pamięci, ile żądań), Grafana rysuje z nich pulpity i alarmy, Datadog i Zabbix to gotowe platformy do tego samego. To dyscyplina „obserwowalności” (observability) — widzisz, co dzieje się w środku systemu, zanim zauważy to użytkownik.",
				leaves: [
					{ name: "Grafana", kind: "tool" },
					{ name: "Prometheus", kind: "tool" },
					{ name: "Datadog", kind: "tool" },
					{ name: "Zabbix", kind: "tool" },
				],
			},
			{
				name: "Sieci",
				type: "context-group",
				description:
					"Serwery muszą się ze sobą komunikować — a Ty musisz rozumieć, jak. TCP/IP to podstawowy język sieci, DNS tłumaczy nazwy stron na adresy, a sieci w ogóle (routing, zapory) to fundament, bez którego nie zdiagnozujesz, czemu dwie usługi się nie widzą. Cisco to najczęstszy sprzęt sieciowy w korporacjach.",
				leaves: [
					{
						name: "Sieci (Network)",
						countAs: ["Network", "Networking"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "DNS", kind: "concept" },
					{ name: "TCP/IP", kind: "concept" },
					{ name: "Cisco", kind: "tool" },
				],
			},
			{
				name: "Niezawodność i bezpieczeństwo (SRE / DevSecOps)",
				type: "context-group",
				description:
					"Dojrzała warstwa roli. SRE (Site Reliability Engineering — inżynieria niezawodności) to podejście, w którym niezawodność systemu traktuje się jak problem inżynierski z miarami i budżetem błędów. DevSecOps wpina bezpieczeństwo w taśmę CI/CD, a IAM (zarządzanie tożsamością i dostępem) pilnuje, kto i do czego ma dostęp w chmurze. Kierunek rozwoju seniora DevOps.",
				leaves: [
					{ name: "DevSecOps", kind: "concept" },
					{ name: "SRE", kind: "concept" },
					{ name: "IAM", kind: "concept" },
					{ name: "Active Directory", kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 3 2026-06-27 (scratchpad/sophia-a4-partia3.md) — 6 grup
		// context-group na 494 ofertach, najczystsza ścieżka partii (Java 89%). Scalenia UNIĄ
		// (countAsUnion): Spring/Spring Boot (zawyża ~2×), chmury (AWS/Azure/GCP), REST/API,
		// Kafka←Apache Kafka, PostgreSQL←PostreSQL (literówka w zrzucie). `kind` z dokumentu
		// Sophii. Wykluczone meta/szum: gołe „Backend”. JPA/NoSQL/CI-CD/REST-API/Microservices/
		// Agile → concept (style/wzorce/metodyki, nie narzędzia).
		label: "Java Developer",
		areas: [
			{
				name: "Język i ekosystem JVM (rdzeń)",
				type: "context-group",
				description:
					"Serce roli — język Java i biblioteki, które wyrastają wprost z niego. Java to fundament wielkich systemów bankowych i korporacyjnych w PL: prawie 9 na 10 ofert jej wymaga. Na Javie stoi Spring (i jego nowsza odsłona Spring Boot) — rusztowanie, które obsługuje za Ciebie routing, bazę i bezpieczeństwo; oraz Hibernate/JPA — warstwa, która mapuje obiekty kodu na tabele bazy. Maven składa projekt i pobiera zależności. To zestaw, od którego zaczyna każdy junior Java.",
				leaves: [
					{ name: "Java", kind: "tool" },
					{
						name: "Spring / Spring Boot",
						countAs: ["Spring", "Spring Boot"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Hibernate", kind: "tool" },
					{ name: "JPA", kind: "concept" },
					{ name: "Maven", kind: "tool" },
					{ name: "Groovy", kind: "tool" },
					{ name: "Kotlin", kind: "tool" },
				],
			},
			{
				name: "Bazy danych",
				type: "context-group",
				description:
					"Java istnieje, żeby przetwarzać i zapisywać dane — bez baz nie ma roli. Co trzecia oferta wymaga SQL-a (języka zapytań do baz relacyjnych). PostgreSQL to dziś domyślny wybór nowych projektów, Oracle dominuje w starszych systemach bankowych. NoSQL (bazy bez sztywnej struktury, np. MongoDB) pojawia się tam, gdzie liczy się szybkość odczytu. PL/SQL to proceduralny dialekt Oracle.",
				leaves: [
					{ name: "SQL", kind: "tool" },
					{
						name: "PostgreSQL",
						countAs: ["PostgreSQL", "PostreSQL"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Oracle", kind: "tool" },
					{ name: "MongoDB", kind: "tool" },
					{ name: "NoSQL", kind: "concept" },
					{ name: "PL/SQL", kind: "tool" },
				],
			},
			{
				name: "Chmura i wdrażanie (DevOps backendu)",
				type: "context-group",
				description:
					"Drugi najsilniejszy sygnał po języku. Współczesny dev Java sam wdraża swój kod do chmury i utrzymuje go — nie „oddaje adminowi”. Docker pakuje aplikację w kontener, Kubernetes uruchamia ją na skalę, CI/CD (taśma automatycznego budowania i wdrażania) z Jenkinsem domyka proces. AWS to najczęstsza chmura w PL, Azure i GCP za nią. Linux to system, na którym to wszystko działa.",
				leaves: [
					{ name: "Docker", kind: "tool" },
					{ name: "Kubernetes", kind: "tool" },
					{ name: "AWS", countAs: ["AWS", "Amazon AWS"], countAsUnion: true, kind: "tool" },
					{ name: "CI/CD", kind: "concept" },
					{ name: "Jenkins", kind: "tool" },
					{
						name: "Azure",
						countAs: ["Azure", "Microsoft Azure"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Linux", kind: "tool" },
				],
			},
			{
				name: "Architektura usług i komunikacja",
				type: "context-group",
				description:
					"Duży system Java to rzadko jeden program — to zbiór usług gadających ze sobą. Dzielisz system na mikrousługi (małe, niezależne kawałki), wystawiasz API (interfejs, przez który inne programy Cię wołają) w stylu REST, a do komunikacji asynchronicznej (gdy usługa nie czeka na odpowiedź) używasz kolejek Kafka i RabbitMQ. SOAP to starszy styl integracji wciąż żywy w bankach, Elasticsearch — wyszukiwarka pełnotekstowa.",
				leaves: [
					{ name: "Mikrousługi (Microservices)", countAs: ["Microservices"], kind: "concept" },
					{
						name: "REST / API",
						countAs: ["REST API", "REST"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"], countAsUnion: true, kind: "tool" },
					{ name: "RabbitMQ", kind: "tool" },
					{ name: "SOAP", kind: "tool" },
					{ name: "Elasticsearch", kind: "tool" },
				],
			},
			{
				name: "Testy i jakość kodu",
				type: "context-group",
				description:
					"Profesjonalny kod Java jest pokryty testami — to standard, nie luksus. JUnit to podstawowe narzędzie testów jednostkowych (sprawdzających pojedyncze fragmenty kodu w izolacji); znajomość go odróżnia juniora „klikającego” od inżyniera. Spring Security domyka warstwę uwierzytelniania i autoryzacji.",
				leaves: [
					{ name: "JUnit", kind: "tool" },
					{ name: "Spring Security", kind: "tool" },
				],
			},
			{
				name: "Frontend i warsztat (styk full-stack)",
				type: "context-group",
				description:
					"W PL granica między backendem a frontem często się zaciera — część ofert Java wymaga też Angulara, Reacta czy JavaScriptu. Git (system kontroli wersji, czyli historia zmian w kodzie) i praca w Agile (zwinna metodyka iteracyjna) to dziś warsztat bazowy każdego dewelopera, niezależnie od stosu.",
				leaves: [
					{ name: "Angular", kind: "tool" },
					{ name: "React", kind: "tool" },
					{ name: "JavaScript", kind: "tool" },
					{ name: "Git", kind: "tool" },
					{ name: "Agile", kind: "concept" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 3 2026-06-27 (scratchpad/sophia-a4-partia3.md) — 6 grup
		// context-group na 397 ofertach, świat Microsoftu (C# 60%+). Scalenia UNIĄ (countAsUnion):
		// C#/.NET (4 warianty C#+.Net+.NET C#+.NET Core, suma →~138%), ASP.NET←ASP.NET Core,
		// MS SQL Server (4 zapisy), Azure/AWS, REST/API (3), Kafka←Apache Kafka. `kind` Sophii.
		// Wykluczone override'em: Active Server Pages (classic ASP, martwa), Dynamics/CRM (osobna
		// rola), gołe „Backend”/„Testing”. CI-CD/REST-API/Microservices/NoSQL/Agile → concept.
		label: ".NET Developer",
		areas: [
			{
				name: "Język i platforma .NET (rdzeń)",
				type: "context-group",
				description:
					"Serce roli — język C# i platforma .NET, na której piszesz logikę aplikacji. To filar „świata Microsoftu” w PL: dwie na trzy oferty wymagają C#. ASP.NET to webowy framework tej platformy (rusztowanie pod aplikacje i API), Entity Framework — warstwa mapująca obiekty kodu na tabele bazy. .NET Core to nowoczesna, wieloplatformowa odsłona runtime’u (środowiska uruchomieniowego).",
				leaves: [
					{
						name: "C# / .NET",
						countAs: ["C#", ".Net", ".NET C#", ".NET Core"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "ASP.NET",
						countAs: ["ASP.NET", "ASP.NET Core"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Entity Framework", kind: "tool" },
				],
			},
			{
				name: "Bazy danych",
				type: "context-group",
				description:
					"Aplikacja .NET istnieje, żeby zapisywać i wydawać dane. W świecie Microsoftu domyślną bazą jest MS SQL Server, ale rynek wymaga też ogólnego SQL-a (języka zapytań) i PostgreSQL (otwartej bazy relacyjnej). NoSQL pojawia się tam, gdzie liczy się szybkość ponad sztywną strukturę.",
				leaves: [
					{ name: "SQL", kind: "tool" },
					{
						name: "MS SQL Server",
						countAs: ["MS SQL Server", "SQL Server", "MS SQL", "Microsoft SQL Server"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "PostgreSQL", kind: "tool" },
					{ name: "NoSQL", kind: "concept" },
				],
			},
			{
				name: "Chmura i wdrażanie",
				type: "context-group",
				description:
					"Nowoczesny dev .NET wdraża sam do chmury. W tym stosie naturalną platformą jest Azure (chmura Microsoftu) — z Azure DevOps jako zintegrowaną taśmą CI/CD (automatycznego budowania i wdrażania). Docker pakuje aplikację w kontener, Kubernetes uruchamia ją na skalę, Terraform opisuje infrastrukturę kodem. AWS pojawia się jako druga chmura.",
				leaves: [
					{
						name: "Azure",
						countAs: ["Azure", "Microsoft Azure"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Azure DevOps", kind: "tool" },
					{ name: "Docker", kind: "tool" },
					{ name: "Kubernetes", kind: "tool" },
					{ name: "AWS", countAs: ["AWS", "Amazon AWS"], countAsUnion: true, kind: "tool" },
					{ name: "Terraform", kind: "tool" },
					{ name: "CI/CD", kind: "concept" },
				],
			},
			{
				name: "Architektura usług i komunikacja",
				type: "context-group",
				description:
					"System .NET to zbiór usług gadających ze sobą. Wystawiasz API (interfejs dla innych programów) w stylu REST, dzielisz aplikację na mikrousługi (małe, niezależne kawałki), a do komunikacji asynchronicznej używasz kolejek RabbitMQ czy Kafka.",
				leaves: [
					{
						name: "REST / API",
						countAs: ["REST API", "REST", "API (Application Programming Interface)"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "Mikrousługi (Microservices)", countAs: ["Microservices"], kind: "concept" },
					{ name: "RabbitMQ", kind: "tool" },
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"], countAsUnion: true, kind: "tool" },
				],
			},
			{
				name: "Frontend (styk full-stack)",
				type: "context-group",
				description:
					"Część ofert .NET oczekuje, że dotkniesz też frontu — najczęściej Angulara (historycznie blisko świata Microsoftu) lub Reacta, w TypeScripcie (JavaScript z typami). Nie musisz być ekspertem, ale podstawy poszerzają Twoją wartość.",
				leaves: [
					{ name: "React", kind: "tool" },
					{ name: "Angular", kind: "tool" },
					{ name: "JavaScript", kind: "tool" },
					{ name: "TypeScript", kind: "tool" },
				],
			},
			{
				name: "Warsztat i metodyka",
				type: "context-group",
				description:
					"Git (historia zmian w kodzie) i praca w Agile (zwinna metodyka iteracyjna) to warsztat bazowy każdego dewelopera niezależnie od stosu.",
				leaves: [
					{ name: "Git", kind: "tool" },
					{ name: "Agile", kind: "concept" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 2 2026-06-27 — 6 grup context-group na 579 ofertach. Rynek
		// wielojęzyczny i mocno chmurowy: żaden język nie dominuje (Python 38%, Java 27%, C#/.NET 19%,
		// Node/TS 18%), chmura drugim sygnałem (AWS 30%, Azure 26%). Scalenia UNIĄ (countAsUnion):
		// C#/.NET (3 warianty: C#+.Net+.NET C#), REST/API (3), chmury, Node.js←Node, Spring, MS SQL.
		// `kind` z dokumentu Sophii. Docker NIE w danych (wszechobecny→niewymieniany) — nie dopisuję.
		// Wyrzucone meta: AI, Backend, Machine Learning, Active Directory/Powershell/Linux (admin).
		label: "Backend Developer",
		areas: [
			{
				name: "Języki backendu",
				type: "context-group",
				description:
					"Serce roli — język, w którym piszesz logikę serwera. W PL rynek jest podzielony: Python (najszybciej rosnący, też AI/dane), Java (wielkie systemy bankowe i korporacyjne), C#/.NET (świat Microsoftu), TypeScript (backend w Node.js). Wybierasz jeden główny — on zwykle decyduje, który framework i bazę poznasz. Nie ma tu jednego „słusznego” wyboru; każdy otwiera inną część rynku.",
				leaves: [
					{ name: "Python", kind: "tool" },
					{ name: "Java", kind: "tool" },
					{
						name: "C# / .NET",
						countAs: ["C#", ".Net", ".NET C#"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "TypeScript", kind: "tool" },
					{ name: "JavaScript", kind: "tool" },
					{ name: "Go", kind: "tool" },
					{ name: "Scala", kind: "tool" },
					{ name: "C++", kind: "tool" },
				],
			},
			{
				name: "Chmura i wdrażanie (DevOps backendu)",
				type: "context-group",
				description:
					"Drugi najsilniejszy sygnał rynku zaraz po języku. Współczesny backend dev nie „oddaje kodu adminowi” — sam go wdraża do chmury i utrzymuje. AWS i Azure to dwie dominujące platformy w PL (każda w co czwartej ofercie), Kubernetes uruchamia aplikacje na skalę, CI/CD (taśma automatycznego budowania i wdrażania) i Terraform (infrastruktura opisana kodem) domykają warsztat. To dziś nieodłączna część roli, nie dodatek.",
				leaves: [
					{ name: "AWS", countAs: ["AWS", "Amazon AWS"], countAsUnion: true, kind: "tool" },
					{
						name: "Azure",
						countAs: ["Azure", "Microsoft Azure"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "CI/CD", kind: "concept" },
					{ name: "Kubernetes", kind: "tool" },
					{ name: "Terraform", kind: "tool" },
					{ name: "Jenkins", kind: "tool" },
					{ name: "GitLab", kind: "tool" },
					{ name: "Helm", kind: "tool" },
				],
			},
			{
				name: "Bazy danych",
				type: "context-group",
				description:
					"Backend istnieje po to, żeby zapisywać i wydawać dane — bez baz nie ma roli. Świat dzieli się na relacyjny (SQL, PostgreSQL, Oracle, MS SQL Server — dane w tabelach z relacjami) i NoSQL (MongoDB, Redis — dane bez sztywnej struktury, szybkie odczyty). Co trzecia oferta wymaga SQL-a, a PostgreSQL to dziś domyślny wybór nowych projektów. Uczysz się obu światów, bo realny system zwykle używa kilku baz naraz.",
				leaves: [
					{ name: "SQL", kind: "tool" },
					{
						name: "PostgreSQL",
						countAs: ["PostgreSQL", "PostreSQL"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "MongoDB", kind: "tool" },
					{ name: "NoSQL", kind: "concept" },
					{ name: "MySQL", kind: "tool" },
					{ name: "Oracle", kind: "tool" },
					{
						name: "MS SQL Server",
						countAs: ["MS SQL Server", "SQL Server", "MS SQL"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Redis", kind: "tool" },
				],
			},
			{
				name: "Frameworki i środowiska uruchomieniowe",
				type: "context-group",
				description:
					"Nikt nie pisze backendu od zera — używasz frameworka, czyli gotowego rusztowania, które obsługuje typowe zadania (routing, bazę, bezpieczeństwo) za Ciebie. Każdy język ma swój: Spring/Spring Boot (Java), Django/Flask (Python), Nest.js na Node.js (TypeScript/JavaScript). Wybór frameworka idzie w parze z wyborem języka z grupy języków backendu.",
				leaves: [
					{ name: "Node.js", countAs: ["Node.js", "Node"], countAsUnion: true, kind: "tool" },
					{ name: "Django", kind: "tool" },
					{ name: "Nest.js", kind: "tool" },
					{
						name: "Spring / Spring Boot",
						countAs: ["Spring", "Spring Boot"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Flask", kind: "tool" },
				],
			},
			{
				name: "API, architektura i komunikacja usług",
				type: "context-group",
				description:
					"Backend rzadko jest jednym programem — to zbiór usług gadających ze sobą. Projektujesz API (interfejs, przez który inne programy Cię wołają) w stylu REST lub GraphQL, dzielisz system na mikrousługi (małe, niezależne kawałki), a do komunikacji asynchronicznej (gdy usługa nie czeka na odpowiedź) używasz kolejek Kafka czy RabbitMQ. DDD (projektowanie sterowane dziedziną) to sposób układania kodu wokół realnych pojęć biznesowych.",
				leaves: [
					{
						name: "REST / API",
						countAs: ["REST API", "REST", "API (Application Programming Interface)"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "Mikrousługi (Microservices)", countAs: ["Microservices"], kind: "concept" },
					{ name: "GraphQL", kind: "tool" },
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"], countAsUnion: true, kind: "tool" },
					{ name: "RabbitMQ", kind: "tool" },
					{ name: "DDD", kind: "concept" },
				],
			},
			{
				name: "Frontend (styk full-stack)",
				type: "context-group",
				description:
					"W PL granica między backendem a frontem często się zaciera — co czternasta oferta backendu wymaga też React, Angular lub Next.js. To sygnał, że rynek ceni „pełny stos” (full-stack): umiesz nie tylko serwer, ale i ekran, który użytkownik klika. Nie musisz być ekspertem frontu, ale podstawy poszerzają Twoją wartość.",
				leaves: [
					{ name: "React", kind: "tool" },
					{ name: "Angular", kind: "tool" },
					{ name: "Next.js", kind: "tool" },
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
		// KURACJA SOPHII A4 partia 2 2026-06-27 — 7 grup context-group na 436 ofertach. Najczystsza
		// ścieżka partii: JS/TS (po 58%) + React (55%) na fundamencie HTML/CSS (~30%). Scalenia UNIĄ
		// (countAsUnion): JS←JS, CSS←CSS3, HTML←HTML5, REST/API (5 wariantów), C#/.NET (3), Vue.js←Vue,
		// Go←Golang. `kind` z dokumentu Sophii. jQuery (2.3%) ŚWIADOMIE wykluczony (schyłkowa) — decyzja
		// produktowa > próg. Wyrzucone meta: AI, frontend, Backend, Testing (zostaje Unit Testing).
		label: "Frontend Developer",
		areas: [
			{
				name: "Języki frontendu (rdzeń)",
				type: "context-group",
				description:
					"Dwa języki, którymi mówi przeglądarka. JavaScript to oryginał — ożywia stronę, reaguje na kliknięcia. TypeScript to JavaScript z typami (sprawdzaniem, że nie wstawisz tekstu tam, gdzie ma być liczba) — dziś standard w poważnych projektach, w równie wielu ofertach co JS. Uczysz się obu; TypeScript jest nadbudową, nie alternatywą.",
				leaves: [
					{ name: "JavaScript", countAs: ["JavaScript", "JS"], countAsUnion: true, kind: "tool" },
					{ name: "TypeScript", kind: "tool" },
				],
			},
			{
				name: "HTML i CSS (struktura i wygląd)",
				type: "context-group",
				description:
					"Fundament, od którego zaczyna każdy frontendowiec. HTML to szkielet strony (co jest nagłówkiem, co przyciskiem), CSS to jej wygląd (kolory, układ, responsywność na telefonie). Nowoczesny CSS pisze się szybciej narzędziami Sass/SCSS (rozszerzenie CSS) i Tailwind czy Bootstrap (gotowe zestawy styli). Bez solidnego HTML/CSS żaden framework nie pomoże.",
				leaves: [
					{ name: "CSS", countAs: ["CSS", "CSS3"], countAsUnion: true, kind: "tool" },
					{ name: "HTML", countAs: ["HTML", "HTML5"], countAsUnion: true, kind: "tool" },
					{ name: "Sass / SCSS", countAs: ["SCSS"], kind: "tool" },
					{ name: "Tailwind CSS", kind: "tool" },
					{ name: "Bootstrap", kind: "tool" },
				],
			},
			{
				name: "Frameworki interfejsu i zarządzanie stanem",
				type: "context-group",
				description:
					"Nikt nie buduje dziś interfejsu „gołym” JavaScriptem — używasz frameworka, który składa stronę z gotowych klocków (komponentów). React dominuje w PL (ponad połowa ofert), Angular to druga droga (całościowy, korporacyjny), Vue to lżejsza alternatywa. Next.js rozszerza React o wydajność i renderowanie po stronie serwera. Gdy aplikacja rośnie, pojawia się zarządzanie stanem (Redux, NgRx, RxJS) — sposób panowania nad danymi krążącymi po całym interfejsie.",
				leaves: [
					{ name: "React", kind: "tool" },
					{ name: "Angular", kind: "tool" },
					{ name: "Next.js", kind: "tool" },
					{ name: "Redux", kind: "tool" },
					{ name: "Vue.js", countAs: ["Vue.js", "Vue"], countAsUnion: true, kind: "tool" },
					{ name: "RxJS", kind: "tool" },
					{ name: "NgRx", kind: "tool" },
				],
			},
			{
				name: "Node.js i komunikacja z API",
				type: "context-group",
				description:
					"Front nie żyje sam — pobiera dane z serwera. API (interfejs, przez który prosisz serwer o dane) w stylu REST lub GraphQL to sposób tej rozmowy. Node.js pozwala pisać też backend w tym samym języku co front (JavaScript), a Nest.js to popularny framework na nim — stąd krok do roli full-stack (pełny stos: front i backend naraz).",
				leaves: [
					{ name: "Node.js", countAs: ["Node.js", "Node"], countAsUnion: true, kind: "tool" },
					{
						name: "REST / API",
						countAs: [
							"REST API",
							"REST",
							"API",
							"API (Application Programming Interface)",
							"RESTful API",
						],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "GraphQL", kind: "concept" },
					{ name: "Nest.js", kind: "tool" },
				],
			},
			{
				name: "Narzędzia, budowanie i testy",
				type: "context-group",
				description:
					"Codzienny warsztat inżynierski frontu. Git wersjonuje kod (co siódma oferta wymienia go wprost), CI/CD automatycznie buduje i wdraża stronę przy każdej zmianie, Webpack skleja dziesiątki plików w jedną szybką paczkę. Testy — Jest (komponentów), Cypress i Playwright (całych ścieżek użytkownika) — pilnują, żeby nowa zmiana nie zepsuła starego.",
				leaves: [
					{ name: "Git", kind: "tool" },
					{ name: "CI/CD", kind: "concept" },
					{ name: "Webpack", kind: "tool" },
					{ name: "Jest", kind: "tool" },
					{ name: "Testy jednostkowe (Unit Testing)", countAs: ["Unit Testing"], kind: "concept" },
					{ name: "Cypress", kind: "tool" },
					{ name: "Playwright", kind: "tool" },
				],
			},
			{
				name: "Inne języki i stacki (styk full-stack)",
				type: "context-group",
				description:
					"Co dwudziesta oferta frontu wymaga też C#/.NET, PHP, Java, Python czy Go — to sygnał ról „pełny stos”, gdzie ta sama osoba pisze front i backend. ASP.NET (świat .NET) i Ruby on Rails to całościowe frameworki webowe. Nie musisz znać wszystkich, ale jeden dodatkowy język znacząco poszerza, gdzie się załapiesz.",
				leaves: [
					{ name: "Python", kind: "tool" },
					{
						name: "C# / .NET",
						countAs: ["C#", ".Net", ".NET C#"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Java", kind: "tool" },
					{ name: "PHP", kind: "tool" },
					{
						name: "Ruby on Rails",
						countAs: ["Ruby on Rails", "Ruby"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "ASP.NET Core",
						countAs: ["ASP.NET Core", "ASP.NET"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Go", countAs: ["Go", "Golang"], countAsUnion: true, kind: "tool" },
				],
			},
			{
				name: "Specjalizacje frontendu",
				type: "context-group",
				description:
					"Boczne, ale wyraźne ścieżki. React Native pozwala z wiedzy reactowej budować aplikacje mobilne (jeden kod na iOS i Androida). WordPress i systemy zarządzania treścią (CMS) to ogromny rynek prostszych stron firmowych. SEO (optymalizacja pod wyszukiwarki) i współpraca z projektantami w Figmie to kompetencje na styku z marketingiem i designem.",
				leaves: [
					{ name: "React Native", kind: "tool" },
					{ name: "WordPress", kind: "tool" },
					{ name: "UX/UI", kind: "concept" },
					{ name: "System zarządzania treścią (CMS)", countAs: ["CMS"], kind: "concept" },
					{ name: "Figma", kind: "tool" },
					{ name: "SEO", kind: "concept" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 3 2026-06-27 (scratchpad/sophia-a4-partia3.md) — 5 grup
		// context-group na 308 ofertach, web end-to-end (React 60%, TS 51%). Scalenia UNIĄ
		// (countAsUnion): Vue.js←Vue, Node.js←Node, Spring/Spring Boot, Golang←Go, PostgreSQL←
		// PostreSQL, chmury (AWS/GCP/Azure), REST/API (3), Kafka←Apache Kafka. `kind` Sophii.
		// Wykluczone override'em: AI (7.8%) i RAG (2.3%) jako buzzword/meta (spójne z partią 2),
		// gołe „Backend”. CI-CD/REST-API/Microservices/NoSQL → concept.
		label: "Full-Stack Developer",
		areas: [
			{
				name: "Frontend",
				type: "context-group",
				description:
					"Połowa roli full-stack — ekran, który użytkownik klika. React dominuje (6 na 10 ofert), pisany w TypeScripcie (JavaScript z typami, który łapie błędy przed uruchomieniem). Angular to drugi duży framework (świat korporacyjny), Vue.js i Next.js uzupełniają obraz. React Native przenosi te same umiejętności na aplikacje mobilne.",
				leaves: [
					{ name: "React", kind: "tool" },
					{ name: "TypeScript", kind: "tool" },
					{ name: "JavaScript", kind: "tool" },
					{ name: "Angular", kind: "tool" },
					{ name: "Vue.js", countAs: ["Vue.js", "Vue"], countAsUnion: true, kind: "tool" },
					{ name: "Next.js", kind: "tool" },
					{ name: "React Native", kind: "tool" },
				],
			},
			{
				name: "Backend i języki serwera",
				type: "context-group",
				description:
					"Druga połowa roli — logika serwera. W PL rynek full-stack jest wielojęzyczny: Java (wielkie systemy, 45% ofert), Python (najszybciej rosnący), Node.js z Nest.js (backend w JavaScripcie/TypeScripcie — ten sam język po obu stronach). Spring Boot to framework Javy, Hibernate mapuje obiekty na bazę. Wybierasz główny język serwera — on zwykle decyduje resztę.",
				leaves: [
					{ name: "Java", kind: "tool" },
					{ name: "Python", kind: "tool" },
					{ name: "Node.js", countAs: ["Node.js", "Node"], countAsUnion: true, kind: "tool" },
					{
						name: "Spring / Spring Boot",
						countAs: ["Spring Boot", "Spring"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Nest.js", kind: "tool" },
					{ name: "Golang", countAs: ["Golang", "Go"], countAsUnion: true, kind: "tool" },
					{ name: "Hibernate", kind: "tool" },
					{ name: "Kotlin", kind: "tool" },
				],
			},
			{
				name: "Bazy danych",
				type: "context-group",
				description:
					"Full-stack zapisuje i wydaje dane po obu stronach. Co piąta oferta wymaga SQL-a (zapytań do baz relacyjnych), PostgreSQL to domyślny wybór nowych projektów. NoSQL (bazy bez sztywnej struktury, np. MongoDB) i Redis (szybka pamięć podręczna) pojawiają się tam, gdzie liczy się szybkość.",
				leaves: [
					{ name: "SQL", kind: "tool" },
					{
						name: "PostgreSQL",
						countAs: ["PostgreSQL", "PostreSQL"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "NoSQL", kind: "concept" },
					{ name: "Redis", kind: "tool" },
					{ name: "Oracle", kind: "tool" },
					{ name: "MySQL", kind: "tool" },
				],
			},
			{
				name: "Chmura i wdrażanie",
				type: "context-group",
				description:
					"Full-stack dev sam wdraża aplikację do chmury. AWS to najczęstsza platforma w PL (co trzecia oferta), Docker pakuje aplikację w kontener, CI/CD (taśma automatycznego budowania i wdrażania) domyka proces. Kubernetes, GCP i Azure uzupełniają obraz.",
				leaves: [
					{ name: "AWS", countAs: ["AWS", "Amazon AWS"], countAsUnion: true, kind: "tool" },
					{ name: "Docker", kind: "tool" },
					{ name: "CI/CD", kind: "concept" },
					{ name: "Kubernetes", kind: "tool" },
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "Azure",
						countAs: ["Azure", "Microsoft Azure"],
						countAsUnion: true,
						kind: "tool",
					},
				],
			},
			{
				name: "Architektura usług i komunikacja",
				type: "context-group",
				description:
					"Front i back gadają ze sobą przez API (interfejs, przez który ekran woła serwer). Projektujesz je w stylu REST lub GraphQL, dzielisz system na mikrousługi (małe, niezależne kawałki), a Kafka obsługuje komunikację asynchroniczną.",
				leaves: [
					{
						name: "REST / API",
						countAs: ["REST", "REST API", "API"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "Mikrousługi (Microservices)", countAs: ["Microservices"], kind: "concept" },
					{ name: "GraphQL", kind: "tool" },
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"], countAsUnion: true, kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 3 2026-06-27 (scratchpad/sophia-a4-partia3.md) — 5 grup
		// context-group na 376 ofertach, mobile. Sygnał rynkowy: Java (54%) > Kotlin (35%) —
		// wbrew narracji „Kotlin first”, wyeksponowane w opisie Grupy 1 (brand voice: prawda o
		// rynku). Scalenia UNIĄ (countAsUnion): Kotlin Multiplatform←Kotlin multiplatform (zapis),
		// REST/API, Kafka. `kind` Sophii. Wykluczone override'em: gołe „Android” (27.4%, meta jak
		// „Testing”), Gosu/Guidewire (szum ubezpieczeń), Scala (przeciek backendu). MVVM/Coroutines/
		// CI-CD/REST-API → concept.
		label: "Android Developer",
		areas: [
			{
				name: "Języki Androida (rdzeń)",
				type: "context-group",
				description:
					"Serce roli — język aplikacji. Wbrew obietnicy „Kotlin first” z konferencji, polski rynek Androida wciąż stoi na Javie (więcej ofert niż Kotlin) — bo żywych aplikacji napisanych dawniej w Javie jest więcej niż nowych. Kotlin to oficjalny, nowocześniejszy język Androida (zwięźlejszy, bezpieczniejszy), rosnący najszybciej. Coroutines to mechanizm Kotlina do zadań działających w tle (np. pobieranie danych bez zacinania ekranu). Kotlin Multiplatform pozwala dzielić kod między Android a iOS.",
				leaves: [
					{ name: "Java", kind: "tool" },
					{ name: "Kotlin", kind: "tool" },
					{ name: "Coroutines", kind: "concept" },
					{
						name: "Kotlin Multiplatform",
						countAs: ["Kotlin Multiplatform", "Kotlin multiplatform"],
						countAsUnion: true,
						kind: "tool",
					},
				],
			},
			{
				name: "SDK i komponenty natywne Androida",
				type: "context-group",
				description:
					"Rdzeń warsztatu androidowego: Android SDK to zestaw narzędzi i bibliotek platformy, Android Studio to środowisko, w którym piszesz (IDE). Jetpack Compose to nowoczesny sposób budowania ekranów kodem (zastępuje stary XML). MVVM to wzorzec architektury aplikacji (rozdziela dane, logikę i ekran), Gradle składa projekt w gotową aplikację.",
				leaves: [
					{ name: "Android SDK", kind: "tool" },
					{ name: "Jetpack Compose", kind: "tool" },
					{ name: "Android Studio", kind: "tool" },
					{ name: "MVVM", kind: "concept" },
					{ name: "Gradle", kind: "tool" },
					{ name: "XML", kind: "tool" },
				],
			},
			{
				name: "Wieloplatformowość i iOS (styk mobilny)",
				type: "context-group",
				description:
					"Część rynku mobile nie dzieli ostro Androida i iOS — szuka dewelopera, który dowiezie aplikację na oba systemy. Swift i SwiftUI to język i framework iOS-a, Flutter i React Native to technologie wieloplatformowe (jeden kod → dwa systemy). To uczciwy obraz rynku: znajomość drugiego świata mobilnego realnie poszerza Twoją wartość.",
				leaves: [
					{ name: "iOS", kind: "tool" },
					{ name: "Swift", kind: "tool" },
					{ name: "SwiftUI", kind: "tool" },
					{ name: "Flutter", kind: "tool" },
					{ name: "React Native", kind: "tool" },
					{ name: "XCode", kind: "tool" },
				],
			},
			{
				name: "Komunikacja z backendem",
				type: "context-group",
				description:
					"Aplikacja mobilna prawie zawsze rozmawia z serwerem — pobiera i wysyła dane. Robi to przez API (interfejs serwera) w stylu REST lub GraphQL, w formacie JSON (lekki zapis danych). SOAP to starszy styl integracji wciąż obecny w korporacjach.",
				leaves: [
					{
						name: "REST / API",
						countAs: ["REST API", "REST"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "GraphQL", kind: "tool" },
					{ name: "JSON", kind: "tool" },
					{ name: "SOAP", kind: "tool" },
				],
			},
			{
				name: "Warsztat, testy i CI/CD",
				type: "context-group",
				description:
					"Git (historia zmian w kodzie) to baza pracy zespołowej. CI/CD (taśma automatycznego budowania i wdrażania) z Jenkinsem buduje gotową aplikację, Maven składa zależności, Appium automatyzuje testy aplikacji mobilnej (program, który sam klika po ekranie i sprawdza, czy działa).",
				leaves: [
					{ name: "Git", kind: "tool" },
					{ name: "CI/CD", kind: "concept" },
					{ name: "Jenkins", kind: "tool" },
					{ name: "Maven", kind: "tool" },
					{ name: "Appium", kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 1 2026-06-27 (scratchpad/sophia-a4-partia1-qa-ds-ai.md) —
		// METODA SUROWY UDZIAŁ, wzorzec cyber. 8 grup context-group na 393 ofertach QA.
		// `kind` z dokumentu Sophii (tool/concept), liczby z danych (silnik). Scalenia: Selenium
		// ←Selenium WebDriver, C#←.Net, API/REST←REST API/API/REST, Jira←Atlassian JIRA. Wyrzucone
		// meta/szum: Testing/QA/Quality Assurance, AI, English, Spring, GCP (technologia SUT, nie
		// warsztat testera). Test Automation (meta) zablokowany — zostaje Automated Testing.
		label: "QA Engineer",
		areas: [
			{
				name: "Języki programowania testera",
				type: "context-group",
				description:
					"Automatyzacja testów to pisanie kodu — bez języka zostajesz przy testach manualnych. Na polskim rynku QA króluje Java (prawie co druga oferta), bo testuje się nią ogromne systemy bankowe i korporacyjne; zaraz za nią JavaScript/TypeScript (testy aplikacji webowych narzędziami Playwright/Cypress) oraz C# (świat .NET). Python jest językiem najszybszego wejścia i testów API (interfejsów usług). Wybierasz przynajmniej jeden — i to on zwykle decyduje, które narzędzia automatyzacji poznasz.",
				leaves: [
					{ name: "Java", kind: "tool" },
					{ name: "JavaScript", kind: "tool" },
					{ name: "Python", kind: "tool" },
					{ name: "C# (.NET)", countAs: ["C#", ".Net"], countAsUnion: true, kind: "tool" },
					{ name: "TypeScript", kind: "tool" },
					{ name: "C++", kind: "tool" },
				],
			},
			{
				name: "Automatyzacja testów interfejsu",
				type: "context-group",
				description:
					"Rdzeń nowoczesnej roli QA: piszesz program, który klika po aplikacji jak użytkownik i sam sprawdza, czy wszystko działa — codziennie, bez ręcznej pracy. Selenium to weteran i wciąż najczęstszy wymóg, Playwright to jego nowocześniejszy następca (rośnie najszybciej), Cypress to ulubieniec front-endu. Appium przenosi to samo na aplikacje mobilne.",
				leaves: [
					{
						name: "Selenium",
						countAs: ["Selenium", "Selenium WebDriver"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Playwright", kind: "tool" },
					{
						name: "Automatyzacja testów (Automated Testing)",
						countAs: ["Automated Testing"],
						kind: "concept",
					},
					{ name: "Cypress", kind: "tool" },
					{ name: "Appium", kind: "tool" },
				],
			},
			{
				name: "Bazy danych (SQL)",
				type: "context-group",
				description:
					"Co trzecia oferta QA wymaga SQL — języka zapytań do baz danych. Tester sprawdza nie tylko ekran, ale i to, co aplikacja realnie zapisała w bazie: czy zamówienie trafiło z właściwą kwotą, czy nic się nie zdublowało. Bez SQL widzisz tylko połowę prawdy o systemie. Oracle to najczęstsza konkretna baza w polskich ofertach korporacyjnych.",
				leaves: [
					{ name: "SQL", kind: "tool" },
					{ name: "Oracle", kind: "tool" },
				],
			},
			{
				name: "Testowanie API i usług",
				type: "context-group",
				description:
					"Nowoczesna aplikacja to nie jeden program, tylko usługi gadające ze sobą przez API (interfejs do sterowania programem z innego programu) w stylu REST. Coraz więcej błędów łapie się zanim powstanie ekran — testując same te usługi. Postman to najpopularniejsze narzędzie do ręcznego odpytywania API; testowanie API jako kompetencja jest tu silniejsze niż Cypress.",
				leaves: [
					{ name: "Testowanie API (API Testing)", countAs: ["API Testing"], kind: "concept" },
					{ name: "Postman", kind: "tool" },
					{ name: "API / REST", countAs: ["REST API", "API", "REST"], kind: "concept" },
				],
			},
			{
				name: "CI/CD i narzędzia inżynierskie",
				type: "context-group",
				description:
					"Twoje testy mają sens tylko, jeśli uruchamiają się automatycznie przy każdej zmianie kodu — to jest CI/CD (ciągła integracja i dostarczanie, taśma montażowa oprogramowania). QA wpina testy w tę taśmę narzędziem Jenkins i wersjonuje swój kod w Git. Bez tego automatyzacja zostaje skryptem na Twoim laptopie, którego nikt nie odpala.",
				leaves: [
					{ name: "CI/CD", kind: "concept" },
					{ name: "Jenkins", kind: "tool" },
					{ name: "Git", kind: "tool" },
				],
			},
			{
				name: "Testy manualne i projektowanie testów",
				type: "context-group",
				description:
					"Zanim cokolwiek zautomatyzujesz, musisz wiedzieć co i dlaczego testować — to jest projektowanie przypadków testowych. Testy manualne to najczęstsza brama wejścia juniora do QA, a ISTQB to międzynarodowy certyfikat-kanon teorii testów, który większość pracodawców rozpoznaje jako dowód podstaw. Tu uczysz się myśleć jak tester, nie tylko obsługiwać narzędzie.",
				leaves: [
					{ name: "Testy manualne (Manual Testing)", countAs: ["Manual Testing"], kind: "concept" },
					{
						name: "Projektowanie przypadków testowych (Test Cases)",
						countAs: ["Test Cases"],
						kind: "concept",
					},
					{ name: "ISTQB", kind: "concept" },
				],
			},
			{
				name: "Metodyki i organizacja pracy",
				type: "context-group",
				description:
					"QA pracuje w zespole produktowym w trybie Agile (zwinnym — krótkie iteracje zamiast jednego wielkiego wydania) i raportuje błędy oraz zadania w Jira (najpopularniejszy w PL system śledzenia zgłoszeń). To nie technika testowania, ale bez tego nie wpasujesz się w rytm zespołu.",
				leaves: [
					{ name: "Agile", kind: "concept" },
					{ name: "Jira", countAs: ["Jira", "Atlassian JIRA"], kind: "tool" },
				],
			},
			{
				name: "Frameworki testowe i BDD",
				type: "context-group",
				description:
					"Biblioteki, które nadają strukturę Twoim testom i je uruchamiają: JUnit (świat Javy), pytest (świat Pythona). Cucumber realizuje podejście BDD (Behaviour-Driven Development — testy opisane zdaniami zrozumiałymi dla biznesu, np. „gdy klient kliknie Zapłać, to…”), żeby nietechniczny członek zespołu rozumiał, co jest sprawdzane.",
				leaves: [
					{ name: "Cucumber", kind: "tool" },
					{ name: "JUnit", kind: "tool" },
					{ name: "pytest", kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 4 2026-06-27 (scratchpad/sophia-a4-partia4.md) — 5 grup
		// context-group na 481 ofertach, most biznes-IT (UML 59%, BPMN 50%). Scalenia UNIĄ
		// (countAsUnion): Business Analysis←Analiza Biznesowa, Analiza systemowa←System Analysis
		// (zrzut dwujęzyczny), REST/API (3: REST API+REST+API). SQL osobną grupą mimo 1 liścia.
		// `kind` Sophii (notacje/wzorce→concept). Wykluczone: Kafka/Java/OOP/Kibana (przeciek tech),
		// Analytical Thinking (soft). Microservices: countAs bez unii (1 wariant w danych).
		label: "Business Analyst",
		areas: [
			{
				name: "Notacje i modelowanie (rdzeń)",
				type: "context-group",
				description:
					"Serce roli analityka — rysowanie tego, jak system i proces mają działać, w umownym języku graficznym (notacji), który rozumie i biznes, i programista. UML (60% ofert) opisuje strukturę i zachowanie systemu, BPMN (50%) rysuje przebieg procesu biznesowego krok po kroku. Enterprise Architect to najpopularniejsze narzędzie, w którym się to rysuje (26% ofert), ArchiMate — notacja do architektury całej organizacji.",
				leaves: [
					{ name: "UML", kind: "concept" },
					{ name: "BPMN", kind: "concept" },
					{ name: "Enterprise Architect", kind: "tool" },
					{ name: "ArchiMate", kind: "concept" },
				],
			},
			{
				name: "Analiza wymagań i dokumentacja",
				type: "context-group",
				description:
					"Druga połowa roli — zamiana mglistych życzeń biznesu w precyzyjne wymagania, które programista wykona bez zgadywania. Analiza biznesowa i systemowa to rdzeń tej pracy; User Stories (historyjki użytkownika: „jako X chcę Y, żeby Z”) to format zapisu wymagań w zwinnych zespołach, a SDLC (cykl życia oprogramowania — od pomysłu po utrzymanie) to rama, w której analityk się porusza.",
				leaves: [
					{
						name: "Business Analysis",
						countAs: ["Business Analysis", "Analiza Biznesowa"],
						countAsUnion: true,
						kind: "concept",
					},
					{
						name: "Analiza systemowa",
						countAs: ["analiza systemowa", "System Analysis"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "User Stories", kind: "concept" },
					{ name: "SDLC", kind: "concept" },
					{ name: "CASE", kind: "concept" },
				],
			},
			{
				name: "API, integracje i architektura usług",
				type: "context-group",
				description:
					"Coraz częściej analityk projektuje, jak systemy gadają ze sobą — nie tylko z człowiekiem. API (interfejs, przez który jeden program woła drugi) w stylu REST to standard; analityk opisuje je i testuje (Postman, Swagger, SoapUI — narzędzia do „zawołania” API i sprawdzenia odpowiedzi). SOAP i ESB (szyna integracyjna spinająca wiele systemów) żyją w korporacjach, SOA i mikrousługi to style dzielenia systemu na współpracujące części, TOGAF — rama architektury korporacyjnej.",
				leaves: [
					{
						name: "REST / API",
						countAs: ["REST API", "REST", "API"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "Postman", kind: "tool" },
					{ name: "Swagger", kind: "tool" },
					{ name: "SoapUI", kind: "tool" },
					{ name: "SOAP", kind: "tool" },
					{ name: "SOA", kind: "concept" },
					{ name: "ESB", kind: "concept" },
					{ name: "XML", kind: "tool" },
					{ name: "Microservices (Mikrousługi)", countAs: ["Microservices"], kind: "concept" },
					{ name: "TOGAF", kind: "concept" },
				],
			},
			{
				name: "Bazy danych i zapytania",
				type: "context-group",
				description:
					"Dobry analityk sam sięga do danych, zamiast czekać na programistę. SQL (język zapytań do baz relacyjnych) to jego najważniejsza umiejętność techniczna — co trzecia oferta go wymaga. Pozwala odpowiedzieć na pytanie biznesowe wprost z bazy: ilu klientów, jaki przychód, gdzie spadek.",
				leaves: [{ name: "SQL", kind: "tool" }],
			},
			{
				name: "Metodyka i narzędzia zespołowe",
				type: "context-group",
				description:
					"Warsztat codziennej pracy w zespole IT. Jira (30% ofert) to system, w którym żyją zadania i wymagania, Confluence — wiki, gdzie analityk pisze dokumentację. Agile i Scrum to zwinne metodyki iteracyjne (praca w krótkich cyklach zamiast jednego wielkiego planu), MS Office — wciąż codzienne narzędzie analityka (Excel, prezentacje).",
				leaves: [
					{ name: "Jira", kind: "tool" },
					{ name: "Confluence", kind: "tool" },
					{ name: "Agile", kind: "concept" },
					{ name: "Scrum", kind: "concept" },
					{ name: "MS Office", kind: "tool" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 4 2026-06-27 (scratchpad/sophia-a4-partia4.md) — 4 grupy
		// context-group na 700 ofertach (największy wolumen partii). Rola zarządcza — dominują
		// metodyki/koncepcje. Scalenie UNIĄ (countAsUnion): Jira←Atlassian JIRA. Soft-kompetencje
		// PM (Stakeholder Mgmt, Communication) jako `concept`-rdzeń, NIE do kubełka soft. PRINCE2
		// → cert (kubełek certyfikatów). Wykluczone: AI (buzzword), Testing/QA/SAP/ServiceNow
		// (przeciek tech/domenowy), gołe Documentation/training (soft generyczny), English (język).
		label: "Project Manager",
		areas: [
			{
				name: "Metodyki i ramy zarządzania (rdzeń)",
				type: "context-group",
				description:
					"Serce roli — sposób, w jaki prowadzisz projekt do końca. Project Management (38%) i Agile (36%, zwinne prowadzenie w krótkich cyklach) to dwa najsilniejsze sygnały. Scrum i Kanban to konkretne odmiany zwinności, Waterfall (kaskadowy: zaplanuj wszystko z góry, potem wykonaj) to klasyczne podejście wciąż żywe w korporacji. SAFe skaluje zwinność na wielkie organizacje, a PRINCE2 to sformalizowana metodyka prowadzenia projektu, znana głównie z certyfikatu o tej samej nazwie.",
				leaves: [
					{ name: "Project Management", kind: "concept" },
					{ name: "Agile", kind: "concept" },
					{ name: "Scrum", kind: "concept" },
					{ name: "Kanban", kind: "concept" },
					{ name: "Waterfall", kind: "concept" },
					{ name: "SAFe", kind: "concept" },
					{ name: "PRINCE2", kind: "cert" },
					{ name: "Scrum Master", kind: "concept" },
				],
			},
			{
				name: "Narzędzia pracy PM",
				type: "context-group",
				description:
					"Oprogramowanie, w którym PM faktycznie prowadzi projekt. Jira (30%) trzyma zadania i postęp, Confluence (18%) to wiki z dokumentacją i decyzjami. MS Project to klasyczne narzędzie do harmonogramów (wykres Gantta — pasy zadań na osi czasu), a MS Office i Excel obsługują budżet, raporty i komunikację.",
				leaves: [
					{
						name: "Jira",
						countAs: ["Jira", "Atlassian JIRA"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Confluence", kind: "tool" },
					{ name: "MS Project", kind: "tool" },
					{ name: "MS Office", kind: "tool" },
					{ name: "Microsoft Excel", kind: "tool" },
				],
			},
			{
				name: "Zarządzanie interesariuszami i zespołem",
				type: "context-group",
				description:
					"Najtrudniejsza, najbardziej ludzka część roli — i często ta, która decyduje o sukcesie projektu. Zarządzanie interesariuszami (stakeholders — wszyscy, których projekt dotyczy: klient, zarząd, zespół) i komunikacja to rdzeń. Change Management (zarządzanie zmianą — przeprowadzenie ludzi przez nowy sposób pracy), koordynacja, zarządzanie ryzykiem i governance (ład: zasady i nadzór nad tym, jak projekt jest prowadzony) domykają obraz.",
				leaves: [
					{ name: "Stakeholder Management", kind: "concept" },
					{ name: "Communication", kind: "concept" },
					{ name: "Change Management", kind: "concept" },
					{ name: "Coordination", kind: "concept" },
					{ name: "Risk Management", kind: "concept" },
					{ name: "Governance", kind: "concept" },
				],
			},
			{
				name: "Styk z analizą i dostarczaniem",
				type: "context-group",
				description:
					"PM nie pracuje w próżni — styka się z analizą biznesową (zrozumienie, co właściwie ma powstać) i z dostarczaniem (delivery — doprowadzenie do faktycznego wdrożenia). PMO to biuro zarządzania projektami (komórka pilnująca standardów i portfela projektów w firmie), Project Execution to faza realizacji planu.",
				leaves: [
					{ name: "Business Analysis", kind: "concept" },
					{ name: "PMO", kind: "concept" },
					{ name: "Project Execution", kind: "concept" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 5 2026-06-27 (scratchpad/sophia-a4-partia5.md) — 5 grup
		// context-group na 269 ofertach, rola zarządcza (dominują koncepcje/metodyki, mało
		// „tool"). Scalenia UNIĄ (countAsUnion): Business Analysis←Analiza Biznesowa (zrzut
		// dwujęzyczny). `kind` Sophii: metodyki/kompetencje zarządcze = concept, ITIL = cert.
		// Analytical Thinking WŁĄCZONY jako concept rdzeniowy (najsilniejszy sygnał, 39%) —
		// świadome rozstrzygnięcie niespójności z partią 4 (Sygnał #5). Wykluczone: AI (buzzword
		// 19%), „product owner" (nazwa roli), przeciek tech (Azure/Python/Backend/SQL/ML/Testing).
		label: "Product Owner / Manager",
		areas: [
			{
				name: "Produkt i przywództwo (rdzeń)",
				type: "context-group",
				description:
					"Serce roli — odpowiedzialność za to, CO powstaje i DLACZEGO. Product Management (35% ofert, drugi najsilniejszy sygnał) to zarządzanie produktem: ustalanie, które funkcje budujemy i w jakiej kolejności, na podstawie wartości dla użytkownika. Myślenie analityczne (Analytical Thinking — najsilniejszy sygnał roli, 39%) to fundament: PO podejmuje decyzje na danych, nie na przeczuciu. Przywództwo (Leadership) domyka rdzeń — PO prowadzi zespół bez formalnej władzy nad nim.",
				leaves: [
					{ name: "Product Management", kind: "concept" },
					{
						name: "Myślenie analityczne (Analytical Thinking)",
						countAs: ["Analytical Thinking"],
						kind: "concept",
					},
					{ name: "Leadership", kind: "concept" },
				],
			},
			{
				name: "Metodyki zwinne i prowadzenie projektu",
				type: "context-group",
				description:
					"Sposób, w jaki PO prowadzi pracę zespołu. Agile (23% ofert) to zwinne podejście: budujesz w krótkich cyklach i często weryfikujesz z użytkownikiem, zamiast planować wszystko z góry. Scrum i Kanban to konkretne odmiany zwinności (Scrum — praca w stałych „sprintach”; Kanban — ciągły przepływ zadań). Project Management (18%) to rama prowadzenia całości do terminu i budżetu.",
				leaves: [
					{ name: "Agile", kind: "concept" },
					{ name: "Scrum", kind: "concept" },
					{ name: "Kanban", kind: "concept" },
					{ name: "Project Management", kind: "concept" },
				],
			},
			{
				name: "Narzędzia pracy PO",
				type: "context-group",
				description:
					"Oprogramowanie, w którym PO faktycznie prowadzi produkt. Jira (12% ofert) trzyma listę zadań i postęp zespołu, Confluence to wiki, gdzie PO opisuje wymagania, decyzje i mapę rozwoju produktu (roadmapę).",
				leaves: [
					{ name: "Jira", kind: "tool" },
					{ name: "Confluence", kind: "tool" },
				],
			},
			{
				name: "Analiza i wymagania",
				type: "context-group",
				description:
					"PO tłumaczy potrzeby biznesu na konkretne wymagania, które zespół zbuduje. Analiza biznesowa to rdzeń tej pracy (zrozumienie, jaki problem właściwie rozwiązujemy), a SDLC (cykl życia oprogramowania — od pomysłu, przez budowę, po utrzymanie) to rama, w której PO się porusza.",
				leaves: [
					{
						name: "Business Analysis",
						countAs: ["Business Analysis", "Analiza Biznesowa"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "SDLC", kind: "concept" },
				],
			},
			{
				name: "Domena i systemy korporacyjne",
				type: "context-group",
				description:
					"Kontekst, w którym pracuje PO — często produkt cyfrowy lub system korporacyjny. SaaS (11% ofert — oprogramowanie sprzedawane jako usługa abonamentowa, np. Netflix dla firm) to dziś dominujący model produktu, w którym PO buduje. CRM (system zarządzania relacjami z klientem), ERP i SAP (systemy do zarządzania całą firmą — finanse, magazyn, kadry) oraz ITIL (zbiór dobrych praktyk zarządzania usługami IT) to światy, w których PO produktu wewnętrznego się porusza.",
				leaves: [
					{ name: "SaaS", kind: "concept" },
					{ name: "CRM", kind: "concept" },
					{ name: "SAP", kind: "tool" },
					{ name: "ERP", kind: "concept" },
					{ name: "ITIL", kind: "cert" },
				],
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
		// KURACJA SOPHII A4 partia 4 2026-06-27 (scratchpad/sophia-a4-partia4.md) — 5 grup
		// context-group na 238 ofertach, kariera „na platformie". Scalenia UNIĄ (countAsUnion):
		// REST/API (3), CRM←Customer Relationship Management (CRM) Suite, SAP←SAP HANA, chmury.
		// LWC: countAs ["LWC"] (display rozwinięty). `kind` Sophii. Wykluczone: English/German/Polish
		// (języki — Sygnał #2 rynek eksportowy), SQL/Java/PHP (przeciek, Salesforce używa SOQL),
		// Programming/IT Support/Backend (meta/przeciek). Anchor projektu LWC→pełna nazwa liścia.
		label: "Salesforce Developer",
		areas: [
			{
				name: "Platforma Salesforce (rdzeń)",
				type: "context-group",
				description:
					"Serce roli — programujesz wewnątrz Salesforce (najpopularniejszej na świecie platformy CRM, czyli systemu do zarządzania relacjami z klientami). Apex to język programowania tej platformy (przypomina Javę, ale działa tylko w Salesforce), LWC (Lightning Web Components) to nowoczesny sposób budowania ekranów, Visualforce — starszy. Sales Cloud i Service Cloud to dwa główne moduły (sprzedaż i obsługa klienta), które konfigurujesz i rozszerzasz.",
				leaves: [
					{ name: "Salesforce", kind: "tool" },
					{ name: "Apex", kind: "tool" },
					{ name: "LWC (Lightning Web Components)", countAs: ["LWC"], kind: "tool" },
					{ name: "Visualforce", kind: "tool" },
					{ name: "Sales Cloud", kind: "tool" },
					{ name: "Service Cloud", kind: "tool" },
				],
			},
			{
				name: "Integracje i API",
				type: "context-group",
				description:
					"Salesforce rzadko stoi sam — łączy się z resztą firmowych systemów. To drugi najsilniejszy sygnał roli (API 29%): wystawiasz i konsumujesz API (interfejs, przez który systemy wymieniają dane) w stylu REST lub starszym SOAP, dane płyną w formacie JSON (lekki zapis), a Postman służy do testowania tych połączeń.",
				leaves: [
					{
						name: "REST / API",
						countAs: ["API", "REST API", "REST"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "SOAP", kind: "tool" },
					{ name: "JSON", kind: "tool" },
					{ name: "Postman", kind: "tool" },
				],
			},
			{
				name: "Web i interfejs",
				type: "context-group",
				description:
					"Część pracy Salesforce dewelopera to klasyczny front — ekrany, które widzi użytkownik. HTML (struktura strony) i CSS (jej wygląd) to podstawa, JavaScript dodaje interaktywność. Te umiejętności wykorzystasz, budując własne komponenty Lightning ponad standardem platformy.",
				leaves: [
					{ name: "HTML", kind: "tool" },
					{ name: "CSS", kind: "tool" },
					{ name: "JavaScript", kind: "tool" },
				],
			},
			{
				name: "Systemy korporacyjne i CRM",
				type: "context-group",
				description:
					"Salesforce żyje w krajobrazie innych dużych systemów firmowych. CRM to kategoria, do której sam należy (zarządzanie relacjami z klientem), SAP i SAP HANA to dominujący system do zarządzania całą firmą (finanse, magazyn, kadry), ERP — ta sama kategoria, ServiceNow — platforma obsługi zgłoszeń. Integracja z nimi to częste zadanie roli.",
				leaves: [
					{
						name: "CRM",
						countAs: ["CRM", "Customer Relationship Management (CRM) Suite"],
						countAsUnion: true,
						kind: "concept",
					},
					{
						name: "SAP",
						countAs: ["SAP", "SAP HANA"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "ERP", kind: "concept" },
					{ name: "ServiceNow", kind: "tool" },
				],
			},
			{
				name: "Warsztat i metodyka",
				type: "context-group",
				description:
					"Warsztat bazowy każdego dewelopera, też na platformie. Jira trzyma zadania, Agile (zwinna metodyka iteracyjna) organizuje pracę, CI/CD (taśma automatycznego budowania i wdrażania) automatyzuje publikację zmian na platformę.",
				leaves: [
					{ name: "Jira", kind: "tool" },
					{ name: "Agile", kind: "concept" },
					{ name: "CI/CD", kind: "concept" },
				],
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
		// KURACJA SOPHII A4 partia 5 2026-06-27 (scratchpad/sophia-a4-partia5.md) — 4 grupy
		// context-group na 81 ofertach. ŚCIEŻKA CIENKA (najmniej ofert w katalogu), ale NIE
		// patologiczna: Architektura #1 (45,7%), konkrety architekta obecne. Scalenia UNIĄ
		// (countAsUnion): REST/API (4 warianty), Kafka, Azure (3 zapisy), GCP. OVERRIDE IN poniżej
		// bramki wolumenu (keepBelowGate, n=2–3): TOGAF/ArchiMate/DDD/ESB — leksykon definiujący
		// architekta; bez nich katalog = „senior Java + chmura". Wykluczone: Cloud (meta), AI
		// (buzzword 36%), English/Python 3.x. Cienkość oddana w prozie (grupa 4 = „substrat,
		// nie istota"), BEZ flagi „dane wstępne" (decyzja UI Darka, etap C — Sygnał #1).
		label: "Solution Architect",
		note: "Rola wymagająca podstaw programistycznych — informacja, nie blokada wyboru.",
		areas: [
			{
				name: "Architektura i wzorce projektowe (rdzeń roli)",
				type: "context-group",
				description:
					"Serce roli — projektowanie, jak system ma być zbudowany, zanim padnie pierwsza linia kodu. Architektura (45,7% ofert) to świadome decyzje o podziale systemu na części i ich współpracy. DDD (Domain-Driven Design — projektowanie wokół pojęć biznesowych, nie technicznych) i Event Streaming (architektura oparta na strumieniu zdarzeń — system reaguje na zdarzenia w czasie rzeczywistym) to konkretne style. TOGAF i ArchiMate to ramy i notacja architektury korporacyjnej (jak opisać architekturę całej organizacji), a Enterprise Architect to program, w którym się to rysuje. Te ostatnie pojawiają się w niewielu ofertach, ale to one odróżniają architekta od seniora-programisty.",
				leaves: [
					{ name: "Architektura systemów", countAs: ["Architecture"], kind: "concept" },
					{
						name: "DDD (Domain-Driven Design)",
						countAs: ["DDD"],
						kind: "concept",
						keepBelowGate: true,
					},
					{ name: "Event Streaming", kind: "concept" },
					{ name: "TOGAF", kind: "concept", keepBelowGate: true },
					{ name: "ArchiMate", kind: "concept", keepBelowGate: true },
					{ name: "Enterprise Architect", kind: "tool" },
				],
			},
			{
				name: "Integracja i komunikacja systemów",
				type: "context-group",
				description:
					"Praca architekta to w dużej mierze spinanie wielu systemów, żeby gadały ze sobą poprawnie i skalowalnie. Kafka to standard komunikacji strumieniowej (jeden system wysyła zdarzenia, inne je odbierają), API w stylu REST (interfejs, przez który programy się wołają) to podstawa integracji, ESB (szyna integracyjna — centralny punkt spinający systemy korporacyjne) i WebLogic to świat dużych systemów korporacyjnych, Oracle to klasyczna baza w ich centrum.",
				leaves: [
					{ name: "Kafka", countAs: ["Kafka", "Apache Kafka"], countAsUnion: true, kind: "tool" },
					{
						name: "REST / API",
						countAs: ["RESTful API", "API", "REST API", "REST"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "ESB", kind: "concept", keepBelowGate: true },
					{ name: "WebLogic", kind: "tool" },
					{ name: "Oracle", kind: "tool" },
				],
			},
			{
				name: "Chmura i skalowanie",
				type: "context-group",
				description:
					"Nowoczesny architekt projektuje systemy działające w chmurze i odporne na obciążenie. Azure (22% ofert) i GCP to platformy chmurowe, Kubernetes uruchamia aplikacje na skalę (sam dokłada i odejmuje moc pod obciążeniem), Docker pakuje je w kontenery. To warstwa, w której architekt decyduje, jak system rośnie wraz z liczbą użytkowników.",
				leaves: [
					{
						name: "Azure",
						countAs: ["Azure", "Microsoft Azure", "MS Azure"],
						countAsUnion: true,
						kind: "tool",
					},
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "Kubernetes", kind: "tool" },
					{ name: "Docker", kind: "tool" },
				],
			},
			{
				name: "Substrat techniczny (skąd przychodzi architekt)",
				type: "context-group",
				description:
					"Architekt rozwiązań to zwykle senior, który wyrósł z konkretnego stosu technicznego — i oferty to odzwierciedlają. Java (44% ofert) i Python (36%) to dwa najczęstsze języki, z których architekci w PL przychodzą; ETL (Extract-Transform-Load — wzorzec przenoszenia danych ze źródła do hurtowni) pojawia się przy architekturze danych. To NIE są umiejętności, które czynią Cię architektem — to fundament, na którym architektura się buduje. Pokazujemy je uczciwie, ale nazwa grupy mówi wprost: to substrat, nie istota roli.",
				leaves: [
					{ name: "Java", kind: "tool" },
					{ name: "Python", kind: "tool" },
					{ name: "ETL", kind: "concept" },
				],
			},
		],
	},
	{
		// KURACJA SOPHII A4 partia 5 2026-06-27 (scratchpad/sophia-a4-partia5.md) — 5 grup
		// context-group na 188 ofertach, rdzeń wyrazisty (C++ 76,6%, C 33,5%, Linux 31,9%).
		// Scalenia UNIĄ (countAsUnion): Embedded Systems←Embedded (nazwa domeny, dwa zapisy),
		// AWS/GCP (chmury). `kind` Sophii: Embedded Systems/RTOS/CI/CD/DevSecOps = concept, języki/
		// sprzęt = tool. Wykluczone: gamedev (Scratch/Roblox/Unity/LUA — szum anchora), przeciek
		// mobile (Kotlin/Java — Android/backend, NIE rdzeń embedded; Sygnał #2), C#/JS/ML/soft.
		label: "Embedded / C++ Developer",
		note: "Było „Software Engineer”; przemianowane (dyrektywa 3) — realny profil C++ 74%.",
		areas: [
			{
				name: "Języki systemowe (rdzeń)",
				type: "context-group",
				description:
					"Serce roli — języki, w których pisze się oprogramowanie blisko sprzętu, gdzie liczy się każdy bajt pamięci i mikrosekunda. C++ rządzi bezwzględnie (prawie 8 na 10 ofert), a czysty C (co trzecia oferta) to język sterowników i najmniejszych układów. Rust to nowocześniejszy język systemowy, który wchodzi tam, gdzie zależy nam na bezpieczeństwie pamięci bez utraty wydajności. To fundament, od którego zaczyna każdy junior embedded.",
				leaves: [
					{ name: "C++", kind: "tool" },
					{ name: "C", kind: "tool" },
					{ name: "Rust", kind: "tool" },
				],
			},
			{
				name: "Systemy wbudowane i sprzęt",
				type: "context-group",
				description:
					"To, co odróżnia embedded od „zwykłego” programowania w C++ — kod działa na fizycznym urządzeniu, nie na serwerze. Systemy wbudowane (embedded) to oprogramowanie zaszyte w sprzęcie: pralce, sterowniku samochodu, czujniku. freeRTOS i RTOS to systemy operacyjne czasu rzeczywistego (gwarantują reakcję w ściśle określonym czasie — krytyczne, gdy poduszka powietrzna ma się otworzyć w 20 milisekund). FPGA i VHDL to świat układów programowalnych (projektujesz sam obwód logiczny, nie tylko program), CMake składa projekt w gotowy plik wykonywalny.",
				leaves: [
					{
						name: "Embedded Systems",
						countAs: ["Embedded Systems", "Embedded"],
						countAsUnion: true,
						kind: "concept",
					},
					{ name: "freeRTOS", kind: "tool" },
					{ name: "RTOS", kind: "concept" },
					{ name: "FPGA", kind: "tool" },
					{ name: "VHDL", kind: "tool" },
					{ name: "CMake", kind: "tool" },
				],
			},
			{
				name: "Linux niskopoziomowy i warsztat systemowy",
				type: "context-group",
				description:
					"Embedded i C++ niemal zawsze żyją na Linuksie — to system, na którym kompilujesz, debugujesz i często który sam wgrywasz na urządzenie. Linux (co trzecia oferta) i jego jądro (Linux Kernel — najgłębsza warstwa, którą embedded dev czasem modyfikuje pod konkretny sprzęt) to rdzeń warsztatu. Bash automatyzuje powtarzalne komendy, administracja systemami i sieci pojawiają się tam, gdzie urządzenie musi działać w infrastrukturze. Git trzyma historię zmian w kodzie.",
				leaves: [
					{ name: "Linux", kind: "tool" },
					{ name: "Linux Kernel", kind: "tool" },
					{ name: "Bash", kind: "tool" },
					{ name: "administracja systemami", kind: "tool" },
					{ name: "sieci", kind: "tool" },
					{ name: "Git", kind: "tool" },
				],
			},
			{
				name: "Skrypty, automatyzacja i testy",
				type: "context-group",
				description:
					"Wbrew stereotypowi „embedded to tylko C”, Python jest drugim najsilniejszym sygnałem roli (41,5% ofert) — nie do produkcyjnego kodu na urządzeniu, lecz do narzędzi: skryptów budujących, automatyzacji testów (program, który sam sprawdza, czy układ reaguje poprawnie) i analizy danych z czujników. To uczciwy obraz rynku 2026: junior embedded w PL realnie potrzebuje Pythona obok C++.",
				leaves: [{ name: "Python", kind: "tool" }],
			},
			{
				name: "Chmura, kontenery i CI/CD (styk IoT/edge)",
				type: "context-group",
				description:
					"Coraz więcej urządzeń łączy się z chmurą (IoT — internet rzeczy: sprzęt, który wysyła dane do serwera) i część ofert embedded oczekuje, że ogarniesz też tę stronę. CI/CD (taśma automatycznego budowania i wdrażania) buduje i testuje firmware, Docker pakuje narzędzia w kontener, Kubernetes uruchamia je na skalę, AWS i GCP to chmury, do których urządzenie raportuje. DevSecOps domyka warsztat bezpieczeństwem wbudowanym w proces.",
				leaves: [
					{ name: "CI/CD", kind: "concept" },
					{ name: "Docker", kind: "tool" },
					{ name: "Kubernetes", kind: "tool" },
					{ name: "AWS", countAs: ["AWS", "Amazon AWS"], countAsUnion: true, kind: "tool" },
					{
						name: "GCP",
						countAs: ["GCP", "Google Cloud Platform"],
						countAsUnion: true,
						kind: "tool",
					},
					{ name: "DevSecOps", kind: "concept" },
				],
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
			anchorLeaves: ["Java", "Spring / Spring Boot", "PostgreSQL", "JUnit"],
			description:
				"Aplikacja CRUD: encje, repozytoria, kontrolery REST, walidacja, dokumentacja Swagger, kilka testów JUnit.",
			portfolioOutcome: "Działające API w repo z dokumentacją.",
			marketRationale: "Spring Boot 48% + PostgreSQL 20% = rdzeń ofert Java.",
		},
		{
			level: "sredni",
			title: "System rezerwacji z autoryzacją (Spring Security + Hibernate + Docker)",
			anchorLeaves: ["Java", "Spring / Spring Boot", "Hibernate", "SQL", "Docker", "JUnit"],
			description:
				"Rezerwacje (sale/wizyty), warstwa Hibernate/JPA, autoryzacja ról JWT, konteneryzacja Docker, testy integracyjne.",
			portfolioOutcome: "Aplikacja z auth i bazą w kontenerze.",
			marketRationale: "Hibernate 25% + Docker 20% + Spring = typowy stack mid.",
		},
		{
			level: "zaawansowany",
			title: "Mikrousługi zamówień z Kafka i CI/CD",
			anchorLeaves: ["Java", "Spring / Spring Boot", "Kafka", "Docker", "Kubernetes", "Jenkins"],
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
			anchorLeaves: ["Salesforce", "Apex", "LWC (Lightning Web Components)"],
			description:
				"Niestandardowe obiekty, trigger Apex (automatyczne przypisanie), interfejs w Lightning Web Components.",
			portfolioOutcome: "Aplikacja z własnym kodem.",
			marketRationale: "Apex 15% + LWC 8% = sygnał ról deweloperskich Salesforce.",
		},
		{
			level: "zaawansowany",
			title: "Integracja Salesforce z zewnętrznym API (Apex REST + testy)",
			anchorLeaves: ["Salesforce", "Apex", "LWC (Lightning Web Components)"],
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
