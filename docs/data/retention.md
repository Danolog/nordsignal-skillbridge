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
| Ślad ocen powtórek (FSRS) | `review_logs` (całe wiersze — `rating`, `stability_before/after`, `elapsed/scheduled_days`, `reviewed_at`) | **12 miesięcy** | `reviewed_at` (każdy wiersz osobno) | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/data/ropa.md` (czynność „Profilowanie uczenia się"); rls-matrix v0.30 warunek RODO (a), Ryan 2026-07-25. Append-only ślad behawioralny → **art. 5 ust. 1 lit. e** (ograniczenie przechowywania); materiał kalibracji silnika FSRS + audyt. Analog `viva_answers.content`/hint_reveals `at[]` (12 m-cy). **Egzekwowanie: BRAK SKRYPTU — dług, wspólny skrypt R-1 rejestru, termin: pierwsza realna rejestracja studenta** |
| Żywy stan FSRS (co na dziś) | `review_states` (całe wiersze — `stability`/`difficulty`/`due`/`reps`/`lapses` per student × koncept) | **czas trwania konta studenta** | utworzenie/aktualizacja wiersza | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/data/ropa.md`; rls-matrix v0.30 warunek RODO (a), Ryan 2026-07-25 — **stan roboczy**, nie ślad: bez osobnego okresu póki konto aktywne (skrócenie zepsułoby funkcję produktu — model zapominania FSRS liczy się w miesiącach/latach, nie chroniłoby studenta). Okres **nazwany**, nie domyślny. Art. 17 (kasowanie na żądanie) realizowany automatycznie kaskadą |
| Odblokowania modułów z diagnozy (placement curriculum) | `curriculum_placements` (całe wiersze — `level`, `threshold`, `reason`, `support_mode`, `blocking_hole_slug`, odniesienie do sesji diagnozy) | **czas trwania konta studenta** | utworzenie wiersza (`unlocked_at`; wiersz nigdy nie jest aktualizowany) | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/data/ropa.md` wpis #5 („Automatyczne dopasowanie ścieżki nauki"); rls-matrix v0.32; Ryan (CRCO) 2026-07-26, bramka projektowa 1E.7 L3. **To NIE jest ślad behawioralny — wiersz jest NOŚNIKIEM UPRAWNIENIA** (moduł otwarty ⟺ istnieje wiersz). Skrócenie okresu nie chroni studenta, tylko **odbiera mu dostęp**, który dostał — dlatego okres liczy się funkcją, nie art. 5 ust. 1 lit. e. Analog `review_states` (żywy stan), nie `review_logs` (ślad 12 m-cy). Art. 17 kaskadą. **Przegląd celowany:** `blocking_hole_slug` to jedyne pole bez funkcji operacyjnej (służy wyłącznie miernikowi progu, DECYZJA 2 Sophii) — po rozstrzygnięciu progu ≥3 na pilotażu sprawdzić, czy zostaje |

Uwagi:
- Kasowanie na żądanie (art. 17 RODO) działa NIEZALEŻNIE od okresów wyżej —
  `student_id ON DELETE CASCADE` na tabelach klasy K-PII.
- Skrypt egzekucji retencji vivy: zakres 1.16a/1.16b (tools/, dry-run +
  `--execute`, wzorzec remediate-duplicate-submissions).
