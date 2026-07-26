-- ============================================================================
-- 1E.4 (N2) — indeks pod korelowany EXISTS filtra pojemności enroll-hook po
-- zawężeniu do single_choice (N1). Predykat: concept_id = ? AND status = 'active'
-- AND type = 'single_choice' — trzy równości → indeks (concept_id, status, type)
-- pokrywa go w całości. Wspiera też ogólne zapytania „aktywne pytania konceptu
-- danego typu".
--
-- Migracja CZYSTO ADDYTYWNA (CREATE INDEX) — zero DROP, zero zmiany danych/schematu
-- tabeli. CREATE INDEX (nie CONCURRENTLY): migracja jest transakcyjna, a tabela
-- question_items jest mała na start — krótki lock zapisu jest akceptowalny. Gdyby
-- tabela urosła, wariant CONCURRENTLY wymaga wyjęcia poza transakcję (osobna
-- migracja) — świadomy wybór teraz na rzecz prostoty.
-- ============================================================================
CREATE INDEX "idx_question_items_concept_status_type" ON "question_items" USING btree ("concept_id","status","type");

-- ROLLBACK:
-- DROP INDEX IF EXISTS "idx_question_items_concept_status_type";
