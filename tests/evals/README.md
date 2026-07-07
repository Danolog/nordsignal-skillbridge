# Harness ewaluacyjny gap detection (AG.0)

Mierzy jakość wykrywania luk kompetencyjnych — bramka jakości dla całej warstwy
agentowej (AG.1+ z `.agents/plans/11-roadmap-fazy-0-3.md`, §4-bis). Bez zmierzonej
jakości każda funkcja budowana wyżej (weryfikator luk, powiadomienia, doradca)
wzmacniałaby błędy.

## Model mierzonego systemu

Luki liczą się **wyłącznie deterministycznie**: katalog rynku (`job_market_data`
per ścieżka) minus zaznaczenia studenta (`deriveGaps`, reguła priorytetów
względnych r = popyt/max: ≥0.66 krytyczna, ≥0.33 ważna). Sylabus jest adnotacją
informacyjną bez wpływu na luki i pokrycie (decyzja Darka 2026-07-07) — dlatego
harness go nie ewaluuje. Jedyny udział LLM w treści luki to opis „dlaczego ważne”
(`generate-why`).

## Suity

| Suita | Plik | LLM | Kiedy biegnie |
|-------|------|-----|---------------|
| Deterministyczne liczenie luk | `gap-detection/deterministic.eval.test.ts` | nie | zawsze (`pnpm test:evals`) |
| Trafność opisów luk (LLM-as-judge) | `gap-detection/why-judge.eval.test.ts` | tak (4× generate + 4× sędzia, tier standard) | tylko z `ANTHROPIC_API_KEY` |

Golden set: `gap-detection/golden-set.ts` — 12 przypadków dla 5 ścieżek,
wartości policzone **ręcznie** z artefaktu ETL (`job-market-justjoinit.json`,
snapshot 2026-02), w tym przypadki graniczne progu 0.33 (SQL u Java Developera
r = 0.3258 → miło-mieć; REST / API u Frontenda r = 0.3333 → ważna).

## Uruchamianie

```bash
pnpm test:evals          # cały projekt evals
```

- **Nie biegnie w zwykłym CI** (`test:run` / job `test`) — suita LLM kosztuje
  wywołania API. Metryki (`lib/metrics.ts`) mają testy unit w
  `tests/unit/evals-metrics.test.ts`, więc poprawność liczenia pilnowana jest
  w każdym CI bez kosztu.
- Bez `ANTHROPIC_API_KEY` (w env / `.env.local` / `.env`) suita LLM **jawnie
  się pomija** (widoczny test „POMINIĘTA”), deterministyczna biegnie zawsze.
- Koszt runu LLM: 8 wywołań tier standard (Sonnet), ~kilka groszy. Model można
  nadpisać `SKILLBRIDGE_AI_MODEL` (np. na Haiku), ale baseline mierz na modelu
  produkcyjnym.

## Baseline i delta (reguła z roadmapy, dziedziczy Bramkę DoD pkt 4)

Eval **nie jest twardą bramką merge’a**, ALE każda zmiana promptu/modelu gap
detection MUSI raportować deltę metryki:

1. Run pisze raporty do `tests/evals/reports/*-latest.json` (gitignore).
2. Zaakceptowany run kopiujesz do `tests/evals/gap-detection/baseline.json`
   (commitowany) — od tej pory każdy run wypisuje na konsolę deltę vs baseline.
3. Po pierwszym baselinie dociśnij progi w `gap-detection/thresholds.ts` tuż
   pod zmierzone wartości (obecne są PROWIZORYCZNE).

## Dowód red-green (DoD: celowe pogorszenie → mierzalny spadek)

Deterministycznie: zmień tymczasowo `PRIORITY_R_IMPORTANT` w
`src/lib/onboarding/market-catalog.ts` (np. 0.33 → 0.35) — sentinele graniczne
(REST / API, SOC) robią się czerwone. LLM: zepsuj tymczasowo prompt
`generate-why` (np. usuń wymóg widełek i ról) — sędzia obniża `rolesAndTasks`/
`salaryIncluded` i `avgOverall` spada poniżej progu. Po dowodzie przywróć stan.

## Aktualizacja golden setu

Golden set jest przypięty do snapshotu artefaktu 2026-02. Po odświeżeniu danych
rynkowych (AG.3/AG.4) liczności, pokrycia i sentinele wymagają ponownej ręcznej
weryfikacji — to świadomy koszt wzorca „ręcznie zweryfikowane oczekiwane luki”.
