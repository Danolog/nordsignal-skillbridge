// JEDNO ŹRÓDŁO PRAWDY dla UUID fixtures bramek dostępności (a11y) w CI.
//
// Konsumenci (wszyscy importują STĄD — literał UUID nie jest przepisywany ręcznie
// w żadnym innym miejscu):
//   - spec 62 (`62-1e3-exam-a11y.spec.ts`)  → EXAM_MODULE_ID  (goto /curriculum/<id>/exam)
//   - spec 63 (`63-c11-tutor-a11y.spec.ts`)  → TUTOR_PROJECT_ID (goto /projects/<id>)
//   - seeder CI (`tools/fixtures/seed-a11y-fixtures.ts`) → OBA (INSERT wiersza fixture)
//
// Zmiana UUID = zmiana TYLKO tutaj. Seeder wstawia dokładnie te wiersze do bazy
// TESTOWEJ, a spec wchodzi na dokładnie te ścieżki — dryf jest niemożliwy, bo
// literał żyje w jednym pliku, a SQL jest generowany z tej stałej (nie zapisany
// osobno). Wcześniej ten sam UUID był zahardkodowany w 3 miejscach (spec + INSERT
// psql + SELECT psql w pr.yml) — konsolidacja usuwa dryf i zależność od klienta psql.

/** „Moduł A" (baza testowa) — moduł bramki egzaminu 1E.3 skanowanej przez axe.
 *  Strona egzaminu robi notFound() bez tego wiersza → skan renderowałby 404. */
export const EXAM_MODULE_ID = "cad6dff5-e326-4991-a742-b7ca382ee2d2";

/** Projekt-fixture dla skanu a11y panelu tutora (C11). Deterministyczne wejście:
 *  spec robi goto /projects/<TUTOR_PROJECT_ID> zamiast losować pierwszy z katalogu
 *  (poprzednio: openFirstProject — zależne od stanu seedu/katalogu). */
export const TUTOR_PROJECT_ID = "a7e5bd98-200b-48d8-aa8a-a0136745e842";
