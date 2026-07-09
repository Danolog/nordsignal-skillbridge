CREATE TYPE "public"."tutor_turn_role" AS ENUM('ai', 'user');--> statement-breakpoint
CREATE TABLE "tutor_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"role" "tutor_turn_role" NOT NULL,
	"content" text NOT NULL,
	"turn_index" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tutor_turns" ADD CONSTRAINT "tutor_turns_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_turns" ADD CONSTRAINT "tutor_turns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_turns" ADD CONSTRAINT "tutor_turns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tutor_turns_student_project" ON "tutor_turns" USING btree ("student_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_tutor_turns_tenant_id" ON "tutor_turns" USING btree ("tenant_id");--> statement-breakpoint

-- ============================================================================
-- C11/1.13 RLS — sekcja DOPISANA RĘCZNIE (drizzle-kit nie generuje RLS).
-- Wzorzec 0013 (Pomocnik): ENABLE + FORCE + student_sees_own + owner_passthrough.
--
-- Klasa danych: PRYWATNA rozmowa studenta z tutorem (jak career_helper_turns /
-- project_reflections / advisor_memory). Grant TYLKO app_student. app_faculty
-- CELOWO bez żadnego grantu i bez polityki faculty_sees_tenant — wykładowca
-- fizycznie nie ma wstępu (deny-by-default). To NIE panel wykładowcy.
-- ============================================================================

-- 1. Grant tabelowy — tylko app_student (RLS filtruje wiersze; GRANT daje
--    dostęp do tabeli w ogóle). app_faculty: brak grantu = brak dostępu.
GRANT SELECT, INSERT, UPDATE, DELETE ON tutor_turns TO app_student;--> statement-breakpoint

-- 2. ENABLE + FORCE RLS
ALTER TABLE tutor_turns ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE tutor_turns FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- 3. Polityka student_sees_own — przez student_id (podzapytanie na students
--    respektuje RLS -> zwraca tylko własny id). current_setting(...,true) = NULL
--    gdy nieustawione -> 0 wierszy (deny-default). Ustawiane przez withTenantContext.
DROP POLICY IF EXISTS student_sees_own ON tutor_turns;--> statement-breakpoint
CREATE POLICY student_sees_own ON tutor_turns FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

-- 4. owner_passthrough (jak 0012/ADR-005) — owner ma explicit, audytowalny
--    passthrough. format(... %I, current_user) wstawia nazwę bieżącego ownera
--    (prod: neondb_owner; CI: test) z escapingiem.
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON tutor_turns';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON tutor_turns FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;
