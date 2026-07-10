CREATE TABLE "study_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"hours_actual" smallint,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_checkins_hours_range" CHECK ("study_checkins"."hours_actual" IS NULL OR "study_checkins"."hours_actual" BETWEEN 0 AND 120)
);
--> statement-breakpoint
CREATE TABLE "study_rhythms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"hours_per_week" smallint NOT NULL,
	"days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_project_id" uuid,
	"module_ref" text,
	"stagnation_opt_out" boolean DEFAULT false NOT NULL,
	"stagnation_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_rhythms_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "study_rhythms_hours_range" CHECK ("study_rhythms"."hours_per_week" BETWEEN 1 AND 80)
);
--> statement-breakpoint
ALTER TABLE "study_checkins" ADD CONSTRAINT "study_checkins_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_checkins" ADD CONSTRAINT "study_checkins_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_rhythms" ADD CONSTRAINT "study_rhythms_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_rhythms" ADD CONSTRAINT "study_rhythms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_rhythms" ADD CONSTRAINT "study_rhythms_active_project_id_projects_id_fk" FOREIGN KEY ("active_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_study_checkins_student_id" ON "study_checkins" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_study_checkins_tenant_id" ON "study_checkins" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_study_checkins_week" ON "study_checkins" USING btree ("student_id","week_start");--> statement-breakpoint
CREATE INDEX "idx_study_rhythms_tenant_id" ON "study_rhythms" USING btree ("tenant_id");
--> statement-breakpoint
-- ============================================================================
-- 1.18: RLS dla study_rhythms + study_checkins — pełny wzorzec 0030:
-- grant TYLKO SELECT app_student (zapisy owner-side przez /api/rhythm/*),
-- app_faculty bez grantu; ENABLE+FORCE + student_sees_own + owner_passthrough.
-- ============================================================================
GRANT SELECT ON study_rhythms  TO app_student;--> statement-breakpoint
GRANT SELECT ON study_checkins TO app_student;--> statement-breakpoint
REVOKE ALL ON study_rhythms  FROM app_faculty;--> statement-breakpoint
REVOKE ALL ON study_checkins FROM app_faculty;--> statement-breakpoint
ALTER TABLE study_rhythms  ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE study_rhythms  FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE study_checkins ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE study_checkins FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY student_sees_own ON study_rhythms FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
CREATE POLICY student_sees_own ON study_checkins FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
	FOREACH t IN ARRAY ARRAY['study_rhythms','study_checkins'] LOOP
		IF NOT EXISTS (
			SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'owner_passthrough'
		) THEN
			EXECUTE format(
				'CREATE POLICY owner_passthrough ON %I FOR ALL TO %I USING (true) WITH CHECK (true)',
				t, current_user
			);
		END IF;
	END LOOP;
END $$;
