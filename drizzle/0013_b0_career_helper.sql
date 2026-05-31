CREATE TYPE "public"."career_helper_session_status" AS ENUM('in_progress', 'completed', 'interrupted', 'restarted');--> statement-breakpoint
CREATE TYPE "public"."career_helper_turn_role" AS ENUM('ai', 'user');--> statement-breakpoint
CREATE TABLE "career_helper_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" "career_helper_session_status" DEFAULT 'in_progress' NOT NULL,
	"turn" smallint DEFAULT 0 NOT NULL,
	"answers" jsonb NOT NULL,
	"restart_count" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_helper_sessions_turn_range" CHECK ("career_helper_sessions"."turn" BETWEEN 0 AND 9)
);
--> statement-breakpoint
CREATE TABLE "career_helper_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" "career_helper_turn_role" NOT NULL,
	"content" text NOT NULL,
	"turn_index" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_career_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid,
	"label" text NOT NULL,
	"why" text,
	"probability" real,
	"source" text DEFAULT 'helper' NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_career_paths_source" CHECK ("student_career_paths"."source" IN ('helper'))
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "career_helper_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "career_helper_sessions" ADD CONSTRAINT "career_helper_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_helper_sessions" ADD CONSTRAINT "career_helper_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_helper_turns" ADD CONSTRAINT "career_helper_turns_session_id_career_helper_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."career_helper_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_helper_turns" ADD CONSTRAINT "career_helper_turns_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_helper_turns" ADD CONSTRAINT "career_helper_turns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_career_paths" ADD CONSTRAINT "student_career_paths_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_career_paths" ADD CONSTRAINT "student_career_paths_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_career_paths" ADD CONSTRAINT "student_career_paths_session_id_career_helper_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."career_helper_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_career_helper_sessions_student_id" ON "career_helper_sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_career_helper_sessions_tenant_id" ON "career_helper_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_career_helper_turns_session_id" ON "career_helper_turns" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_career_helper_turns_student_id" ON "career_helper_turns" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_career_helper_turns_tenant_id" ON "career_helper_turns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_student_career_paths_student_id" ON "student_career_paths" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_student_career_paths_tenant_id" ON "student_career_paths" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_student_career_paths_primary" ON "student_career_paths" USING btree ("student_id") WHERE "student_career_paths"."is_primary" = true;--> statement-breakpoint

-- ============================================================================
-- B0 RLS — sekcja DOPISANA RĘCZNIE (drizzle-kit nie generuje RLS).
-- Wzorzec: 0008 (ENABLE + role grupowe + student_sees_own) + 0012 (FORCE +
-- owner_passthrough). ADR-003 (WHERE primary + RLS defense-in-depth) ·
-- ADR-005 (FORCE + owner_passthrough) · rls-matrix.md.
--
-- Decyzja schematu (Ethan, 2026-05-31): trzy tabele Pomocnika to PRYWATNE dane
-- studenta. Grant TYLKO app_student. app_faculty CELOWO bez żadnego grantu i bez
-- polityki faculty_sees_tenant — wykładowca fizycznie nie ma wstępu (deny-by-
-- default), tak jak project_reflections (B5). To NIE panel wykładowcy.
--
-- FORCE + owner_passthrough spójnie z 6 tabelami studenta z 0012 — inaczej
-- k3-validate test #10 (relforcerowsecurity na tabelach studenta) byłby
-- niespójny, a seed/owner-bypass działałby inaczej niż na reszcie.
-- ============================================================================

-- 1. Granty tabelowe — tylko app_student (RLS filtruje wiersze; GRANT daje dostęp
--    do tabeli w ogóle). app_faculty: brak grantu = brak dostępu.
GRANT SELECT, INSERT, UPDATE, DELETE ON
	career_helper_sessions, career_helper_turns, student_career_paths
	TO app_student;--> statement-breakpoint

-- 2. ENABLE + FORCE RLS na trzech nowych tabelach studenta
ALTER TABLE career_helper_sessions  ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE career_helper_sessions  FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE career_helper_turns     ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE career_helper_turns     FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE student_career_paths    ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE student_career_paths    FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- 3. Polityki student_sees_own — przez student_id (podzapytanie na students
--    respektuje RLS -> zwraca tylko własny id). current_setting(...,true) = NULL
--    gdy nieustawione -> 0 wierszy (deny-default). Ustawiane przez withTenantContext.
DROP POLICY IF EXISTS student_sees_own ON career_helper_sessions;--> statement-breakpoint
CREATE POLICY student_sees_own ON career_helper_sessions FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

DROP POLICY IF EXISTS student_sees_own ON career_helper_turns;--> statement-breakpoint
CREATE POLICY student_sees_own ON career_helper_turns FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

DROP POLICY IF EXISTS student_sees_own ON student_career_paths;--> statement-breakpoint
CREATE POLICY student_sees_own ON student_career_paths FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

-- 4. owner_passthrough (jak 0012/ADR-005) — owner ma explicit, audytowalny
--    passthrough na każdej z trzech tabel. format(... %I, current_user) wstawia
--    nazwę bieżącego ownera (prod: neondb_owner; CI: test) z escapingiem.
DO $$
DECLARE
	tbl text;
	owner_name text := current_user;
	tbls text[] := ARRAY['career_helper_sessions','career_helper_turns','student_career_paths'];
BEGIN
	FOREACH tbl IN ARRAY tbls LOOP
		EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON %I', tbl);
		EXECUTE format(
			'CREATE POLICY owner_passthrough ON %I FOR ALL TO %I USING (true) WITH CHECK (true)',
			tbl, owner_name
		);
	END LOOP;
END $$;--> statement-breakpoint

-- ROLLBACK:
-- DO $$ DECLARE tbl text; BEGIN
--   FOREACH tbl IN ARRAY ARRAY['career_helper_sessions','career_helper_turns','student_career_paths'] LOOP
--     EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON %I', tbl);
--     EXECUTE format('DROP POLICY IF EXISTS student_sees_own ON %I', tbl);
--   END LOOP;
-- END $$;
-- DROP TABLE student_career_paths;
-- DROP TABLE career_helper_turns;
-- DROP TABLE career_helper_sessions;
-- DROP TYPE career_helper_turn_role;
-- DROP TYPE career_helper_session_status;
-- ALTER TABLE students DROP COLUMN career_helper_completed_at;