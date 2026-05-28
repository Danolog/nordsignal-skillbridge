-- ============================================================================
-- §8 #4 (rls-matrix.md) — TRUNCATE protection na audit_log.
--
-- Kontekst: 0008 dodał trigger `audit_log_no_update_delete` jako BEFORE UPDATE
-- OR DELETE … FOR EACH ROW. Code-review (2026-05-27) wykazał lukę: TRUNCATE
-- nie odpala triggerów row-level (FOR EACH ROW), więc owner (neondb_owner)
-- mógłby wyczyścić cały audit_log jednym poleceniem, omijając append-only
-- contract. App-role (app_student/app_faculty) i tak nie mają TRUNCATE
-- (0008 dał im tylko SELECT/INSERT/UPDATE/DELETE, nie TRUNCATE), ale do
-- czasu §8 #1 (FORCE RLS + rola login nie-owner) runtime łączy się jako
-- owner — jeden atak w owner-connection = czysta tabela.
--
-- Decyzja: trigger BEFORE TRUNCATE … FOR EACH STATEMENT używający tej samej
-- funkcji `audit_log_append_only()` (TG_OP będzie 'TRUNCATE' → komunikat
-- z RAISE pokaże 'audit_log jest append-only — TRUNCATE zabronione').
-- Statement-level trigger odpala się też na pustej tabeli (w przeciwieństwie
-- do row-level), więc działa nawet na świeżo wyczyszczonym audit_logu.
--
-- Dodatkowo: REVOKE TRUNCATE ON audit_log FROM app_student, app_faculty —
-- defense-in-depth (role nigdy tego nie miały, ale jawne REVOKE chroni
-- przed regresją w przyszłych GRANTach „ALL PRIVILEGES").
--
-- Owner (neondb_owner) WCIĄŻ ma TRUNCATE w katalogu uprawnień Postgres
-- (przywilej właściciela tabeli, nie wycofywalny przez REVOKE), ALE trigger
-- BEFORE TRUNCATE działa też dla owner (triggery zwykłe, nie SECURITY DEFINER,
-- fire dla każdego wywołującego oprócz superuser z session_replication_role
-- = 'replica'). Neon nie daje neondb_owner takiego setupu.
-- ============================================================================

DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
	BEFORE TRUNCATE ON audit_log
	FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only();--> statement-breakpoint

REVOKE TRUNCATE ON audit_log FROM app_student;--> statement-breakpoint
REVOKE TRUNCATE ON audit_log FROM app_faculty;
--> statement-breakpoint
-- ROLLBACK:
-- DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
-- (REVOKE TRUNCATE jest no-op rollback — role i tak nie miały TRUNCATE; gdyby ktoś
--  chciał formalnie cofnąć: GRANT TRUNCATE ON audit_log TO app_student, app_faculty)
