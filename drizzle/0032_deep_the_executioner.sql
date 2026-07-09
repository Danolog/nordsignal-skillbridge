CREATE TABLE "viva_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"content" text NOT NULL,
	"verdict_json" jsonb,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viva_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"questions_json" jsonb NOT NULL,
	"result_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "viva_sessions_status_values" CHECK ("viva_sessions"."status" IN ('pending','in_progress','passed','failed','inconclusive','expired','superseded'))
);
--> statement-breakpoint
ALTER TABLE "viva_answers" ADD CONSTRAINT "viva_answers_session_id_viva_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."viva_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viva_answers" ADD CONSTRAINT "viva_answers_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viva_answers" ADD CONSTRAINT "viva_answers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viva_sessions" ADD CONSTRAINT "viva_sessions_submission_id_project_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."project_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viva_sessions" ADD CONSTRAINT "viva_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viva_sessions" ADD CONSTRAINT "viva_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_viva_answers_session_id" ON "viva_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_viva_answers_tenant_id" ON "viva_answers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_viva_answers_session_position" ON "viva_answers" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "idx_viva_sessions_submission_id" ON "viva_sessions" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "idx_viva_sessions_student_id" ON "viva_sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_viva_sessions_tenant_id" ON "viva_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_viva_sessions_active" ON "viva_sessions" USING btree ("submission_id") WHERE "viva_sessions"."status" IN ('pending','in_progress');--> statement-breakpoint

-- ============================================================================
-- B7/1.16a RLS (ADR-013 D3) — sekcja DOPISANA RĘCZNIE (drizzle-kit nie
-- generuje RLS). Wzorzec 0030 (assessment_sessions/answers):
--  - viva_sessions: grant TYLKO SELECT dla app_student (zapisy owner-side
--    przez trasy), student_sees_own FOR SELECT, ENABLE+FORCE+owner_passthrough;
--  - viva_answers: wariant DENY — ZERO grantów app_* (surowe odpowiedzi czyta
--    serwer/recenzent przez trasę z audytem; strażnik k3 #13a), ENABLE+FORCE+
--    owner_passthrough dla spójności klasy.
-- app_faculty bez grantu na obu (treść obrony prywatna; kolejka B8 dostaje
-- projekcję aiReviewJson.viva i dedykowaną trasę odczytu).
-- ============================================================================

-- 1. Granty: sessions SELECT-only dla studenta; answers bez grantów.
GRANT SELECT ON viva_sessions TO app_student;--> statement-breakpoint
REVOKE ALL ON viva_sessions FROM app_faculty;--> statement-breakpoint
REVOKE ALL ON viva_answers FROM app_student, app_faculty;--> statement-breakpoint

-- 2. ENABLE + FORCE RLS
ALTER TABLE viva_sessions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE viva_sessions FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE viva_answers  ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE viva_answers  FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- 3. student_sees_own FOR SELECT na sessions (deny-default bez current_user_id).
DROP POLICY IF EXISTS student_sees_own ON viva_sessions;--> statement-breakpoint
CREATE POLICY student_sees_own ON viva_sessions FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

-- 4. owner_passthrough (ADR-005) na obu tabelach.
DO $$
DECLARE
	tbl text;
	owner_name text := current_user;
	tbls text[] := ARRAY['viva_sessions','viva_answers'];
BEGIN
	FOREACH tbl IN ARRAY tbls LOOP
		EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON %I', tbl);
		EXECUTE format(
			'CREATE POLICY owner_passthrough ON %I FOR ALL TO %I USING (true) WITH CHECK (true)',
			tbl, owner_name
		);
	END LOOP;
END $$;
