# Retencja danych — SkillBridge

> Centralny rejestr okresów przechowywania danych osobowych. Nowa klasa danych
> z określoną retencją = nowy wiersz tutaj (ADR, który ją wprowadza, linkuje
> ten plik). Egzekwowanie: skrypty operacyjne w `tools/` (uruchamiane ręcznie
> do czasu warstwy zadań cyklicznych) — każdy z guardem `assertTestDb`
> i trybem dry-run.

| Dane | Tabela / kolumna | Okres | Od kiedy liczony | Co zostaje | Podstawa |
|---|---|---|---|---|---|
| Surowe odpowiedzi obrony ustnej (viva) | `viva_answers.content` | **12 miesięcy** | prawomocne rozstrzygnięcie sesji (`viva_sessions.completedAt`; przy eskalacji do człowieka — decyzja z `submission_reviews`) | `viva_sessions.resultJson` (punkty + uzasadnienia sędziego, bez surowego tekstu studenta) | ADR-013 D3 (sign-off Darka 2026-07-09) |

Uwagi:
- Kasowanie na żądanie (art. 17 RODO) działa NIEZALEŻNIE od okresów wyżej —
  `student_id ON DELETE CASCADE` na tabelach klasy K-PII.
- Skrypt egzekucji retencji vivy: zakres 1.16a/1.16b (tools/, dry-run +
  `--execute`, wzorzec remediate-duplicate-submissions).
