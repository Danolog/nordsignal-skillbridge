CREATE TABLE "project_reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"answer_surprised" text,
	"answer_frustrated" text,
	"answer_learned" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_reflections" ADD CONSTRAINT "project_reflections_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reflections" ADD CONSTRAINT "project_reflections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reflections" ADD CONSTRAINT "project_reflections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reflections" ADD CONSTRAINT "project_reflections_submission_id_project_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."project_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_reflections_student_id" ON "project_reflections" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_project_reflections_tenant_id" ON "project_reflections" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_reflections_submission" ON "project_reflections" USING btree ("submission_id");--> statement-breakpoint

-- ============================================================================
-- B5 RLS — sekcja DOPISANA RĘCZNIE (drizzle-kit nie generuje RLS/GRANT).
-- Wzorzec: 0008 (ENABLE + role grupowe + student_sees_own) + 0012 (FORCE +
-- owner_passthrough) + 0013 (B0, te same prywatne dane studenta).
-- ADR-003 (WHERE primary + RLS defense-in-depth) · ADR-005 (FORCE +
-- owner_passthrough) · rls-matrix.md.
--
-- Decyzja schematu (Ethan, 2026-05-31, §B5.1): project_reflections to PRYWATNE
-- dane studenta. Grant TYLKO app_student. app_faculty CELOWO bez żadnego grantu
-- i bez polityki faculty_sees_tenant — wykładowca fizycznie nie ma wstępu
-- (deny-by-default = prywatność R1, PRD US-B5.1 KA5, spec §4.6). To NIE panel
-- wykładowcy. Refleksje nigdy nie trafiają do paszportu ani do faculty.
--
-- FORCE + owner_passthrough spójnie z 6 tabelami studenta z 0012 i 3 tabelami
-- B0 z 0013 — inaczej k3-validate test #10 (relforcerowsecurity na tabelach
-- studenta) byłby niespójny, a seed/owner-bypass działałby inaczej niż reszta.
-- ============================================================================

-- 1. Granty tabelowe — tylko app_student (RLS filtruje wiersze; GRANT daje dostęp
--    do tabeli w ogóle). app_faculty: brak grantu = brak dostępu (R1 prywatność).
GRANT SELECT, INSERT, UPDATE, DELETE ON project_reflections TO app_student;--> statement-breakpoint

-- 2. ENABLE + FORCE RLS
ALTER TABLE project_reflections ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE project_reflections FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- 3. Polityka student_sees_own — przez student_id (podzapytanie na students
--    respektuje RLS -> zwraca tylko własny id). current_setting(...,true) = NULL
--    gdy nieustawione -> 0 wierszy (deny-default). Ustawiane przez withTenantContext.
DROP POLICY IF EXISTS student_sees_own ON project_reflections;--> statement-breakpoint
CREATE POLICY student_sees_own ON project_reflections FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

-- 4. owner_passthrough (jak 0012/0013/ADR-005) — owner ma explicit, audytowalny
--    passthrough. format(... %I, current_user) wstawia nazwę bieżącego ownera
--    (prod: neondb_owner; CI: test) z escapingiem. CREATE POLICY nie przyjmuje
--    TO CURRENT_USER (wymaga literału roli), stąd dynamiczne EXECUTE.
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON project_reflections');
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON project_reflections FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;--> statement-breakpoint

-- BRAK polityki faculty_sees_tenant — wykładowca nie ma wstępu (R1).

-- ROLLBACK:
-- DO $$ BEGIN
--   EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON project_reflections');
-- END $$;
-- DROP POLICY IF EXISTS student_sees_own ON project_reflections;
-- DROP TABLE project_reflections;