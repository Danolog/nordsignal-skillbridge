-- ============================================================================
-- §8 #1 Phase 1 (rls-matrix.md, issue #19) — fundament dla FORCE RLS + rola
-- login nie-owner. Ta migracja tworzy rolę `app_runtime` JAKO NOLOGIN, żeby
-- migracja sama była bezpieczna (brak ścieżki logowania bez hasła).
--
-- Ścieżka aktywacji (Phase 2 — ops, runbook k3-prod-migration.md sekcja X):
--   1. Migracja 0011 ląduje na prod (rola istnieje, GRANT-y działają).
--   2. Ops w konsoli Neon: `ALTER ROLE app_runtime LOGIN PASSWORD '<gen>';`
--      (hasło z generatora, do Vercel ENV jako DATABASE_URL_RUNTIME).
--   3. Vercel: ustawienie `DATABASE_URL_RUNTIME=postgres://app_runtime:...`.
--   4. Restart preview/prod → withTenantContext używa app_runtime (dbRuntime
--      fallbackuje na DATABASE_URL bez ENV, więc krok 3 jest "trigger").
--   5. Walidacja: k3-validate test #9 (rola istnieje + brak BYPASSRLS).
--
-- Co Phase 1 (ta migracja) DAJE:
-- - Rola istnieje z poprawnymi GRANT-ami przez membership w app_student/app_faculty.
-- - Brak BYPASSRLS — gdy ktoś podłączy się jako app_runtime, RLS będzie egzekwowany.
-- - SET LOCAL ROLE app_student/app_faculty będzie działało (membership = OK do SET ROLE).
--
-- Co Phase 1 (ta migracja) NIE DAJE (do osobnych sub-issues):
-- - LOGIN + hasło (świadomie out-of-band — chroni przed leakiem hasła w git).
-- - ALTER TABLE ... FORCE ROW LEVEL SECURITY (osobne ADR-005, bo seed/migracje
--   muszą umieć omijać FORCE: albo SET LOCAL ROLE per insert w seed, albo
--   polityka owner-passthrough — decyzja Ethana po analizie seed.ts).
-- - Refactor tras studenta na withTenantContext (każda trasa = osobny PR,
--   bo zmienia semantykę transakcji + AI calls poza tx; sub-issues 19a..19f).
-- - Wpięcie k3-validate.ts do CI (osobne sub-issue 19g — wymaga ephemeral DB
--   z seedem w GitHub Actions).
-- ============================================================================

-- 1. Rola NOLOGIN, NOBYPASSRLS — fundament bez ścieżki ataku przez logowanie
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
		CREATE ROLE app_runtime NOLOGIN NOBYPASSRLS;
	END IF;
END $$;--> statement-breakpoint

-- 2. Członkostwo w grupach app_student / app_faculty — daje GRANT-y na tabele
-- (z 0008) i pozwala app_runtime wykonać SET LOCAL ROLE app_student/app_faculty
-- w withTenantContext. Bez membership SET ROLE rzuciłby "permission denied".
GRANT app_student TO app_runtime;--> statement-breakpoint
GRANT app_faculty TO app_runtime;--> statement-breakpoint

-- 3. USAGE na schemie public — wymagane dla każdego non-owner przed dostępem
-- do tabel (mimo membership), bo USAGE nie dziedziczy się przez GRANT roli.
GRANT USAGE ON SCHEMA public TO app_runtime;
--> statement-breakpoint
-- ROLLBACK:
-- REVOKE app_student, app_faculty FROM app_runtime;
-- REVOKE USAGE ON SCHEMA public FROM app_runtime;
-- DROP ROLE app_runtime;
-- (Po aktywacji LOGIN ops dodatkowo: ALTER ROLE app_runtime NOLOGIN PASSWORD NULL;)
