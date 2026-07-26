// ============================================================================
// 1.1 — System feature flags (typowany rejestr + zmienne środowiskowe).
//
// Zasada „deploy ≠ release": kod funkcji może być wdrożony, ale domyślnie
// WYŁĄCZONY. Flaga włącza się JAWNIE zmienną środowiskową per środowisko
// (Vercel / .env.local). Każda flaga domyślnie = false → „flaga off = zero zmian".
//
// Ewaluacja PO STRONIE SERWERA (API routes, server components). Zmienne flag NIE
// są prefiksowane `NEXT_PUBLIC_`, więc nie trafiają do bundla klienta. Jeśli flaga
// ma sterować UI, server component czyta ją i przekazuje propsem — nie eksponujemy
// całego rejestru na klient.
//
// Nowa flaga = nowy wpis w FLAGS (jedyne źródło prawdy). Konwencja nazwy env:
// FLAG_<SCREAMING_SNAKE>. Wpisz też do `.env.example`.
// ============================================================================

type FlagDefinition = {
	/** Zmienna środowiskowa sterująca flagą (konwencja: FLAG_<SCREAMING_SNAKE>). */
	readonly envVar: string;
	/** Po co jest ta flaga — widoczne w kodzie i w przeglądzie PR. */
	readonly description: string;
	/**
	 * Wartość domyślna, gdy env nieustawiony. MUSI być `false` — żadna funkcja nie
	 * wchodzi domyślnie włączona (deploy ≠ release). Typ literalny egzekwuje regułę.
	 */
	readonly defaultValue: false;
};

/**
 * Rejestr flag — jedyne źródło prawdy. Wpisy odpowiadają zadaniom z roadmapy v2;
 * wszystkie startują wyłączone i zapala je dopiero env danego środowiska.
 */
export const FLAGS = {
	proactiveMarketRefresh: {
		envVar: "FLAG_PROACTIVE_MARKET_REFRESH",
		description: "Blok AG: cykliczne odświeżanie rynku + recompute luk (strona operacyjna Darka).",
		defaultValue: false,
	},
	marketGapNotifications: {
		envVar: "FLAG_MARKET_GAP_NOTIFICATIONS",
		description:
			"AG.6: powiadomienia studenta „nowa luka — rynek zaczął wymagać X” (strona studencka; " +
			"niezależna od proactiveMarketRefresh — release UI nie jest sprzężony z potokiem rynku).",
		defaultValue: false,
	},
	advisorMemory: {
		envVar: "FLAG_ADVISOR_MEMORY",
		description: "AG.7: pamięć doradcy między sesjami (kontekst studenta budowany z DB).",
		defaultValue: false,
	},
	humanReviewQueue: {
		envVar: "FLAG_HUMAN_REVIEW_QUEUE",
		description: "Blok B8 (1.2–1.6): kolejka recenzji człowieka i akcje approve/reject.",
		defaultValue: false,
	},
	sandboxRunner: {
		envVar: "FLAG_SANDBOX_RUNNER",
		description:
			"Blok B6 (1.8–1.9, ADR-012): bieg ukrytych test-suites w Vercel Sandbox (runOk w potoku).",
		defaultValue: false,
	},
	diagnosticAssessment: {
		envVar: "FLAG_DIAGNOSTIC_ASSESSMENT",
		description:
			"A5/1.11–1.12: test adaptacyjny (diagnoza zamiast samooceny) — trasy /api/assessment/* " +
			"i ścieżka onboardingu bez sylabusa. Off = onboarding jak dziś (samoocena).",
		defaultValue: false,
	},
	socraticTutor: {
		envVar: "FLAG_SOCRATIC_TUTOR",
		description:
			"C11/1.13–1.14: tutor sokratyczny w widoku projektu (naprowadza, nie podaje rozwiązań) — " +
			"trasy /api/projects/[id]/tutor. Off = trasa nie istnieje (404).",
		defaultValue: false,
	},
	vivaDefense: {
		envVar: "FLAG_VIVA_DEFENSE",
		description:
			"B7/1.16 (ADR-013): obrona ustna AI bramkująca status 'verified' — krok 6-prep w potoku " +
			"(generacja pytań) + trasy /api/submissions/[id]/viva/*. Off = potok i statusy jak dotąd.",
		defaultValue: false,
	},
	placementTracking: {
		envVar: "FLAG_PLACEMENT_TRACKING",
		description:
			"1.17: instrumentacja placement rate — zgoda RODO (onboarding+profil), baseline statusu " +
			"zawodowego i deklarowane zdarzenia (staż/praca). Off = feature nie istnieje (trasy 404, " +
			"UI się nie renderuje).",
		defaultValue: false,
	},
	studyRhythm: {
		envVar: "FLAG_STUDY_RHYTHM",
		description:
			"1.18 (C13): rytm nauki — deklaracja godzin/tydzień + dni, streak z realnych śladów, " +
			"check-iny tygodniowe (opcjonalne), alert zastoju in-app (leniwy, bez cronów). " +
			"Off = feature nie istnieje (trasy 404, UI się nie renderuje).",
		defaultValue: false,
	},
	careerModelFromDb: {
		envVar: "FLAG_CAREER_MODEL_FROM_DB",
		description:
			"1.0: model kariery czytany z career_model_versions (DB) zamiast statycznego JSON w repo.",
		defaultValue: false,
	},
	curriculumPath: {
		envVar: "FLAG_CURRICULUM_PATH",
		description:
			"1E (ADR-014): ścieżka curriculum — drabina modułów z prerekwizytami blokującymi " +
			"(pilotaż DS). Off = feature nie istnieje (trasy 404, UI się nie renderuje, " +
			"streak bez źródła curriculum — marketplace bez zmian).",
		defaultValue: false,
	},
	passportVerifiedOnly: {
		envVar: "FLAG_PASSPORT_VERIFIED_ONLY",
		description:
			"Blok C planu napraw (decyzja D1): paszport pokazuje WYŁĄCZNIE kompetencje " +
			"zweryfikowane projektami (verified_competencies) + pokrycie ważone popytem (D3); " +
			"sekcja „W trakcie nauki” znika z dokumentu. Bramkuje TYLKO odczyt — zapisy " +
			"reconcile idą na ciemno od merge'a C2. Off = paszport z deklaracji, jak dziś.",
		defaultValue: false,
	},
	confidenceProbe: {
		envVar: "FLAG_CONFIDENCE_PROBE",
		description:
			"MIS.1 (plan 13): sonda pewności przed odpowiedzią w drabinie curriculum — student " +
			"deklaruje 1–3 (zgaduję/chyba wiem/jestem pewny) przed „Sprawdź”; zapis do " +
			"curriculum_item_answers.confidence (cecha FSRS 1E.4, wsad kalibracji MIS.2). " +
			"Off = UI i API answer jak dotąd, kolumna zostaje NULL.",
		defaultValue: false,
	},
	passportFreshness: {
		envVar: "FLAG_PASSPORT_FRESHNESS",
		description:
			"MIS.3 (plan 13): prywatny panel świeżości i kontekstów kredencjałów w paszporcie " +
			"studenta (MAX(verifiedAt) + COUNT(DISTINCT submissionId) z verified_competencies; " +
			"„ugruntowana” przy ≥2 kontekstach). Sensowna tylko przy passportVerifiedOnly=1. " +
			"PUBLICZNY paszport bez zmian (decyzja Darka 2026-07-21). Off = paszport jak dziś.",
		defaultValue: false,
	},
	masteryGate: {
		envVar: "FLAG_MASTERY_GATE",
		description:
			"1E.3 mastery gate — egzamin modułowy (progresja wewnętrzna, ocena formująca §7). " +
			"Deploy≠release; włączyć świadomie po banku pytań C1 i tutorze 1.13.",
		defaultValue: false,
	},
	spacedRepetition: {
		envVar: "FLAG_SPACED_REPETITION",
		description:
			"1E.4: powtórki rozłożone w czasie (FSRS, biblioteka ts-fsrs) — jednostka powtórki = " +
			"KONCEPT, stan per student × koncept (review_states), append-only ślad ocen (review_logs); " +
			"kolejka „na dziś” per koncept, trasy /api/review/* (przyszłe R4). Off = trasy 404, hook " +
			"enrollment nie odpala, zero wierszy review_states/review_logs. Deploy≠release.",
		defaultValue: false,
	},
	placementDiagnostic: {
		envVar: "FLAG_PLACEMENT_DIAGNOSTIC",
		description:
			"1E.7: placement z diagnozy — wynik diagnozy OTWIERA prefiks drabiny curriculum " +
			"(egzamin nadal ZALICZA, wariant hybrydowy). Zapis pełnego werdyktu per moduł do " +
			"curriculum_placements hookiem po domknięciu diagnozy (best-effort, po transakcji). " +
			"Off = hook nie odpala, zero wierszy curriculum_placements, odpowiedź " +
			"/api/assessment/[id]/complete identyczna jak dziś. ⚠ Zapłon wymaga sprawdzenia, " +
			"że FLAG_MASTERY_GATE=1 na tym samym środowisku — droga alternatywna „test out” to " +
			"warunek nośny A22-2 oceny art. 22 RODO (RoPA wpis #5), nie tylko wybór produktowy.",
		defaultValue: false,
	},
	// gapVerifier (AG.1) USUNIĘTA w AG.2 (2026-07-07): jedyny konsument —
	// LLM-owa gałąź legacy generate-gaps — skasowany; moduł verify-gaps zostaje
	// jako klocek bez flagi (przyszli konsumenci AG.5+ dostaną własne flagi).
	// Env FLAG_GAP_VERIFIER na Vercelu można usunąć (nieszkodliwa, nic jej nie czyta).
} as const satisfies Record<string, FlagDefinition>;

/** Nazwa istniejącej flagi — węższy typ niż string, wymuszony przez rejestr. */
export type FlagName = keyof typeof FLAGS;

/** Truthy: "1" / "true" / "on" (bez wielkości liter, po przycięciu). Reszta → default. */
function parseFlagValue(raw: string | undefined, defaultValue: boolean): boolean {
	if (raw === undefined) return defaultValue;
	const normalized = raw.trim().toLowerCase();
	if (normalized === "1" || normalized === "true" || normalized === "on") return true;
	if (normalized === "0" || normalized === "false" || normalized === "off" || normalized === "") {
		return false;
	}
	// Nieznana wartość (np. literówka w env) → nie zgaduj, wróć do bezpiecznego domyślnego.
	return defaultValue;
}

/**
 * Czy funkcja za flagą jest włączona. Ewaluacja po stronie serwera; domyślnie
 * `false` — zapala jawnie zmienna środowiskowa flagi.
 */
export function isFeatureEnabled(name: FlagName): boolean {
	const flag = FLAGS[name];
	return parseFlagValue(process.env[flag.envVar], flag.defaultValue);
}
