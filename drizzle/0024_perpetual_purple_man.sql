CREATE TABLE "advisor_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advisor_memory_kind" CHECK ("advisor_memory"."kind" IN ('summary'))
);
--> statement-breakpoint
ALTER TABLE "advisor_memory" ADD CONSTRAINT "advisor_memory_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_memory" ADD CONSTRAINT "advisor_memory_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_memory" ADD CONSTRAINT "advisor_memory_session_id_career_helper_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."career_helper_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_advisor_memory_student_id" ON "advisor_memory" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_advisor_memory_tenant_id" ON "advisor_memory" USING btree ("tenant_id");--> statement-breakpoint
-- ============================================================================
-- AG.7 — RLS dla advisor_memory (sekcja ręczna, NIE generowana przez drizzle-kit).
-- Wzorzec: 0013 (career_helper_*): GRANT tylko app_student + ENABLE/FORCE +
-- student_sees_own + owner_passthrough (ADR-005). app_faculty CELOWO bez grantu —
-- pamięć doradcy to prywatny kontekst studenta (jak career_helper_turns).
-- ============================================================================

-- 1. Grant tabelowy — tylko app_student (RLS filtruje wiersze).
GRANT SELECT, INSERT, UPDATE, DELETE ON advisor_memory TO app_student;--> statement-breakpoint

-- 2. ENABLE + FORCE RLS
ALTER TABLE advisor_memory ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE advisor_memory FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- 3. Polityka student_sees_own (deny-default przy braku app.current_user_id)
DROP POLICY IF EXISTS student_sees_own ON advisor_memory;--> statement-breakpoint
CREATE POLICY student_sees_own ON advisor_memory FOR ALL TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)))
	WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

-- 4. owner_passthrough (jak 0012/0013, ADR-005)
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON advisor_memory';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON advisor_memory FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;

-- ROLLBACK:
-- DROP POLICY IF EXISTS owner_passthrough ON advisor_memory;
-- DROP POLICY IF EXISTS student_sees_own ON advisor_memory;
-- DROP TABLE advisor_memory;
