// ============================================================================
// PROGI EWALUACJI GAP DETECTION (AG.0).
//
// Część deterministyczna nie ma progów — wynik musi być DOKŁADNY (precision =
// recall = 1.0 na golden secie); każde odchylenie to regresja reguł liczenia.
//
// Progi LLM (sędzia opisów) dociśnięte pod zmierzony baseline z 2026-07-07
// po poprawce ucięć generate-why (claude-sonnet-4-6, avgOverall = 5.0 przy
// 4 próbkach — patrz baseline.json): 4.5 = dwie próbki po 4 (szum sędziego)
// jeszcze przechodzą, głębszy albo szerszy spadek — obcina. Reguła z roadmapy
// (Blok AG): każda zmiana promptu/modelu MUSI raportować deltę metryki.
// ============================================================================

/** Minimalna średnia ocena ogólna sędziego (skala 1–5) dla opisów generate-why. */
export const WHY_MIN_AVG_OVERALL = 4.5;
