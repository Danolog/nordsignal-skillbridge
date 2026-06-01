-- ============================================================================
-- B4 — Samoocena kompetencji (Self-Assessment). Migracja 0015.
--
-- Decyzja feasibility: Ethan (CTO), 2026-05-31 — `docs/briefings/2026-05-31-ethan-schema-b3b4b5.md`
-- Numer migracji: 0015 (B3=0014 zajęte, B4=0015, B5=0016 — autorytatywna kolejność Oliver/sesja).
--
-- Co ta migracja robi:
--   Część 1: Dodaje dwie kolumny do tabeli `competencies`:
--     - self_assessment smallint NULL — samoocena studenta (poziom 1–4 lub NULL = nieocenione)
--     - verified_by_method text NOT NULL DEFAULT 'self' — metoda weryfikacji (Beta: tylko 'self')
--   Część 2: Izolacja kolumnowa R1 (ADR-002) — wykładowca (app_faculty) NIE widzi samooceny.
--     REVOKE SELECT na całej tabeli, potem GRANT SELECT tylko wybranych kolumn (bez self_assessment
--     i verified_by_method) — deny-by-default per ADR-002 „Validation plan pkt 1".
--
-- Żargon:
--   smallint — typ liczby całkowitej 2-bajtowej (mieści 1–4 z dużym zapasem)
--   CHECK — reguła bazy sprawdzająca poprawność wartości przy zapisie
--   REVOKE/GRANT — odebranie/nadanie roli prawa dostępu do kolumn tabeli
--   app_faculty — rola bazodanowa panelu wykładowcy; NIE widzi samooceny (R1=NIE, Darek 2026-05-27)
--
-- WAŻNE: Ta migracja tworzy tylko pliki DDL. db:migrate na prod = czerwona linia (CLAUDE.md §4).
--        Nie uruchamiaj bez sign-offu Darka.
-- ============================================================================

-- Część 1: Nowe kolumny na tabeli competencies
-- -----------------------------------------------
-- self_assessment:
--   - smallint = 2 bajty, naturalny typ dla porządkowej skali 1–4
--   - NULL dozwolony: NULL = "student nie ocenił jeszcze tej kompetencji"
--   - brak DEFAULT: celowe — wymuszony NULL, a nie fałszywa wartość domyślna
--   - CHECK BETWEEN 1 AND 4: baza odrzuca wartości spoza zakresu (np. 0 lub 5)
-- verified_by_method:
--   - NOT NULL DEFAULT 'self': w Becie każda kompetencja jest "samo-oceniana"
--   - CHECK IN ('self'): Beta zamkniętą do jednej wartości; poszerzenie pod silnik testów
--     (Phase 3+) = jednoliniowy ALTER CHECK, non-breaking dla istniejących wierszy
--> statement-breakpoint
ALTER TABLE competencies
  ADD COLUMN self_assessment smallint
    CONSTRAINT competencies_self_assessment_range CHECK (self_assessment BETWEEN 1 AND 4);
-- NULL = nieocenione; brak DEFAULT celowy — kompetencja bez oceny powinna być NULL, nie 0 ani 1
--> statement-breakpoint
ALTER TABLE competencies
  ADD COLUMN verified_by_method text NOT NULL DEFAULT 'self'
    CONSTRAINT competencies_verified_by_method_values CHECK (verified_by_method IN ('self'));
-- DEFAULT 'self': każdy istniejący wiersz dostaje 'self' — non-breaking backfill przy ALTER
-- CHECK IN ('self'): zamknięte na jedną wartość w Becie (silnik testów = OUT, PRD §2.2)

-- Część 2: Izolacja kolumnowa R1 — app_faculty NIE widzi self_assessment ani verified_by_method
-- -------------------------------------------------------------------------------------------------
-- ADR-002 „Validation plan pkt 1": kolumna + REVOKE/GRANT razem w jednej migracji.
-- Uzasadnienie: gdyby były w osobnych migracjach, istniałoby okno, w którym app_faculty
-- widzi self_assessment (od ALTER do REVOKE). Jedna migracja = brak okna.
--
-- Efekt netto pod rolą app_faculty:
--   SELECT self_assessment FROM competencies       → ERROR: permission denied for column
--   SELECT *                FROM competencies       → ERROR: permission denied for column
--   SELECT id, name, status FROM competencies WHERE tenant_id = ... → OK
--
-- Pełna lista kolumn competencies (ze schema.ts linie 147–166) przed tą migracją:
--   id, student_id, tenant_id, name, status, market_percentage, created_at
-- Po tej migracji dochodzą: self_assessment (BRAK w GRANT), verified_by_method (BRAK w GRANT)
-- GRANT zawiera minimum: tylko kolumny, których faculty dashboard dziś realnie używa
-- (zweryfikowane przez Ethana w sekcji B4.3 briefingu — faculty dashboard nie czyta competencies w ogóle)
--> statement-breakpoint
REVOKE SELECT ON competencies FROM app_faculty;
--> statement-breakpoint
GRANT SELECT (id, student_id, tenant_id, name, status, market_percentage, created_at)
  ON competencies TO app_faculty;
-- self_assessment CELOWO poza listą: R1 = NIE (Darek 2026-05-27) — samoocena prywatna
-- verified_by_method CELOWO poza listą: deny-by-default; faculty nie potrzebuje (ADR-002)

-- ============================================================================
-- ROLLBACK (instrukcja dla operatora — NIE wykonywać automatycznie):
--
-- -- Cofnięcie izolacji kolumnowej (przywróca grant tabelowy z 0008):
-- REVOKE SELECT ON competencies FROM app_faculty;
-- GRANT SELECT ON competencies TO app_faculty;
--
-- -- Usunięcie kolumn (tylko gdy brak danych lub po backup):
-- ALTER TABLE competencies DROP COLUMN IF EXISTS verified_by_method;
-- ALTER TABLE competencies DROP COLUMN IF EXISTS self_assessment;
-- ============================================================================
