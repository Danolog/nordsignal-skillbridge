// ============================================================================
// Timeout wywołań LLM (0.9, MEDIUM).
//
// Wywołania generateText/generateObject/streamText nie miały jawnego limitu czasu.
// Gdy Anthropic zwlekał (albo zawiesił połączenie), żądanie wisiało aż do
// maxDuration handlera (60 s) — trzymając funkcję serverless, połączenie i budżet,
// a użytkownik czekał bez sygnału błędu. `abortSignal` z AbortSignal.timeout
// FAKTYCZNIE anuluje żądanie (AI SDK przekazuje sygnał do fetcha), nie tylko
// przestaje na nie czekać — więc zwalnia zasoby, a nie tylko odblokowuje kod.
//
// Wartość dobrana pod maxDuration=60 z zapasem na parsowanie JSON + zapisy DB po
// wywołaniu. Pojedyncza generacja mieści się w tym z dużym marginesem; limit to
// bezpiecznik na zawieszenie, nie budżet normalnej pracy.
// ============================================================================

export const AI_CALL_TIMEOUT_MS = 45_000;

/**
 * Budżet dla DŁUGICH generacji oceniających (krok 3 potoku: ~3–4k tokenów
 * uzasadnień z cytatami dla 4+ kryteriów ≈ 40–60 s na tierze standard).
 * Zmierzone na prodzie 2026-07-10: realne repo L1 (≈12k znaków artefaktu)
 * NIE mieściło się w 45 s — każdy submit kończył się TimeoutError →
 * semantic_parse_failed → 0/100 (fail-closed zadziałał, ale ocena była
 * niemożliwa z konstrukcji). Trasa submitu ma maxDuration=180.
 */
export const AI_LONG_CALL_TIMEOUT_MS = 90_000;

/**
 * Świeży `AbortSignal` z timeoutem dla jednego wywołania LLM. Wołać per wywołanie
 * (także per ponowienie w generateObjectWithRetry — każda próba dostaje własny
 * limit, nie współdzielony deadline).
 */
export function aiTimeoutSignal(ms: number = AI_CALL_TIMEOUT_MS): AbortSignal {
	return AbortSignal.timeout(ms);
}
