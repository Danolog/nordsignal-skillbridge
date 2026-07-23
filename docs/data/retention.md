# Retencja danych — SkillBridge

> Centralny rejestr okresów przechowywania danych osobowych. Nowa klasa danych
> z określoną retencją = nowy wiersz tutaj (ADR, który ją wprowadza, linkuje
> ten plik). Egzekwowanie: skrypty operacyjne w `tools/` (uruchamiane ręcznie
> do czasu warstwy zadań cyklicznych) — każdy z guardem `assertTestDb`
> i trybem dry-run.

| Dane | Tabela / kolumna | Okres | Od kiedy liczony | Co zostaje | Podstawa |
|---|---|---|---|---|---|
| Zdarzenia placement (deklarowane, za zgodą) | `placement_events` (całe wiersze) | **do odwołania zgody** (delete-on-revoke w tx zgody) | udzielenie zgody (`students.placement_decided_at`) | nic (agregaty E2.H liczone na żywo — student znika z metryki) | 1.17, decyzje Darka 2026-07-10 |
| Surowe odpowiedzi obrony ustnej (viva) | `viva_answers.content` | **12 miesięcy** | prawomocne rozstrzygnięcie sesji (`viva_sessions.completedAt`; przy eskalacji do człowieka — decyzja z `submission_reviews`) | `viva_sessions.resultJson` (punkty + uzasadnienia sędziego, bez surowego tekstu studenta) | ADR-013 D3 (sign-off Darka 2026-07-09) |
| Znaczniki czasu odsłonięcia podpowiedzi | `curriculum_item_progress.hints_revealed_json` → `at[]` | **12 miesięcy** | każdy znacznik osobno (data jego zapisu) | `d` — maksymalna głębokość (stan nauki, bez ograniczenia czasowego) | `docs/security/hint-reveals-retencja-signoff.md` (Ryan, 2026-07-22); ADR-018 D1. **Egzekwowanie: BRAK SKRYPTU — dług, termin: pierwsza realna rejestracja studenta** |
| Stan ścieżki nauki (postęp i odpowiedzi) | `curriculum_item_progress`, `curriculum_item_answers` (całe wiersze, w tym `answered_at`) | **czas trwania konta studenta** | utworzenie wiersza | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/security/hint-reveals-retencja-signoff.md` (Ryan, 2026-07-22) — okres podyktowany celem FSRS (model zapominania w skali miesięcy); przegląd przed pierwszą realną rejestracją |

Uwagi:
- Kasowanie na żądanie (art. 17 RODO) działa NIEZALEŻNIE od okresów wyżej —
  `student_id ON DELETE CASCADE` na tabelach klasy K-PII.
- Skrypt egzekucji retencji vivy: zakres 1.16a/1.16b (tools/, dry-run +
  `--execute`, wzorzec remediate-duplicate-submissions).
