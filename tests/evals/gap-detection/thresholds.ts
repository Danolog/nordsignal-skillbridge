// ============================================================================
// PROGI EWALUACJI GAP DETECTION (AG.0).
//
// Część deterministyczna nie ma progów — wynik musi być DOKŁADNY (precision =
// recall = 1.0 na golden secie); każde odchylenie to regresja reguł liczenia.
//
// Progi LLM (sędzia opisów) są PROWIZORYCZNE do czasu pierwszego baseline'u
// (wymaga ANTHROPIC_API_KEY): po zaakceptowanym runie należy je docisnąć tuż
// pod zmierzony baseline, żeby wykrywały spadek, a nie szum. Reguła z roadmapy
// (Blok AG): każda zmiana promptu/modelu MUSI raportować deltę metryki.
// ============================================================================

/** Minimalna średnia ocena ogólna sędziego (skala 1–5) dla opisów generate-why. */
export const WHY_MIN_AVG_OVERALL = 3.5;
