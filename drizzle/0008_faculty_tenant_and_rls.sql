ALTER TABLE "faculty_sessions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "faculty_sessions" ADD CONSTRAINT "faculty_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- ============================================================================
-- K3 RLS — ADR-003 (WHERE primary + RLS defense-in-depth) · rls-matrix.md
-- Wzorzec: ENABLE RLS (NIE FORCE) + role grupowe + SET LOCAL ROLE w runtime.
-- Uzasadnienie braku FORCE: Neon free tier nie daje neondb_owner BYPASSRLS,
-- a FORCE blokuje systemowy seed/migracje (owner). Runtime ZAWSZE robi
-- SET LOCAL ROLE app_student/app_faculty -> RLS egzekwuje. Ścieżka owner =
-- tylko system; chroniona warstwami WHERE+lint+test (ADR-003 3.2).
-- Utwardzenie (izolowany login-role nie-owner + FORCE) = dług na po Becie.
-- ============================================================================

-- 1. Role grupowe (NOLOGIN). neondb_owner staje się członkiem, by SET ROLE działał.
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_student') THEN
		CREATE ROLE app_student NOLOGIN;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_faculty') THEN
		CREATE ROLE app_faculty NOLOGIN;
	END IF;
END $$;--> statement-breakpoint

GRANT app_student TO CURRENT_USER;--> statement-breakpoint
GRANT app_faculty TO CURRENT_USER;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_student, app_faculty;--> statement-breakpoint

-- 2. Granty tabelowe (RLS filtruje wiersze; GRANT daje w ogóle dostęp do tabeli)
GRANT SELECT, INSERT, UPDATE, DELETE ON
	students, competencies, gaps, skill_maps, passports, project_submissions
	TO app_student;--> statement-breakpoint
GRANT SELECT ON
	students, competencies, gaps, passports, project_submissions TO app_faculty;--> statement-breakpoint
GRANT UPDATE ON project_submissions TO app_faculty;--> statement-breakpoint
-- Katalog (bez RLS tenant-owej): czytelny dla obu ról uwierzytelnionych
GRANT SELECT ON projects, project_competencies, job_market_data TO app_student, app_faculty;--> statement-breakpoint

-- 3. ENABLE RLS na tabelach z danymi studenta
ALTER TABLE students             ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE competencies         ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE gaps                 ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE skill_maps           ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE passports            ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE project_submissions  ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Deny-client (ENABLE bez polityki app-rolowej; owner/Better Auth bypassuje jako
-- nie-FORCE -> logowanie nietknięte; klient app_student/app_faculty = 0 dostępu)
ALTER TABLE faculty_sessions     ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user"               ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE session              ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE account              ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE verification         ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- 4. Polityki. current_setting(...,true) = NULL gdy nieustawione -> porównanie
--    false -> 0 wierszy (bezpieczny default). Ustawiane przez withTenantContext.

-- students: student widzi/zarządza swój wiersz; faculty czyta swój tenant
DROP POLICY IF EXISTS student_sees_own ON students;--> statement-breakpoint
CREATE POLICY student_sees_own ON students FOR ALL TO app_student
	USING (user_id = current_setting('app.current_user_id', true))
	WITH CHECK (user_id = current_setting('app.current_user_id', true));--> statement-breakpoint
DROP POLICY IF EXISTS faculty_sees_tenant ON students;--> statement-breakpoint
CREATE POLICY faculty_sees_tenant ON students FOR SELECT TO app_faculty
	USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

-- competencies / gaps / passports: student przez student_id (podzapytanie na
-- students respektuje RLS -> zwraca tylko własny id); faculty SELECT tenant
DROP POLICY IF EXISTS student_sees_own ON competencies;--> statement-breakpoint
CREATE POLICY student_sees_own ON competencies FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DROP POLICY IF EXISTS faculty_sees_tenant ON competencies;--> statement-breakpoint
CREATE POLICY faculty_sees_tenant ON competencies FOR SELECT TO app_faculty
	USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS student_sees_own ON gaps;--> statement-breakpoint
CREATE POLICY student_sees_own ON gaps FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DROP POLICY IF EXISTS faculty_sees_tenant ON gaps;--> statement-breakpoint
CREATE POLICY faculty_sees_tenant ON gaps FOR SELECT TO app_faculty
	USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS student_sees_own ON passports;--> statement-breakpoint
CREATE POLICY student_sees_own ON passports FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DROP POLICY IF EXISTS faculty_sees_tenant ON passports;--> statement-breakpoint
CREATE POLICY faculty_sees_tenant ON passports FOR SELECT TO app_faculty
	USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

-- skill_maps: tylko student (matrix wiersz 4 — faculty nie czyta map)
DROP POLICY IF EXISTS student_sees_own ON skill_maps;--> statement-breakpoint
CREATE POLICY student_sees_own ON skill_maps FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

-- project_submissions: student zarządza swoje; faculty czyta tenant + moderuje
-- (UPDATE) w swoim tenancie. Ograniczenie do kolumn status/verified_by = warstwa
-- aplikacji (kolumna verified_by dochodzi w K2/Z5; tu izolacja tenant-owa).
DROP POLICY IF EXISTS student_sees_own ON project_submissions;--> statement-breakpoint
CREATE POLICY student_sees_own ON project_submissions FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DROP POLICY IF EXISTS faculty_sees_tenant ON project_submissions;--> statement-breakpoint
CREATE POLICY faculty_sees_tenant ON project_submissions FOR SELECT TO app_faculty
	USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS faculty_moderates_tenant ON project_submissions;--> statement-breakpoint
CREATE POLICY faculty_moderates_tenant ON project_submissions FOR UPDATE TO app_faculty
	USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
	WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

-- 5. audit_log append-only twardo (trigger blokuje UPDATE/DELETE nawet dla ownera)
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'audit_log jest append-only — % zabronione', TG_OP;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_update_delete ON audit_log;--> statement-breakpoint
CREATE TRIGGER audit_log_no_update_delete
	BEFORE UPDATE OR DELETE ON audit_log
	FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();--> statement-breakpoint

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS audit_log_no_update_delete ON audit_log;
-- DROP FUNCTION IF EXISTS audit_log_append_only();
-- ALTER TABLE students/competencies/gaps/skill_maps/passports/project_submissions
--   /faculty_sessions/audit_log/"user"/session/account/verification DISABLE ROW LEVEL SECURITY;
-- DROP POLICY ... (student_sees_own/faculty_sees_tenant/faculty_moderates_tenant na każdej tabeli)
-- REVOKE app_student, app_faculty FROM CURRENT_USER; DROP ROLE app_student, app_faculty;
-- ALTER TABLE faculty_sessions DROP COLUMN tenant_id;