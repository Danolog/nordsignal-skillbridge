// ============================================================================
// Cache sugestii wykładowczych (0.5, MEDIUM — wallet).
//
// generateFacultySuggestions (LLM, tier standard) było wołane przy KAŻDYM ładowaniu
// pulpitu faculty. Sugestie zależą od WOLNOZMIENNEGO agregatu (top brakujące
// kompetencje per tenant + liczba studentów) — więc powtórne generacje w krótkim
// oknie to czysty koszt bez wartości. Cache w oknie TTL eliminuje je.
//
// Świadomy trade-off: cache jest PER-INSTANCJA (moduł w pamięci). Fluid Compute
// reużywa instancję między żądaniami, więc trafienia są realne w obrębie instancji;
// NIE jest współdzielony między instancjami (zero migracji/infra — celowo). Twardy
// sufit kosztu w najgorszym razie daje rate-limit na endpoincie (per tenant).
// ============================================================================

type Entry = { value: string[]; expires: number };

const store = new Map<string, Entry>();
const TTL_MS = 10 * 60_000; // 10 min — agregat pulpitu zmienia się w skali godzin/dni.

/** Klucz cache = tenant + sygnatura wejścia modelu (co realnie wpływa na prompt). */
export function buildSuggestionsCacheKey(
	tenantId: string,
	input: { studentCount: number; items: Array<{ name: string; requiredByPercent: number }> },
): string {
	return `${tenantId}:${JSON.stringify(input)}`;
}

/** Zwraca sugestie z cache jeśli świeże; null gdy brak lub przeterminowane (leniwa eksmisja). */
export function getCachedSuggestions(key: string): string[] | null {
	const entry = store.get(key);
	if (!entry) return null;
	if (entry.expires <= Date.now()) {
		store.delete(key);
		return null;
	}
	return entry.value;
}

/** Zapisuje sugestie do cache z TTL. Wołane TYLKO dla udanej generacji (nie dla fallbacku). */
export function setCachedSuggestions(key: string, value: string[]): void {
	store.set(key, { value, expires: Date.now() + TTL_MS });
}

/** Czyści cache — wyłącznie dla testów (izolacja między przypadkami). */
export function clearSuggestionsCache(): void {
	store.clear();
}
