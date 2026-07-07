CREATE TABLE "market_new_gap_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid,
	"competency_name" text NOT NULL,
	"priority" text NOT NULL,
	"market_percentage" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"notified_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "market_refresh_runs" ADD COLUMN "recompute" jsonb;--> statement-breakpoint
ALTER TABLE "market_new_gap_events" ADD CONSTRAINT "market_new_gap_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_new_gap_events" ADD CONSTRAINT "market_new_gap_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_new_gap_events" ADD CONSTRAINT "market_new_gap_events_run_id_market_refresh_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."market_refresh_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_market_new_gap_events_student_id" ON "market_new_gap_events" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_market_new_gap_events_tenant_id" ON "market_new_gap_events" USING btree ("tenant_id");--> statement-breakpoint
-- ============================================================================
-- AG.5 — RLS dla market_new_gap_events (sekcja ręczna, NIE generowana).
-- Wzorzec: 0024 (advisor_memory) z jedną różnicą — student dostaje TYLKO SELECT
-- (zdarzenia pisze wyłącznie server-side recompute jako owner; AG.6 oznaczy
-- notified_at też jako owner). app_faculty CELOWO bez grantu (dane studenta).
-- ============================================================================

-- 1. Grant tabelowy — tylko app_student, tylko odczyt (RLS filtruje wiersze).
GRANT SELECT ON market_new_gap_events TO app_student;--> statement-breakpoint

-- 2. ENABLE + FORCE RLS
ALTER TABLE market_new_gap_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE market_new_gap_events FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- 3. Polityka student_sees_own (deny-default przy braku app.current_user_id)
DROP POLICY IF EXISTS student_sees_own ON market_new_gap_events;--> statement-breakpoint
CREATE POLICY student_sees_own ON market_new_gap_events FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint

-- 4. owner_passthrough (jak 0012/0013/0024, ADR-005)
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON market_new_gap_events';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON market_new_gap_events FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;

-- ROLLBACK:
-- DROP POLICY IF EXISTS owner_passthrough ON market_new_gap_events;
-- DROP POLICY IF EXISTS student_sees_own ON market_new_gap_events;
-- DROP TABLE market_new_gap_events;
-- ALTER TABLE market_refresh_runs DROP COLUMN recompute;
