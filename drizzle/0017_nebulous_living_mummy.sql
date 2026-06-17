ALTER TABLE "students" ADD COLUMN "onboarding_step" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_onboarding_step_range" CHECK ("students"."onboarding_step" BETWEEN 0 AND 5);

-- ============================================================================
-- GRANT/RLS — onboarding_step (high-water-mark wznawiania onboardingu)
--
-- DECYZJA: ŻADEN dodatkowy GRANT nie jest potrzebny. Dowód z migracji 0008:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON
--     students, competencies, gaps, skill_maps, passports, project_submissions
--     TO app_student;            (0008_faculty_tenant_and_rls.sql L30–32)
--   GRANT SELECT ON
--     students, ... TO app_faculty;  (0008 L33–34)
-- Grant na `students` dla app_student jest TABELOWY (cała tabela), nie kolumnowy.
-- Postgres: GRANT na poziomie tabeli obejmuje kolumny dodane PÓŹNIEJ — nowy
-- onboarding_step dziedziczy SELECT/INSERT/UPDATE/DELETE automatycznie.
--
-- KONTRAST z 0014 (self_assessment): TAM grant app_faculty na competencies jest
-- KOLUMNOWY (0014 L28–29: GRANT SELECT (id, student_id, ...) ON competencies),
-- bo izolujemy prywatną samoocenę przed faculty (decyzja Darka 2026-05-27).
-- Tu odwrotnie: students.onboarding_step to zwykły znacznik kroku (0–5), nie dane
-- wrażliwe. app_faculty czyta już university/field_of_study/career_goal/semester
-- przez ten sam tabelowy SELECT — onboarding_step nie zmienia powierzchni izolacji.
-- RLS bez zmian: students.student_sees_own (po user_id) i faculty_sees_tenant
-- (po tenant_id) działają na całym wierszu, niezależnie od liczby kolumn (0008 L59–65).
--
-- ROLLBACK (instrukcja dla operatora — NIE wykonywać automatycznie):
--   ALTER TABLE students DROP CONSTRAINT IF EXISTS students_onboarding_step_range;
--   ALTER TABLE students DROP COLUMN IF EXISTS onboarding_step;
-- ============================================================================