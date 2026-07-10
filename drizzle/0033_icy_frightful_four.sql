CREATE TABLE "placement_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"employment_status" text,
	"career_aligned" boolean,
	"occurred_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_events_kind_values" CHECK ("placement_events"."kind" IN ('baseline','internship','job','job_change','job_lost')),
	CONSTRAINT "placement_events_employment_status_values" CHECK ("placement_events"."employment_status" IS NULL OR "placement_events"."employment_status" IN ('studying','working_in_field','working_outside','seeking'))
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "placement_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "placement_decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "placement_events" ADD CONSTRAINT "placement_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_events" ADD CONSTRAINT "placement_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_placement_events_student_id" ON "placement_events" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_placement_events_tenant_id" ON "placement_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_placement_events_baseline" ON "placement_events" USING btree ("student_id") WHERE "placement_events"."kind" = 'baseline';
--> statement-breakpoint
-- ============================================================================
-- 1.17: RLS dla placement_events — pełny wzorzec 0030/0032:
--  1. grant TYLKO SELECT dla app_student (zapisy owner-side przez trasy
--     /api/placement/*), app_faculty bez grantu (agregaty E2.H owner-side);
--  2. ENABLE + FORCE (FORCE = właściciel też przechodzi przez polityki,
--     stąd owner_passthrough);
--  3. student_sees_own FOR SELECT — student widzi wyłącznie swoje zdarzenia.
-- ============================================================================
GRANT SELECT ON placement_events TO app_student;--> statement-breakpoint
REVOKE ALL ON placement_events FROM app_faculty;--> statement-breakpoint
ALTER TABLE placement_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE placement_events FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY student_sees_own ON placement_events FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE tablename = 'placement_events' AND policyname = 'owner_passthrough'
	) THEN
		EXECUTE format(
			'CREATE POLICY owner_passthrough ON %I FOR ALL TO %I USING (true) WITH CHECK (true)',
			'placement_events', current_user
		);
	END IF;
END $$;
