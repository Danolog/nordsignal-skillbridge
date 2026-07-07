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
		description:
			"Blok AG: cykliczne odświeżanie rynku + recompute luk + powiadomienia o nowej luce.",
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
	careerModelFromDb: {
		envVar: "FLAG_CAREER_MODEL_FROM_DB",
		description:
			"1.0: model kariery czytany z career_model_versions (DB) zamiast statycznego JSON w repo.",
		defaultValue: false,
	},
	gapVerifier: {
		envVar: "FLAG_GAP_VERIFIER",
		description:
			"AG.1: weryfikator luk — drugi przebieg sprawdza pokrycie każdej luki z modelu w danych rynkowych (job_market_data), zanim luka trafi do studenta.",
		defaultValue: false,
	},
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
