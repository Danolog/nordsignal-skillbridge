ALTER TABLE "faculty_sessions" ADD COLUMN "role" text DEFAULT 'faculty' NOT NULL;--> statement-breakpoint
ALTER TABLE "faculty_sessions" ADD CONSTRAINT "faculty_sessions_role_values" CHECK ("faculty_sessions"."role" IN ('faculty','quality_operator'));
-- B8/1.3 (ADR-011): rola sesji recenzenckiej — jedna tabela dla wykładowcy
-- (tenant wymagany) i operatora jakości (tenant NULL, cross-tenant).
-- DEFAULT 'faculty' = bezpieczny backfill istniejących sesji.
-- ROLLBACK:
-- ALTER TABLE faculty_sessions DROP CONSTRAINT faculty_sessions_role_values;
-- ALTER TABLE faculty_sessions DROP COLUMN role;
