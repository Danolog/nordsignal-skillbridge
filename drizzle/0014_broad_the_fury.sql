ALTER TABLE "competencies" ADD COLUMN "self_assessment" smallint;--> statement-breakpoint
ALTER TABLE "competencies" ADD COLUMN "verified_by_method" text DEFAULT 'self' NOT NULL;--> statement-breakpoint
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_self_assessment_range" CHECK ("competencies"."self_assessment" IS NULL OR "competencies"."self_assessment" BETWEEN 1 AND 4);--> statement-breakpoint
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_verified_by_method_values" CHECK ("competencies"."verified_by_method" IN ('self'));
--> statement-breakpoint

-- ============================================================================
-- R1 — Izolacja kolumnowa (ADR-002 „Validation plan pkt 1").
-- Wzorzec: jak migracje 0008/0012 z RLS. Drizzle NIE generuje REVOKE/GRANT
-- kolumnowych — dopisywane ręcznie w każdej migracji dotykającej competencies.
--
-- app_faculty (rola bazodanowa panelu wykładowcy) NIE widzi:
--   - self_assessment  → R1 = NIE (decyzja Darka 2026-05-27, samoocena prywatna)
--   - verified_by_method → deny-by-default (ADR-002); faculty nie potrzebuje
--
-- Efekt netto pod rolą app_faculty:
--   SELECT self_assessment  FROM competencies  → ERROR: permission denied for column
--   SELECT *                FROM competencies  → ERROR: permission denied for column
--   SELECT id, name, status FROM competencies WHERE tenant_id = ... → OK
--
-- Pełna lista kolumn competencies przed tą migracją (0008 nadała SELECT na ALL):
--   id, student_id, tenant_id, name, status, market_percentage, created_at
-- Po tej migracji dochodzą self_assessment (brak w GRANT) i verified_by_method (brak w GRANT).
-- GRANT zawiera kolumny których faculty dashboard realnie używa (Ethan B4.3 briefing).
-- ============================================================================
REVOKE SELECT ON competencies FROM app_faculty;
--> statement-breakpoint
GRANT SELECT (id, student_id, tenant_id, name, status, market_percentage, created_at)
  ON competencies TO app_faculty;
-- self_assessment        CELOWO poza listą: R1 = NIE (Darek 2026-05-27)
-- verified_by_method     CELOWO poza listą: deny-by-default; faculty nie potrzebuje (ADR-002)

-- ============================================================================
-- ROLLBACK (instrukcja dla operatora — NIE wykonywać automatycznie):
--
-- -- Cofnięcie izolacji kolumnowej (przywraca grant tabelowy z 0008):
-- REVOKE SELECT ON competencies FROM app_faculty;
-- GRANT SELECT ON competencies TO app_faculty;
--
-- -- Usunięcie kolumn (tylko gdy brak danych lub po backup):
-- ALTER TABLE competencies DROP COLUMN IF EXISTS verified_by_method;
-- ALTER TABLE competencies DROP COLUMN IF EXISTS self_assessment;
-- ============================================================================