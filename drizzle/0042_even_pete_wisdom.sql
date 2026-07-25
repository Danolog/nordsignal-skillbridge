CREATE TABLE "review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"question_item_id" uuid,
	"rating" smallint NOT NULL,
	"state_before" text NOT NULL,
	"stability_before" double precision,
	"stability_after" double precision NOT NULL,
	"difficulty_after" double precision NOT NULL,
	"elapsed_days" double precision NOT NULL,
	"scheduled_days" double precision NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_logs_rating_range" CHECK ("review_logs"."rating" BETWEEN 1 AND 4),
	CONSTRAINT "review_logs_elapsed_nonneg" CHECK ("review_logs"."elapsed_days" >= 0),
	CONSTRAINT "review_logs_scheduled_nonneg" CHECK ("review_logs"."scheduled_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "review_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"last_review" timestamp with time zone,
	"state" text DEFAULT 'new' NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_states_state_values" CHECK ("review_states"."state" IN ('new','learning','review','relearning')),
	CONSTRAINT "review_states_difficulty_range" CHECK ("review_states"."difficulty" BETWEEN 1 AND 10),
	CONSTRAINT "review_states_stability_positive" CHECK ("review_states"."stability" > 0),
	CONSTRAINT "review_states_reps_nonneg" CHECK ("review_states"."reps" >= 0),
	CONSTRAINT "review_states_lapses_nonneg" CHECK ("review_states"."lapses" >= 0)
);
--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_concept_id_question_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."question_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_question_item_id_question_items_id_fk" FOREIGN KEY ("question_item_id") REFERENCES "public"."question_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_concept_id_question_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."question_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_review_logs_student_reviewed" ON "review_logs" USING btree ("student_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "idx_review_logs_tenant_id" ON "review_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_review_states_student_concept" ON "review_states" USING btree ("student_id","concept_id");--> statement-breakpoint
CREATE INDEX "idx_review_states_student_due" ON "review_states" USING btree ("student_id","due");--> statement-breakpoint
CREATE INDEX "idx_review_states_tenant_id" ON "review_states" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_review_states_concept_id" ON "review_states" USING btree ("concept_id");--> statement-breakpoint

-- ============================================================================
-- 1E.4 (SLICE R1) — sekcja RĘCZNA (NIE generowana przez drizzle-kit).
-- Powtórki rozłożone w czasie (FSRS). Jednostka = KONCEPT; stan per
-- student × koncept. Wzorzec RLS jak 0025/0030 (rls-matrix §3). Wszystkie
-- zapisy owner-side (rola app_student dostaje TYLKO SELECT na review_states,
-- ZERO praw na review_logs) — korekta z self-critique Ethana.
--
-- 1) review_states: grant TYLKO SELECT dla app_student (student widzi swój
--    stan „co na dziś"); zapisy wyłącznie owner-side przez trasy /api/review/*
--    (R4). FORCE RLS + student_sees_own + owner_passthrough (TENANT_TABLES w k3).
-- 2) review_logs: wariant DENY-both (zero grantów app_student ORAZ app_faculty,
--    strażnik k3 #13a) jak assessment_answers/viva_answers — surowy ślad ocen
--    służy silnikowi/kalibracji, nie klientowi; RLS+FORCE+owner_passthrough dla
--    spójności klasy tenant. APPEND-ONLY. (NIE jak curriculum_item_answers —
--    tamta ma GRANT SELECT app_student.)
--
-- Migracja CZYSTO ADDYTYWNA (CREATE TABLE + GRANT + RLS) — zero DROP/DELETE.
-- Flaga FLAG_SPACED_REPETITION domyślnie OFF → 0 wierszy w obu tabelach.
-- ============================================================================

-- 1. review_states — SELECT-only dla studenta + pełny wzorzec RLS.
GRANT SELECT ON review_states TO app_student;--> statement-breakpoint
ALTER TABLE review_states ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE review_states FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS student_sees_own ON review_states;--> statement-breakpoint
CREATE POLICY student_sees_own ON review_states FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON review_states';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON review_states FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;--> statement-breakpoint

-- 2. review_logs — DENY (zero grantów app_*) + RLS dla spójności klasy tenant.
REVOKE ALL ON review_logs FROM app_student, app_faculty;--> statement-breakpoint
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE review_logs FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON review_logs';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON review_logs FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;

-- ROLLBACK:
-- DROP POLICY IF EXISTS owner_passthrough ON review_logs;
-- DROP POLICY IF EXISTS owner_passthrough ON review_states;
-- DROP POLICY IF EXISTS student_sees_own ON review_states;
-- DROP TABLE review_logs; DROP TABLE review_states;