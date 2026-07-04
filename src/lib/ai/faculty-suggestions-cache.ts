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
	// 0.15/E1 (follow-up audytu 0.5): leniwa eksmisja usuwała tylko odpytywane klucze —
	// wpisy o nieaktualnej sygnaturze (stary agregat) zostawały w mapie na zawsze.
	// Zamiatamy przeterminowane przy zapisie (zapis = rzadki, po realnej generacji LLM).
	const now = Date.now();
	for (const [k, entry] of store) {
		if (entry.expires <= now) store.delete(k);
	}
	store.set(key, { value, expires: now + TTL_MS });
}

/** Czyści cache — wyłącznie dla testów (izolacja między przypadkami). */
export function clearSuggestionsCache(): void {
	store.clear();
}

/** Rozmiar mapy — wyłącznie dla testów (własność pamięciowa eksmisji z E1). */
export function suggestionsCacheSize(): number {
	return store.size;
}
