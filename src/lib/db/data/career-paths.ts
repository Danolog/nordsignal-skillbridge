// ============================================================================
// KATALOG 23 REALNYCH ŚCIEŻEK KARIERY (Partia 4 — onboarding na realnym rynku)
//
// Źródło prawdy: src/lib/db/data/career-model.json (_meta.families + paths).
// Tu trzymamy LEKKĄ, kuratorowaną listę (sama nazwa + rodzina e-CF + czy to rola
// docelowa) — bez importu wielkiego JSON-a do bundla klienta. 23 nazwy = DOKŁADNIE
// te same stringi co `job_market_data.career_goal` (seed buduje katalog rynku z tego
// samego modelu), więc wybór z tej listy GWARANTUJE trafienie w katalog kompetencji.
//
// Decyzje Sophii D1 (docs/product/onboarding-decyzje-sophia-v0.1.md):
//   - 23 ścieżki zostają, grupowane w 5 rodzin e-CF (paradoks wyboru → taksonomia).
//   - Pomocnik proponuje TYLKO ścieżki wejściowe (21 = 23 − 2 role docelowe).
//   - 2 role docelowe (Solution Architect, Engineering Manager) WIDOCZNE do przejrzenia
//     z etykietą „rola docelowa — nie punkt startu" (pokazane, nie ukryte — v5 §4).
//
// Reguła twarda: ta lista NIE jest generowana przez model (HITL, Built-to-Sell).
// Zmiana katalogu rynku (nowe kotwice) idzie przez career-model + reseed, nie tu.
// ============================================================================

/** Rodzina zawodowa e-CF (EN 16234) — 5 rodzin z `career-model.json` `_meta.families`. */
export type CareerFamily =
	| "I — Dane i Sztuczna Inteligencja"
	| "II — Inżynieria Oprogramowania"
	| "III — Infrastruktura, Chmura i Bezpieczeństwo"
	| "IV — Jakość, Testy i Architektura"
	| "V — Zarządzanie, Produkt i Systemy Biznesowe";

export interface CareerPath {
	/** Etykieta = DOKŁADNA wartość `job_market_data.career_goal` (klucz katalogu rynku). */
	careerGoal: string;
	/** Rodzina e-CF (do grupowania w pełnej liście — D1). */
	family: CareerFamily;
	/**
	 * Rola docelowa: stanowisko, do którego dochodzi się po latach, NIE punkt startu
	 * juniora. true → etykieta „rola docelowa — nie punkt startu"; Pomocnik jej NIE
	 * proponuje aktywnie (D1), ale jest widoczna do przejrzenia.
	 */
	targetRole: boolean;
	/**
	 * ETAP H: krótka adnotacja-zastrzeżenie profilu (np. „profil szeroki", „dane wstępne").
	 * LEKKA KOPIA klienta dla pickera (źródło prawdy = career-model.json `profileNote`;
	 * picker jest „use client" i nie może importować dużego JSON-a). Trzymane spójnie
	 * z PATH_META.profileNote — jak `targetRole`, który też żyje w obu plikach.
	 */
	profileNote?: string;
	/**
	 * PILOTAŻ (fala 2, decyzja Olivera, przegląd domenowy Sophii): czy ścieżkę wolno
	 * POKAZAĆ uczestnikowi do wyboru. `false` → nie pojawia się na ŻADNEJ powierzchni
	 * wyboru. Brak pola = dostępna (reguła: `availableInPilot !== false`).
	 *
	 * DLACZEGO TO NIE JEST `targetRole`: to inne pojęcie. `targetRole` mówi „to nie
	 * jest punkt startu juniora" i ścieżka ZOSTAJE widoczna (Solution Architect ma być
	 * widoczny). `availableInPilot: false` mówi „profil tej ścieżki wprowadza w błąd,
	 * nie pokazujemy go w ogóle". Doklejenie tego do `targetRole` ukryłoby Solution
	 * Architecta i rozlało regułę na drugi plik — `targetRole` żyje też w `career-model.json`.
	 *
	 * POWÓD UKRYCIA (zmierzone udziały w ofertach, zrzut JustJoinIT 2026-02): kotwica
	 * patologiczna — kompetencja obca ścieżce ma w niej wyższy udział niż jej własny
	 * rdzeń. Python: Linux 52,9% > Python 46,4%. PHP: SQL 41% > PHP 20,6%. Engineering
	 * Manager: Java 41,9% ponad sygnałami przywództwa. Pokazanie takiego profilu
	 * uwiarygodnia złą kotwicę autorytetem platformy — uczestnik uczy się nie tego,
	 * czego szuka. `profileNote` to za mało: adnotacja tłumaczy rozjazd, nie usuwa go.
	 *
	 * TO NIE JEST USUNIĘCIE Z KATALOGU RYNKU. `CAREER_PATHS` nadal ma 23 pozycje, bo
	 * etykieta jest kluczem `job_market_data.career_goal` — konto, które JUŻ ma taki
	 * cel (albo wpisze go z ręki, patrz „FURTKA" niżej), musi dalej trafiać w katalog
	 * kompetencji. Ukrywamy WYBÓR, nie dane.
	 */
	availableInPilot?: boolean;
}

/**
 * 23 ścieżki kariery (JustJoinIT, zrzut 2026-02). Kolejność = jak w modelu v5,
 * pogrupowane po rodzinie przy renderze (helper `groupCareerPathsByFamily`).
 */
export const CAREER_PATHS: readonly CareerPath[] = [
	// I — Dane i Sztuczna Inteligencja
	{ careerGoal: "AI Engineer", family: "I — Dane i Sztuczna Inteligencja", targetRole: false },
	{ careerGoal: "Data Scientist", family: "I — Dane i Sztuczna Inteligencja", targetRole: false },
	{ careerGoal: "Data Engineer", family: "I — Dane i Sztuczna Inteligencja", targetRole: false },
	{ careerGoal: "Data Analyst", family: "I — Dane i Sztuczna Inteligencja", targetRole: false },
	// II — Inżynieria Oprogramowania
	{ careerGoal: "Java Developer", family: "II — Inżynieria Oprogramowania", targetRole: false },
	{ careerGoal: ".NET Developer", family: "II — Inżynieria Oprogramowania", targetRole: false },
	{ careerGoal: "Backend Developer", family: "II — Inżynieria Oprogramowania", targetRole: false },
	{
		careerGoal: "Python Developer",
		family: "II — Inżynieria Oprogramowania",
		targetRole: false,
		// Kotwica patologiczna: Linux 52,9% > Python 46,4%. Ukryta na czas pilotażu.
		availableInPilot: false,
		profileNote:
			"Profil szeroki — łapie też oferty platformowe i DevOps (Linux, Docker, Kubernetes). Python zostaje rdzeniem ścieżki.",
	},
	{ careerGoal: "Frontend Developer", family: "II — Inżynieria Oprogramowania", targetRole: false },
	{
		careerGoal: "Full-Stack Developer",
		family: "II — Inżynieria Oprogramowania",
		targetRole: false,
	},
	{ careerGoal: "Android Developer", family: "II — Inżynieria Oprogramowania", targetRole: false },
	{
		careerGoal: "PHP Developer",
		family: "II — Inżynieria Oprogramowania",
		targetRole: false,
		// Kotwica patologiczna: SQL 41% > PHP 20,6%. Ukryta na czas pilotażu.
		availableInPilot: false,
		profileNote:
			"Rdzeń ścieżki to PHP, Symfony i Laravel — mimo że ogólny SQL ma w ofertach wyższy udział.",
	},
	{
		careerGoal: "Embedded / C++ Developer",
		family: "II — Inżynieria Oprogramowania",
		targetRole: false,
	},
	// III — Infrastruktura, Chmura i Bezpieczeństwo
	{
		careerGoal: "DevOps Engineer",
		family: "III — Infrastruktura, Chmura i Bezpieczeństwo",
		targetRole: false,
	},
	{
		careerGoal: "Cybersecurity Specialist",
		family: "III — Infrastruktura, Chmura i Bezpieczeństwo",
		targetRole: false,
	},
	// IV — Jakość, Testy i Architektura
	{ careerGoal: "QA Engineer", family: "IV — Jakość, Testy i Architektura", targetRole: false },
	{
		careerGoal: "Solution Architect",
		family: "IV — Jakość, Testy i Architektura",
		targetRole: true,
		profileNote:
			"Dane wstępne — mała próbka (81 ofert). Część konkretów architekta jest poniżej progu statystycznego.",
	},
	{
		careerGoal: "Engineering Manager",
		family: "IV — Jakość, Testy i Architektura",
		targetRole: true,
		// Kotwica patologiczna: Java 41,9% ponad sygnałami przywództwa. Ukryta na czas pilotażu.
		availableInPilot: false,
		profileNote:
			"Profil oddaje techniczne tło z ogłoszeń. Sygnały przywódcze są w surowych danych słabo widoczne.",
	},
	// V — Zarządzanie, Produkt i Systemy Biznesowe
	{
		careerGoal: "Business Analyst",
		family: "V — Zarządzanie, Produkt i Systemy Biznesowe",
		targetRole: false,
	},
	{
		careerGoal: "Project Manager",
		family: "V — Zarządzanie, Produkt i Systemy Biznesowe",
		targetRole: false,
	},
	{
		careerGoal: "Product Owner / Manager",
		family: "V — Zarządzanie, Produkt i Systemy Biznesowe",
		targetRole: false,
	},
	{
		careerGoal: "UX/UI Designer",
		family: "V — Zarządzanie, Produkt i Systemy Biznesowe",
		targetRole: false,
		profileNote: "Dane wstępne — profil wciąż w opracowaniu (pełna kuracja w przygotowaniu).",
	},
	{
		careerGoal: "Salesforce Developer",
		family: "V — Zarządzanie, Produkt i Systemy Biznesowe",
		targetRole: false,
	},
] as const;

/** Kolejność rodzin przy renderze pełnej listy (D1). */
export const CAREER_FAMILIES: readonly CareerFamily[] = [
	"I — Dane i Sztuczna Inteligencja",
	"II — Inżynieria Oprogramowania",
	"III — Infrastruktura, Chmura i Bezpieczeństwo",
	"IV — Jakość, Testy i Architektura",
	"V — Zarządzanie, Produkt i Systemy Biznesowe",
];

/** Zbiór etykiet realnych ścieżek — szybkie sprawdzenie „czy careerGoal jest realny". */
const REAL_GOALS = new Set(CAREER_PATHS.map((p) => p.careerGoal));

/**
 * Czy etykieta to jedna z 23 realnych ścieżek (klucz katalogu rynku).
 * Używane do walidacji celu z Pomocnika (wolny tekst LLM) zanim odpytamy katalog.
 *
 * ⚠ UWAGA — TA BRAMKA CELOWO NIE ZNA UKRYCIA PILOTAŻOWEGO (`availableInPilot`).
 * Pyta „czy mamy dla tego celu dane rynku", nie „czy wolno go wybrać". Zwraca
 * więc `true` dla „Python Developer" i pozostałych dwóch ukrytych. Tak ma być:
 * konto, które ma taki cel zapisany, musi dalej dostawać katalog kompetencji,
 * inaczej ukrycie zamieniłoby się w zepsucie profilu.
 *
 * ⚠ FURTKA, KTÓREJ UKRYCIE NIE ZAMYKA (znana, nienaprawiona, NIE UDAWAJ, że jej nie ma):
 * profil ma pole „Inne (wpisz)". Wpisanie z ręki „python developer" przechodzi
 * przez `matchCareerGoal` (normalizacja wielkości liter) na kanoniczne „Python
 * Developer" i dalej przez tę bramkę — uczestnik dostaje dokładnie ten profil,
 * który ukrywamy. Domknięcie leży POZA warstwą interfejsu: trzeba rozstrzygnąć,
 * czy `matchCareerGoal` ma odsiewać ukryte (kontrakt dzielony z Pomocnikiem,
 * `groundCareerPaths`), czy odrzucać je dopiero zapis profilu po stronie serwera.
 * Właściciel decyzji: Ethan (CTO) — kontrakt funkcji + trasa zapisu, nie front.
 */
export function isRealCareerGoal(label: string): boolean {
	return REAL_GOALS.has(label.trim());
}

// ────────────────────────────────────────────────────────────────────────────
// PILOTAŻ — JEDYNY NOŚNIK REGUŁY UKRYCIA (CLAUDE.md v1.17, reguła (1)).
//
// Warunek `availableInPilot !== false` pada w kodzie produkcyjnym DOKŁADNIE RAZ:
// w `selectableCareerPaths()` niżej. Wszystko inne — picker onboardingu, wybór
// w profilu, filtr kierunku w katalogu projektów, odsiew propozycji Pomocnika —
// WOŁA tę funkcję, nie POWTARZA warunku. Powtórzenie oznaczałoby, że dołożenie
// czwartej ukrytej ścieżki wymaga trafienia w cztery miejsca, a pominięcie
// jednego z nich nie zapala nic — dokładnie ta rodzina awarii, przez którą
// jedna reguła w dwóch kopiach dała cztery wady w jednej funkcji (1E.7).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Ścieżki, które wolno POKAZAĆ uczestnikowi do wyboru (pilotaż: 20 z 23).
 * Jedyne miejsce, w którym reguła ukrycia jest zapisana.
 */
export function selectableCareerPaths(): CareerPath[] {
	return CAREER_PATHS.filter((p) => p.availableInPilot !== false);
}

/**
 * Zbiór ścieżek WEJŚCIOWYCH — wybieralne (`selectableCareerPaths`) MINUS role
 * docelowe. Buduje się z funkcji wyżej, a nie z osobnego filtra po `CAREER_PATHS`,
 * właśnie po to, żeby reguła ukrycia miała jeden nośnik: gdyby ten zbiór filtrował
 * sam, Pomocnik proponowałby Pythona i PHP mimo ukrycia ich w pickerze.
 */
const ENTRY_GOALS = new Set(entryCareerPaths().map((p) => p.careerGoal));

/**
 * Czy etykieta to jedna z 21 ścieżek WEJŚCIOWYCH (D1: Pomocnik nie proponuje ról
 * docelowych Solution Architect/Engineering Manager — są tylko do przejrzenia w pickerze).
 */
export function isEntryCareerGoal(label: string): boolean {
	return ENTRY_GOALS.has(label.trim());
}

/**
 * Klucz porównawczy etykiety celu — domyka drobne rozjazdy, których model bywa
 * autorem mimo instrukcji „kopiuj słowo w słowo": casing, diakrytyki, podwójne
 * spacje, ogon interpunkcji. NIE jest fuzzy — to ścisła normalizacja, nie podobieństwo.
 */
export function normalizeGoalKey(s: string): string {
	return s
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim()
		.replace(/[.,;:!?]+$/u, "")
		.trim();
}

/**
 * Ręczne aliasy dla etykiet, których Opus uparcie nie kopiuje verbatim
 * (np. polskie tłumaczenia mimo instrukcji). Klucz = `normalizeGoalKey(alias)`,
 * wartość = kanoniczny `careerGoal` z `CAREER_PATHS`. Pusty na start — jawny
 * zawór, gdyby ruch produkcyjny pokazał konkretne, powtarzalne przekłamania.
 * Świadomie BEZ fuzzy/Levenshteina (ryzyko błędnego dopasowania > zysk).
 */
const ALIAS_OVERRIDES: Record<string, string> = {};

/** Mapa znormalizowany_klucz → kanoniczny careerGoal (z 23 + aliasy). */
const NORM_TO_CANONICAL: Map<string, string> = (() => {
	const m = new Map<string, string>();
	for (const p of CAREER_PATHS) m.set(normalizeGoalKey(p.careerGoal), p.careerGoal);
	for (const [alias, canonical] of Object.entries(ALIAS_OVERRIDES)) {
		if (REAL_GOALS.has(canonical)) m.set(normalizeGoalKey(alias), canonical);
	}
	return m;
})();

/**
 * Mapuje dowolną etykietę (np. label z LLM) na kanoniczny `careerGoal` z 23.
 * Kolejność: exact (po trim) → po znormalizowanym kluczu (casing/diakrytyki) →
 * alias. Brak trafienia → `null` (wpis do odsiania). Bez dopasowania przybliżonego.
 */
export function matchCareerGoal(label: string): string | null {
	const trimmed = label.trim();
	if (REAL_GOALS.has(trimmed)) return trimmed;
	return NORM_TO_CANONICAL.get(normalizeGoalKey(trimmed)) ?? null;
}

/**
 * Ścieżki wejściowe (19 w pilotażu) — to, co Pomocnik może proponować aktywnie (D1).
 * Liczy się od WYBIERALNYCH, nie od wszystkich: ścieżka ukryta w pickerze, a
 * proponowana przez Pomocnika, byłaby ukryciem tylko z nazwy.
 */
export function entryCareerPaths(): CareerPath[] {
	return selectableCareerPaths().filter((p) => !p.targetRole);
}

/**
 * Lista WYBIERALNYCH ścieżek (20 w pilotażu) pogrupowana po rodzinie e-CF
 * (D1 — przegląd przez studenta). Grupowanie stoi na `selectableCareerPaths()`,
 * więc picker onboardingu nie musi znać reguły ukrycia i nie da się jej tam pominąć.
 * Rodzina bez ani jednej wybieralnej ścieżki zniknęłaby jako pusty nagłówek —
 * dziś nie zachodzi (najmniejsza rodzina ma 2 wybieralne), pilnuje tego strażnik.
 */
export function groupCareerPathsByFamily(): { family: CareerFamily; paths: CareerPath[] }[] {
	const wybieralne = selectableCareerPaths();
	return CAREER_FAMILIES.map((family) => ({
		family,
		paths: wybieralne.filter((p) => p.family === family),
	}));
}
