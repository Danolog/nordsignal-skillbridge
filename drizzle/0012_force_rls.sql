-- ============================================================================
-- §8 #1 Phase 2 (sub-issue #19h) — FORCE ROW LEVEL SECURITY na 6 tabelach
-- studenta + `owner_passthrough` policy dla `neondb_owner`.
--
-- Decyzja: ADR-005 (docs/decisions/005-force-rls-seed-handling.md, Accepted
-- 2026-05-28). Wybór: opcja (b) `owner_passthrough` policy zamiast (a)
-- SET LOCAL ROLE per insert w seed.ts.
--
-- Co ta migracja zmienia:
-- - Runtime (app_runtime, po SET LOCAL ROLE app_student/app_faculty) — pełne
--   pokrycie FORCE: zapomniany SET LOCAL ROLE w withTenantContext = deny-default
--   (polityki student_sees_own / faculty_sees_tenant nie match dla app_runtime
--   bezpośrednio). Defense-in-depth osiągnięte.
-- - Owner (neondb_owner) — `owner_passthrough` policy z USING (true) WITH CHECK
--   (true) daje pełen passthrough. Spójne z dzisiejszym non-FORCE behaviour;
--   po prostu explicit, audytowalne w pg_policies. Seed (src/lib/db/seed.ts),
--   Better Auth adapter, audit_log INSERT, migration data-fixes — działają
--   bez zmian.
--
-- Tabele Better Auth (user/session/account/verification) i audit_log/
-- faculty_sessions NIE są w zakresie FORCE — explicit OOS w ADR-005 (sekcja
-- "Consequences" gotcha #2).
-- ============================================================================

-- 1. FORCE na 6 tabelach studenta
ALTER TABLE students             FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE competencies         FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE gaps                 FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE skill_maps           FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE passports            FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE project_submissions  FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- 2. owner_passthrough policy na każdej z 6 tabel. Pętla DO $$ … END $$ żeby
-- nie duplikować boilerplate. DROP POLICY IF EXISTS = idempotencja (re-run
-- migracji jako część regression / smoke nie wybucha).
DO $$
DECLARE
	tbl text;
	tbls text[] := ARRAY['students','competencies','gaps','skill_maps','passports','project_submissions'];
BEGIN
	FOREACH tbl IN ARRAY tbls LOOP
		EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON %I', tbl);
		EXECUTE format(
			'CREATE POLICY owner_passthrough ON %I FOR ALL TO neondb_owner USING (true) WITH CHECK (true)',
			tbl
		);
	END LOOP;
END $$;
--> statement-breakpoint
-- ROLLBACK:
-- DO $$ DECLARE tbl text; BEGIN
--   FOREACH tbl IN ARRAY ARRAY['students','competencies','gaps','skill_maps','passports','project_submissions'] LOOP
--     EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON %I', tbl);
--   END LOOP;
-- END $$;
-- ALTER TABLE students             NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE competencies         NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE gaps                 NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE skill_maps           NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE passports            NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE project_submissions  NO FORCE ROW LEVEL SECURITY;
