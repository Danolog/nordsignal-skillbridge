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
//
// 1E.7 L4 — SPRZĘŻENIE FLAG (`requires`): flaga może deklarować przesłanki, bez
// których jej zapalenie jest błędem, a nie wyborem. Bramka żyje TUTAJ, w
// `isFeatureEnabled`, bo env na Vercelu przestawia się bez deployu — sprawdzenie
// wykonane raz, w skrypcie wdrożeniowym, nie chroni przed niczym.
// ============================================================================

import { logError } from "@/lib/log";

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
	/**
	 * SPRZĘŻENIE FLAG (1E.7 L4, decyzja Ethana) — flagi, które MUSZĄ być zapalone,
	 * żeby ta flaga w ogóle zadziałała. Egzekwowane w `isFeatureEnabled`, nie
	 * w skrypcie wdrożeniowym: zmienną na Vercelu da się przestawić BEZ deployu,
	 * więc bramka sprawdzana raz przy wdrożeniu nie chroni przed niczym.
	 *
	 * Nazwy sprawdzane typem — patrz `_RequirementsAreFlagNames` niżej (literówka
	 * w `requires` nie skompiluje się, zamiast po cichu nigdy nie być spełniona).
	 */
	readonly requires?: readonly string[];
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
			"/api/assessment/[id]/complete identyczna jak dziś. ⚠ Zapłon WYMAGA FLAG_MASTERY_GATE=1 " +
			"ORAZ FLAG_DIAGNOSTIC_ASSESSMENT=1 na tym samym środowisku — pierwsze, bo droga " +
			"alternatywna „test out” to warunek nośny A22-2 oceny art. 22 RODO (RoPA wpis #5); " +
			"drugie, bo bez diagnozy drabina obiecuje studentowi pomiar, którego produkt nie " +
			"zawiera. Oba wymogi są EGZEKWOWANE (`requires` niżej), nie tylko opisane.",
		defaultValue: false,
		// TWARDA BRAMKA SPRZĘŻENIA (decyzja Ethana, 1E.7 L4). Placement OTWIERA moduły,
		// egzamin ZALICZA — przy zgaszonym `masteryGate` student wrzucony placementem
		// w głąb drabiny NIE MA drogi „test out", czyli tej samej taniej naprawy błędu
		// w dół, na której stoi cała analiza asymetrii kosztu Sophii (DECYZJA 2) ORAZ
		// ocena art. 22 RODO Ryana (A22-2: „istnieje alternatywna droga bez skutku
		// automatycznego"). Zapalenie placementu przy zgaszonym egzaminie nie jest więc
		// „gorszym UX" — WYWRACA PODSTAWĘ PRAWNĄ przetwarzania. Dlatego bramka jest
		// w kodzie ewaluacji flagi, a nie w runbooku wdrożenia.
		//
		// DRUGI CZŁON (N3, rozpoznanie Sophii — scratchpad/lejek-diagnozy-sophia.md
		// §4.3 WADA 3): `diagnosticAssessment`. Ta flaga wybiera brzmienie wstępu na
		// `/curriculum` i na kafelku pulpitu — przy zapalonej mówi studentowi
		// „…albo od razu, jeśli DIAGNOZA pokazała, że znasz wcześniejszy materiał".
		// Przy zgaszonej diagnozie tego mechanizmu w produkcie NIE MA: trasy
		// /api/assessment/* odpowiadają 404, więc placement nie ma z czego powstać,
		// a zdanie jest nieprawdziwe W CHWILI WYPOWIADANIA. Ten sam argument, co
		// przy sprzężeniu klauzuli art. 13 z usuwaniem konta niżej: obietnica
		// mechanizmu, którego nie umiemy wykonać, jest gorsza niż jego brak.
		//
		// Zmierzone wykonaniem, nie wyczytane z kodu (2026-08-13): przy
		// FLAG_MASTERY_GATE=1, FLAG_PLACEMENT_DIAGNOSTIC=1, FLAG_DIAGNOSTIC_ASSESSMENT=0
		// `isFeatureEnabled("placementDiagnostic")` zwracało `true`, kafelek pulpitu
		// renderował zdanie o diagnozie, a POST /api/assessment/start w tej samej
		// konfiguracji odpowiadał 404. Strażnik: tests/unit/ds/obietnica-diagnozy-
		// -sprzezenie.contract.test.tsx (kontrakt „obietnica ⟹ diagnoza istnieje").
		//
		// SKUTEK ZAPALENIA/ZGASZENIA (dla runbooku wdrożenia): zgaszenie
		// FLAG_DIAGNOSTIC_ASSESSMENT gasi teraz TAKŻE placement — istniejące wiersze
		// `curriculum_placements` przestają otwierać moduły (drabina czyta flagę).
		// To jest zamierzone: konfiguracja „diagnoza wyłączona, placement włączony"
		// jest błędem, nie wyborem. Kolejność zapłonu: diagnoza + egzamin, potem
		// placement; kolejność gaszenia odwrotna.
		requires: ["masteryGate", "diagnosticAssessment"],
	},
	accountDeletion: {
		envVar: "FLAG_ACCOUNT_DELETION",
		description:
			"E1b (RODO art. 17): ścieżka usunięcia konta przez studenta — włączona ścieżka " +
			"biblioteki uwierzytelniającej (`user.deleteUser`) z zaczepami before/after, " +
			"śladem audytowym wzorca A7 i usunięciem natychmiastowym bez karencji (D-U3). " +
			"Off = trasa `/api/auth/delete-user` odpowiada 404, konto bez zmian. " +
			"⚠ ZAPŁON NA PRODUKCJI MA WŁASNY RUNBOOK Z LISTĄ BRAMEK — jeden nośnik: " +
			"`docs/runbooks/zaplon-flagi-usuwania-konta.md` (właściciel: Ethan). Ta flaga " +
			"NIE JEST przełącznikiem „gotowe/niegotowe”: zielony S-U-1 to dopiero bramka 1 " +
			"z ośmiu. Otwarte są m.in. porównanie katalogu produkcji z migracjami, kopie " +
			"zapasowe, sign-off Ryana i ekran w interfejsie. Nie zapalaj bez przejścia listy.",
		defaultValue: false,
	},
	privacyNoticeArt13: {
		envVar: "FLAG_PRIVACY_NOTICE_ART13",
		description:
			"E4: klauzula informacyjna art. 13 RODO w interfejsie — strona /prywatnosc renderuje " +
			"CZĘŚĆ I dokumentu docs/legal/klauzula-informacyjna-art13.md + odnośnik ze ścieżki " +
			"rejestracji. Off = trasa nie istnieje (404), odnośnik się nie renderuje. " +
			"⚠ ZAPŁON NIE JEST DECYZJĄ TECHNICZNĄ: dokument ma PIĘĆ twardych warunków wejścia " +
			"w życie (sekcja Z-2 — cała tabela, nie wybrane wiersze), z których W-4 i W-5 leżą " +
			"poza kodem. Zapalenie tej flagi przed nimi publikuje obietnice praw, których nie " +
			"umiemy wykonać — a to jest gorsze niż brak klauzuli (zasada porządkująca cały " +
			"pakiet RODO). W-1 (sprzężenie z usuwaniem konta) jest od 2026-08-13 " +
			"ZADEKLAROWANE w `requires` niżej — flaga `accountDeletion` weszła do rejestru " +
			"scaleniem #293, więc próg strażnika minął i kontrakt kompilacji na nazwy flag " +
			"go przyjmuje.",
		defaultValue: false,
		// W-1 (sekcja Z-2 dokumentu): sekcja 8 klauzuli obiecuje studentowi, że usunie
		// konto samodzielnie w ustawieniach profilu. Przy zgaszonej ścieżce usunięcia to
		// zdanie jest NIEPRAWDZIWE W CHWILI WYPOWIADANIA — a obietnica prawa, którego nie
		// umiemy wykonać, jest gorsza niż brak klauzuli. Dlatego bramka stoi w ewaluacji
		// flagi (fail-closed + wpis [flags.requires] w logu), nie w runbooku wdrożenia —
		// ten sam argument, co przy sprzężeniu placementu z egzaminem wyżej.
		requires: ["accountDeletion"],
	},
	// gapVerifier (AG.1) USUNIĘTA w AG.2 (2026-07-07): jedyny konsument —
	// LLM-owa gałąź legacy generate-gaps — skasowany; moduł verify-gaps zostaje
	// jako klocek bez flagi (przyszli konsumenci AG.5+ dostaną własne flagi).
	// Env FLAG_GAP_VERIFIER na Vercelu można usunąć (nieszkodliwa, nic jej nie czyta).
} as const satisfies Record<string, FlagDefinition>;

/** Nazwa istniejącej flagi — węższy typ niż string, wymuszony przez rejestr. */
export type FlagName = keyof typeof FLAGS;

/** Wszystkie napisy występujące w `requires` w całym rejestrze. */
type DeclaredRequirement = {
	[K in FlagName]: (typeof FLAGS)[K] extends { readonly requires: readonly (infer R)[] }
		? R
		: never;
}[FlagName];

/**
 * KONTRAKT KOMPILACJI: każdy wpis `requires` musi nazywać ISTNIEJĄCĄ flagę.
 * Bez tego literówka („masterygate") dawałaby przesłankę, której NIC nigdy nie
 * spełnia — flaga cicho nie działa, a env jest zapalony. Pole jest typowane
 * `readonly string[]` (a nie `FlagName[]`), bo `FlagName` powstaje z `typeof FLAGS`
 * i wpisanie go do `FlagDefinition` zapętla wnioskowanie typu; ta linia domyka
 * to samo sprawdzenie po fakcie. Runtime-owy odpowiednik: test „requires nazywa
 * istniejącą flagę" (`src/lib/__tests__/flags.test.ts`).
 */
type Assert<T extends true> = T;
type _RequirementsAreFlagNames = Assert<
	[DeclaredRequirement] extends [FlagName | never] ? true : never
>;

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
 * Przesłanki flagi (`requires`) jako lista nazw flag. Odczyt przez jawne
 * poszerzenie do `FlagDefinition`, bo `as const satisfies` zawęża rejestr do
 * typów literalnych i pole opcjonalne „znika" z wpisów, które go nie mają.
 * Nazwy są nazwami flag na mocy `_RequirementsAreFlagNames` (kontrakt kompilacji)
 * i testu runtime — rzutowanie nie jest tu domysłem.
 */
export function requirementsOf(name: FlagName): readonly FlagName[] {
	const flag: FlagDefinition = FLAGS[name];
	return (flag.requires ?? []) as readonly FlagName[];
}

/** Rejestr flag w kształcie potrzebnym ewaluacji — realny FLAGS albo atrapa testu. */
type FlagRegistry = Readonly<Record<string, FlagDefinition>>;

/**
 * Ostrzeżenia o niespełnionym sprzężeniu — raz na proces i na kombinację, żeby
 * gorąca ścieżka (flaga czytana per żądanie) nie zalała logu. Cold start serwera
 * bezserwerowego wypisze je ponownie, więc sygnał nie ginie.
 */
const warned = new Set<string>();
function warnOnce(key: string, message: string, ctx: Record<string, string>): void {
	if (warned.has(key)) return;
	warned.add(key);
	// GŁOŚNO i przez ten sam kanał co błędy (logError → console.error): bez tego
	// wpisu zapalenie flagi z niespełnioną przesłanką wygląda dokładnie tak samo
	// jak flaga zgaszona — ktoś ustawia env, nic się nie dzieje i nikt nie wie
	// dlaczego. To był warunek postawiony wprost przy decyzji o bramce.
	logError("flags.requires", new Error(message), ctx);
}

/**
 * Rekurencyjna ewaluacja: flaga działa ⟺ jej env jest truthy ORAZ każda flaga
 * z `requires` jest (PRZECHODNIO) włączona. FAIL-CLOSED — każdy problem
 * (niespełniona przesłanka, nieznana nazwa, cykl w grafie) GASI flagę, nigdy
 * jej nie zapala.
 *
 * `trail` niesie ścieżkę wywołań: cykl (A wymaga B, B wymaga A) kończy się
 * zgaszeniem flagi i głośnym logiem, a nie przepełnieniem stosu na GORĄCEJ
 * ścieżce (flagi czytane per żądanie). Statyczną acykliczność rejestru pilnuje
 * osobny test — ten strażnik jest dla stanu, w którym test już przegapiono.
 *
 * Rejestr jest PARAMETREM (a nie odczytem `FLAGS` w środku) z jednego powodu:
 * inaczej strażnika cyklu nie da się wykonać żadnym testem, bo realny rejestr
 * jest acykliczny — a „test", który odtwarza logikę zamiast ją wywołać, daje
 * pozór pokrycia zamiast pokrycia. Produkcja woła to wyłącznie z `FLAGS`.
 */
export function evaluateFlagIn(
	registry: FlagRegistry,
	name: string,
	trail: readonly string[] = [],
): boolean {
	if (trail.includes(name)) {
		warnOnce(`cycle:${name}`, `[flags] CYKL w grafie 'requires': ${[...trail, name].join(" → ")}`, {
			flag: name,
			trail: [...trail, name].join(" → "),
		});
		return false;
	}
	const flag = registry[name];
	if (!flag) {
		warnOnce(`unknown:${name}`, `[flags] Nieznana flaga w grafie 'requires': '${name}'.`, {
			flag: name,
		});
		return false;
	}
	if (!parseFlagValue(process.env[flag.envVar], flag.defaultValue)) return false;

	const requires = flag.requires ?? [];
	if (requires.length === 0) return true;

	const deeper = [...trail, name];
	const missing = requires.filter((req) => !evaluateFlagIn(registry, req, deeper));
	if (missing.length > 0) {
		warnOnce(
			`missing:${name}:${missing.join(",")}`,
			`[flags] Flaga '${name}' (${flag.envVar}) jest ZAPALONA w env, ale jej ` +
				`przesłanki są zgaszone: ${missing.join(", ")}. Funkcja pozostaje WYŁĄCZONA ` +
				"(fail-closed). Zapal najpierw przesłanki albo zgaś tę flagę.",
			{ flag: name, missing: missing.join(",") },
		);
		return false;
	}
	return true;
}

/**
 * Czy funkcja za flagą jest włączona. Ewaluacja po stronie serwera; domyślnie
 * `false` — zapala jawnie zmienna środowiskowa flagi ORAZ (od 1E.7 L4) komplet
 * jej przesłanek z `requires`.
 */
export function isFeatureEnabled(name: FlagName): boolean {
	return evaluateFlagIn(FLAGS, name);
}
