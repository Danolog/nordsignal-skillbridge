CREATE TABLE "assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"question_item_id" uuid NOT NULL,
	"answer_json" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"position" smallint NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"career_goal" text,
	"input_hash" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"plan_json" jsonb NOT NULL,
	"result_json" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "assessment_sessions_kind_values" CHECK ("assessment_sessions"."kind" IN ('diagnostic')),
	CONSTRAINT "assessment_sessions_status_values" CHECK ("assessment_sessions"."status" IN ('in_progress','completed','abandoned'))
);
--> statement-breakpoint
CREATE TABLE "question_concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"trunk" text NOT NULL,
	"competency_name" text,
	"diagnostic" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_concepts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "question_concepts_trunk_values" CHECK ("question_concepts"."trunk" IN ('market','foundations')),
	CONSTRAINT "question_concepts_market_has_competency" CHECK ("question_concepts"."trunk" <> 'market' OR "question_concepts"."competency_name" IS NOT NULL),
	CONSTRAINT "question_concepts_status_values" CHECK ("question_concepts"."status" IN ('active','retired'))
);
--> statement-breakpoint
CREATE TABLE "question_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept_id" uuid NOT NULL,
	"difficulty" smallint NOT NULL,
	"type" text NOT NULL,
	"stem" text NOT NULL,
	"options_json" jsonb,
	"answer_json" jsonb NOT NULL,
	"explanation_md" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_items_difficulty_range" CHECK ("question_items"."difficulty" BETWEEN 1 AND 3),
	CONSTRAINT "question_items_type_values" CHECK ("question_items"."type" IN ('single_choice','multi_choice','numeric','short_text')),
	CONSTRAINT "question_items_status_values" CHECK ("question_items"."status" IN ('active','retired'))
);
--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_session_id_assessment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_item_id_question_items_id_fk" FOREIGN KEY ("question_item_id") REFERENCES "public"."question_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_items" ADD CONSTRAINT "question_items_concept_id_question_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."question_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assessment_answers_session_id" ON "assessment_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_answers_tenant_id" ON "assessment_answers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessment_answers_session_item" ON "assessment_answers" USING btree ("session_id","question_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessment_answers_session_position" ON "assessment_answers" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "idx_assessment_sessions_student_id" ON "assessment_sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_sessions_tenant_id" ON "assessment_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_question_items_concept_difficulty" ON "question_items" USING btree ("concept_id","difficulty");--> statement-breakpoint
-- ============================================================================
-- A5/1.11 — sekcja RĘCZNA (NIE generowana przez drizzle-kit).
-- Spec: docs/design/skillbridge-a5-bank-pytan-diagnoza-spec-v0.2.md §3
-- (ZATWIERDZONE Darek 2026-07-08); rls-matrix v0.21.
--
-- 1) Bank pytań (question_concepts, question_items): wariant DENY jak
--    project_hidden_tests (0028) — zero grantów ról aplikacyjnych; answer_json
--    to sekret przed studentem (memoryzacja przed mastery gate 1E.3). Pytania
--    serwuje wyłącznie API per sesja (owner); strażnik: k3-validate #13a.
-- 2) assessment_sessions: grant TYLKO SELECT dla app_student (wzorzec 0025 —
--    market_new_gap_events); zapisy wyłącznie owner-side przez trasy API.
--    FORCE RLS + student_sees_own + owner_passthrough (TENANT_TABLES w k3).
-- 3) assessment_answers: dane tenant-owe w wariancie DENY — zero grantów
--    app_* (student dostaje result_json sesji, nie surowe odpowiedzi);
--    RLS+FORCE+owner_passthrough dla spójności klasy (TENANT_TABLES).
-- 4) Partial unique: jedna aktywna sesja per (student, kind) — drizzle-kit
--    nie generuje UNIQUE z WHERE.
-- ============================================================================

-- 1. Bank — deny-by-default (REVOKE defensywnie; świeże tabele i tak bez grantów).
REVOKE ALL ON question_concepts, question_items FROM app_student, app_faculty;--> statement-breakpoint

-- 2. assessment_sessions — SELECT-only + pełny wzorzec RLS.
GRANT SELECT ON assessment_sessions TO app_student;--> statement-breakpoint
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE assessment_sessions FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS student_sees_own ON assessment_sessions;--> statement-breakpoint
CREATE POLICY student_sees_own ON assessment_sessions FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON assessment_sessions';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON assessment_sessions FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;--> statement-breakpoint

-- 3. assessment_answers — DENY (zero grantów) + RLS dla spójności klasy tenant.
REVOKE ALL ON assessment_answers FROM app_student, app_faculty;--> statement-breakpoint
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE assessment_answers FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON assessment_answers';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON assessment_answers FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;--> statement-breakpoint

-- 4. Jedna aktywna sesja per (student, kind).
CREATE UNIQUE INDEX uq_assessment_sessions_active
	ON assessment_sessions (student_id, kind) WHERE status = 'in_progress';

-- ROLLBACK:
-- DROP INDEX IF EXISTS uq_assessment_sessions_active;
-- DROP POLICY IF EXISTS owner_passthrough ON assessment_answers;
-- DROP POLICY IF EXISTS owner_passthrough ON assessment_sessions;
-- DROP POLICY IF EXISTS student_sees_own ON assessment_sessions;
-- DROP TABLE assessment_answers; DROP TABLE assessment_sessions;
-- DROP TABLE question_items; DROP TABLE question_concepts;
