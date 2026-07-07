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

/**
 * AG.1: minimalna trafność sędziego ugruntowania luk (verifier-judge, warstwa
 * fast) na 10 ręcznie oznaczonych próbkach (5 wariantów katalogu / 5 halucynacji
 * z pułapkami). 0.9 = jedna pomyłka na wariancie jeszcze przechodzi (szum
 * modelu); fałszywa akceptacja halucynacji NIGDY nie przechodzi — pilnuje jej
 * osobna, twarda asercja w suicie (falseAccepts = []).
 */
export const VERIFIER_JUDGE_MIN_ACCURACY = 0.9;
