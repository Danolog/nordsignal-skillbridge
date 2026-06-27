// ============================================================================
// KONFIGURACJA KOTWIC v2 — model „przypisanie do najbliższego profilu kompetencji"
//
// Model #11 (decyzja z analizy Darka). Oferty grupujemy wg PROFILU KOMPETENCJI:
//   1. Normalizacja tytułu `Stanowisko` (usuń seniority/nawiasy, ujednolić).
//   2. Kotwice = top-30 znormalizowanych tytułów wg liczby ofert + 2 kotwice RĘCZNE
//      (UX/UI, Cybersecurity) źródłowane po `Kategoria` JustJoinIT — patrz niżej.
//   3. Profil kotwicy = jej top-12 kompetencji.
//   4. Przypisanie: oferta → kotwica o największym pokryciu profilu, tie-break niżej.
//   5. Scalenia (ANCHOR_MERGES): kilka kotwic technicznych → jedna ścieżka produktowa.
//
// KURACJA SOPHII v2 (scratchpad/sophia-anchors-v2.md): nazwy, scalenia 30→19,
// grupy (8 rodzin), degradacja ról seniorskich, 2 kotwice ręczne. Ten plik =
// MECHANICZNE przełożenie tamtej kuracji na konfigurację — silnik ją czyta,
// nie wymyśla. Podmiana tu + rerun narzędzia = nowy artefakt (silnik bez zmian).
// ============================================================================

/** Ile znormalizowanych tytułów bierzemy jako kotwice automatyczne (top-N). */
export const ANCHOR_COUNT = 30;

/** Rozmiar profilu kompetencji kotwicy (top-K technologii wśród jej ofert). */
export const PROFILE_SIZE = 12;

// ── Bramka liftowa (Ethan, Tor 1 — zastępuje martwe progi udziału) ───────────
// Zastępuje dawne THRESHOLD_PCT/ABS/TOP_N (były zdefiniowane, ale NIEUŻYWANE przez
// silnik — flatten ciął tylko „udział < 1% precz"). Nowa miara: kompetencja zostaje
// w PŁASKIM katalogu (job-market-justjoinit.json → onboarding) tylko gdy jest ISTOTNIE
// częstsza w roli niż na całym rynku (lift = krotność) ORAZ ma realny wolumen ofert.
// To wpuszcza rzadkie-ale-definiujące narzędzia, które stary próg wycinał (np. SIEM/PAM
// w cyber), i wycina generyki (Python w cyber: lift 0,73 → out). Hierarchia
// career-model.json zachowuje WSZYSTKIE liście z % — bramka dotyczy tylko płaskiego
// katalogu studenta. Progi STARTOWE — ratyfikacja Olivera po teście przed/po (Tor 1).
export const LIFT_MIN = 1.3; // krotność: min ile razy częściej w roli niż średnia rynku
export const COUNT_MIN_ABS = 5; // bezwzględna podłoga liczby ofert (anty-szum: Kali n=2 precz)
export const COUNT_MIN_PCT = 1.5; // względna podłoga: % ofert ścieżki (skaluje do dużych ścieżek)

/** Próg liczby ofert dla ścieżki o danym wolumenie: max(bezwzględny, względny %). */
export function countMinFor(pathOffers: number): number {
	return Math.max(COUNT_MIN_ABS, Math.ceil((COUNT_MIN_PCT / 100) * pathOffers));
}

// ── Klasyfikacja konkretu: tool | cert | meta | soft (Ethan, Tor 1) ──────────
// Po co: (a) META-TAGI to etykiety-kategorie, NIE kompetencje do nauki — twarda blokada
// (inaczej ranking po lifcie wstawia „Cybersecurity" jako kompetencję #1); (b) CERTYFIKATY
// to cele certyfikacyjne (osobny kubełek `kind:"cert"`), nie narzędzie; (c) SOFT to
// umiejętności miękkie/procesowe. Listy świadomie wąskie i jawne (HITL, Built-to-Sell) —
// rozszerza je kuracja Sophii, nie model.
export type LeafKind = "tool" | "cert" | "meta" | "soft";

/** Etykiety-kategorie udające technologię — NIE są kompetencją do nauki (twarda blokada). */
export const META_TAGS = new Set<string>([
	"cybersecurity",
	"it security",
	"security",
	"information security",
	"devops",
	"test automation",
]);

/** Certyfikaty/ramy certyfikacyjne — cel certyfikacyjny, osobny kubełek (nie „technologia"). */
export const CERTS = new Set<string>([
	"cissp",
	"cism",
	"cisa",
	"iso 27001",
	"grc",
	"istqb",
	"prince2",
	"pmp",
	"pmi",
	"ipma",
	"cbap",
]);

/** Prefiksy wariantów certyfikatów w danych (np. „ISTQB Foundation", „ISO 27001 - ..."). */
const CERT_PREFIXES = ["istqb", "iso 27001", "iso27001", "prince2"];

/** Umiejętności miękkie/procesowe — osobny kubełek (nie narzędzie do projektu). */
export const SOFT_SKILLS = new Set<string>([
	"risk management",
	"risk assessment",
	"documentation",
	"analytical thinking",
	"communication",
	"problem solving",
	"teamwork",
	"training",
	"business requirements",
]);

/**
 * Klasyfikuje konkret po nazwie (bez rozróżniania wielkości liter). Kolejność:
 * meta → cert → soft → tool. Używane w silniku (flatten: twarda blokada meta) i w
 * generatorze kandydatów dla Sophii (oznaczenie kind przy każdej kompetencji).
 */
export function classifyLeafKind(name: string): LeafKind {
	const n = name.trim().toLowerCase();
	if (META_TAGS.has(n)) return "meta";
	if (CERTS.has(n) || CERT_PREFIXES.some((p) => n.startsWith(p))) return "cert";
	if (SOFT_SKILLS.has(n)) return "soft";
	return "tool";
}

// ── Warianty nazw → forma kanoniczna (Ethan, Tor 1) ──────────────────────────
// W danych ta sama kompetencja bywa kilkoma napisami → ręczny liść łapie tylko jeden
// (zaniżony %). Przykłady z analizy: „Burp Suite" istnieje jako 3 napisy (łapaliśmy 1),
// „Active Directory" + „Active Directory (AD)", a liść „OAuth2" łapał ZERO (w danych
// małe „oauth"). Mapa kanoniczna → warianty. Generator kandydatów scala je, żeby Sophia
// dostała poprawny wolumen i wiedziała, jakie `countAs` wpisać przy kuracji liścia.
export const TECH_VARIANTS: Record<string, string[]> = {
	"Burp Suite": ["Burp Suite", "BurpSuite", "Burp Suite Pro"],
	"Active Directory": ["Active Directory", "Active Directory (AD)"],
	OAuth2: ["OAuth2", "OAuth", "oauth"],
};

/** Odwrotny indeks: dowolny wariant (lowercase) → forma kanoniczna. */
const VARIANT_TO_CANON = new Map<string, string>(
	Object.entries(TECH_VARIANTS).flatMap(([canon, variants]) =>
		variants.map((v) => [v.toLowerCase(), canon] as const),
	),
);

/** Forma kanoniczna technologii (scala warianty); brak w mapie → nazwa bez zmian. */
export function canonicalizeTech(name: string): string {
	return VARIANT_TO_CANON.get(name.trim().toLowerCase()) ?? name;
}

/** Wszystkie napisy-warianty dla danej (kanonicznej) nazwy — do sumowania w danych. */
export function variantsOf(canonical: string): string[] {
	return TECH_VARIANTS[canonical] ?? [canonical];
}

/**
 * PLACEHOLDER kotwic automatycznych — pusty = narzędzie liczy top-30
 * znormalizowanych tytułów z danych. Niepusty = użyj dokładnie tej listy.
 * Sophia zostawiła automatyczny top-30 (jej §1/§2 operują na nim); kuracja
 * dzieje się przez SCALENIA + RĘCZNE kotwice + degradację, nie przez podmianę
 * listy. Zostawiamy pusty (top-30 z danych) zgodnie z kuracją.
 */
export const ANCHOR_TITLES_PLACEHOLDER: string[] = [];

/**
 * Kotwice RĘCZNE spoza automatycznego top-30 (Sophia §6, decyzja: dodać).
 * UX/UI Designer i Cybersecurity Specialist mają rozproszone tytuły (nie weszły
 * do top-30), ale to realne, ważne segmenty. Ich oferty źródłujemy po `Kategoria`
 * JustJoinIT (a NIE po znormalizowanym tytule). Profil top-12 liczony z tych ofert;
 * w przypisaniu są pełnoprawnymi kotwicami (jak automatyczne).
 * Klucz = znormalizowany identyfikator kotwicy; `category` = wartość `Kategoria` w CSV.
 */
export const MANUAL_ANCHORS: Array<{ key: string; category: string }> = [
	{ key: "ux/ui designer", category: "Ux" },
	{ key: "cybersecurity specialist", category: "Security" },
];

/**
 * Scalenia kotwic (Sophia §2): znormalizowany tytuł → nadrzędna ścieżka. Oferty
 * obu trafiają do jednej ścieżki, profil liczony łącznie. „Ten sam zawód +
 * nakładający się profil" (sprawdzone na danych przez Sophię).
 */
export const ANCHOR_MERGES: Record<string, string> = {
	// Full-Stack: developer + engineer (identyczny profil React/Java/JS/TS).
	"full-stack engineer": "full-stack developer",
	// Backend: developer + engineer (polyglot Python/Node/AWS/TS/PostgreSQL).
	"backend engineer": "backend developer",
	// QA: trzy kotwice (automation to specjalizacja, nie osobny zawód).
	"qa automation engineer": "qa engineer",
	"test automation engineer": "qa engineer",
	// Analiza biznesowo-systemowa: trzy warianty jednej rodziny.
	"it analyst": "business analyst",
	"system analyst": "business analyst",
	// Produkt: PO/PM różnica metodologiczna, nie kompetencyjna.
	"product manager": "product owner",
	// Data Architect → Data Engineer (ten sam profil danych, poziom seniorski).
	"data architect": "data engineer",
	// Cloud Engineer → DevOps (niemal identyczny profil chmurowo-infra).
	// (Cloud engineer zwykle poza top-30 — wtedy ta reguła jest no-op.)
	"cloud engineer": "devops engineer",
	// DODANE przez Maxa (poza listą Sophii — uzasadnienie w prowenicji §7):
	// „machine learning engineer" wszedł do top-30 (czego snapshot Sophii nie miał),
	// a Sophia nie podała dla niego reguły. Profil Python+ML+AI+PyTorch pokrywa się
	// z AI Engineer (jej ścieżka AI/ML). Bez scalenia ML Engineer staje się magnesem
	// (szeroki profil). Scalam do ai engineer — spójne z rodziną „Dane i AI".
	"machine learning engineer": "ai engineer",
};

// v4.0 (dyrektywa 3 Darka): KONIEC ramki junior/senior — WSZYSTKIE ścieżki są
// widoczne dla studenta (zniknęło `studentSelectable:false`). Solution Architect
// i Engineering Manager wracają jako widoczne; „Software Engineer" → „Embedded /
// C++ Developer". Dlatego brak już zbioru ścieżek ukrytych.

/**
 * Kotwice GENERYCZNE/SZEROKIE deprytetyzowane WYŁĄCZNIE w tie-breaku przypisania
 * (anty-„magnes") — to NIE jest ukrycie z wyboru studenta (te ścieżki są widoczne).
 * Powód: ich szeroki/generyczny profil przy równym pokryciu przejmowałby oferty
 * węższych ścieżek (pomiar: bez tej reguły Engineering Manager łapał 816 ofert
 * zamiast ~124). Przy remisie pokrycia kotwica spoza tego zbioru wygrywa.
 * Klucze = znormalizowane identyfikatory kotwic (po scaleniu).
 */
export const TIE_BREAK_DEPRIORITIZED = new Set<string>([
	"software engineer", // → wyświetlane jako „Embedded / C++ Developer"
	"solution architect",
	"engineering manager",
]);

/**
 * Ładne nazwy wyświetlane (Sophia §1). Brak wpisu → Title Case ze znormalizowanego
 * tytułu (z poprawką na łączniki). Reguła Sophii: `.net`→`.NET`, `ai`→`AI`,
 * `qa`→`QA`, `it`→`IT`, `php`→`PHP`, `full-stack`→`Full-Stack`.
 */
export const ANCHOR_DISPLAY_NAMES: Record<string, string> = {
	"full-stack developer": "Full-Stack Developer",
	"backend developer": "Backend Developer",
	"java developer": "Java Developer",
	".net developer": ".NET Developer",
	"python developer": "Python Developer",
	"php developer": "PHP Developer",
	"frontend developer": "Frontend Developer",
	"data engineer": "Data Engineer",
	"data analyst": "Data Analyst",
	"data scientist": "Data Scientist",
	"ai engineer": "AI Engineer",
	"devops engineer": "DevOps Engineer",
	"qa engineer": "QA Engineer",
	"business analyst": "Business Analyst",
	"project manager": "Project Manager",
	// PO/PM scalone — label łączony (Sophia §2 #16: „student rozumie obie nazwy").
	"product owner": "Product Owner / Manager",
	"android developer": "Android Developer",
	"salesforce developer": "Salesforce Developer",
	// v4.0 dyrektywa 3: „software engineer" przemianowane (realny profil C++ 74%).
	"software engineer": "Embedded / C++ Developer",
	"solution architect": "Solution Architect",
	"engineering manager": "Engineering Manager",
	// Kotwice ręczne:
	"ux/ui designer": "UX/UI Designer",
	"cybersecurity specialist": "Cybersecurity Specialist",
};

/**
 * Rodzina/grupa ścieżki (Sophia §3 — 8 rodzin, kafelki onboardingu). Kolumna
 * `category` w job_market_data. Klucz = ŁADNA nazwa wyświetlana (po scaleniu).
 * Brak wpisu → "IT" (domyślny — cały zbiór to IT).
 */
export const ANCHOR_CATEGORY: Record<string, string> = {
	// Dane i AI
	"Data Engineer": "Dane i AI",
	"Data Analyst": "Dane i AI",
	"Data Scientist": "Dane i AI",
	"AI Engineer": "Dane i AI",
	// Programowanie — backend
	"Java Developer": "Programowanie — backend",
	".NET Developer": "Programowanie — backend",
	"Python Developer": "Programowanie — backend",
	"Backend Developer": "Programowanie — backend",
	"PHP Developer": "Programowanie — backend",
	// Programowanie — frontend i full-stack
	"Frontend Developer": "Programowanie — frontend i full-stack",
	"Full-Stack Developer": "Programowanie — frontend i full-stack",
	// Programowanie — mobilne
	"Android Developer": "Programowanie — mobilne",
	// Chmura i niezawodność (DevOps)
	"DevOps Engineer": "Chmura i niezawodność (DevOps)",
	// Jakość (QA)
	"QA Engineer": "Jakość (QA)",
	// Analiza i produkt
	"Business Analyst": "Analiza i produkt",
	"Product Owner / Manager": "Analiza i produkt",
	"Project Manager": "Analiza i produkt",
	// Ekosystemy korporacyjne
	"Salesforce Developer": "Ekosystemy korporacyjne",
	"Embedded / C++ Developer": "Programowanie — backend",
	// Kotwice ręczne — własne rodziny (Sophia: UX jedyna projektancka; Security osobny segment)
	"UX/UI Designer": "Design",
	"Cybersecurity Specialist": "Bezpieczeństwo",
	// Wracają jako widoczne (dyrektywa 3) — rodzina Architektura/Zarządzanie
	"Solution Architect": "Architektura",
	"Engineering Manager": "Zarządzanie",
};

/**
 * Migracja demo-studentów: stare cele kariery (z 9-wierszowego demo) → finalne
 * nazwy ścieżek v2. Sophia §6: Backend/Full-stack mają teraz realne kotwice
 * (mapują się 1:1); Cybersecurity Analyst → Cybersecurity Specialist (kotwica
 * ręczna); UX/UI Designer → UX/UI Designer (kotwica ręczna). Reszta bez zmian.
 * Test seed-data pilnuje: każdy cel musi istnieć jako ścieżka w artefakcie.
 */
export const DEMO_CAREER_GOAL_REMAP: Record<string, string> = {
	"Backend Developer": "Backend Developer",
	"Full-stack Developer": "Full-Stack Developer",
	"Cybersecurity Analyst": "Cybersecurity Specialist",
	"UX/UI Designer": "UX/UI Designer",
};
