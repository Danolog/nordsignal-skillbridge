CREATE TABLE "curriculum_item_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"question_item_id" uuid NOT NULL,
	"is_correct" boolean NOT NULL,
	"hint_depth" smallint DEFAULT 0 NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_item_answers_hint_depth_range" CHECK ("curriculum_item_answers"."hint_depth" BETWEEN 0 AND 3)
);
--> statement-breakpoint
CREATE TABLE "curriculum_item_concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_item_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"status" text DEFAULT 'locked' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_answer_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_item_progress_status_values" CHECK ("curriculum_item_progress"."status" IN ('locked','available','in_progress','completed','skipped_by_placement'))
);
--> statement-breakpoint
CREATE TABLE "curriculum_item_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"license" text,
	"language" text,
	"registration_required" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_item_resources_type_values" CHECK ("curriculum_item_resources"."type" IN ('video','docs','course','book'))
);
--> statement-breakpoint
CREATE TABLE "curriculum_module_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content_md" text,
	"project_id" uuid,
	"config_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_module_items_kind_values" CHECK ("curriculum_module_items"."kind" IN ('theory','exercise','lab','project','exam','review')),
	CONSTRAINT "curriculum_module_items_project_ref" CHECK ("curriculum_module_items"."kind" <> 'project' OR "curriculum_module_items"."project_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "curriculum_module_prereqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"requires_module_id" uuid NOT NULL,
	CONSTRAINT "curriculum_module_prereqs_no_self" CHECK ("curriculum_module_prereqs"."module_id" <> "curriculum_module_prereqs"."requires_module_id")
);
--> statement-breakpoint
CREATE TABLE "curriculum_module_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"status" text DEFAULT 'locked' NOT NULL,
	"verified_by_method" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_module_progress_status_values" CHECK ("curriculum_module_progress"."status" IN ('locked','available','in_progress','completed')),
	CONSTRAINT "curriculum_module_progress_method_values" CHECK ("curriculum_module_progress"."verified_by_method" IS NULL OR "curriculum_module_progress"."verified_by_method" IN ('exam','diagnostic','test_out'))
);
--> statement-breakpoint
CREATE TABLE "curriculum_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"exam_config_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_modules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "curriculum_path_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path_key" text NOT NULL,
	"module_id" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_learning_resources" ADD COLUMN "license" text;--> statement-breakpoint
ALTER TABLE "project_learning_resources" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "project_learning_resources" ADD COLUMN "registration_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_learning_resources" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "curriculum_item_answers" ADD CONSTRAINT "curriculum_item_answers_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_answers" ADD CONSTRAINT "curriculum_item_answers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_answers" ADD CONSTRAINT "curriculum_item_answers_item_id_curriculum_module_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."curriculum_module_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_answers" ADD CONSTRAINT "curriculum_item_answers_question_item_id_question_items_id_fk" FOREIGN KEY ("question_item_id") REFERENCES "public"."question_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_concepts" ADD CONSTRAINT "curriculum_item_concepts_item_id_curriculum_module_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."curriculum_module_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_concepts" ADD CONSTRAINT "curriculum_item_concepts_concept_id_question_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."question_concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_progress" ADD CONSTRAINT "curriculum_item_progress_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_progress" ADD CONSTRAINT "curriculum_item_progress_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_progress" ADD CONSTRAINT "curriculum_item_progress_item_id_curriculum_module_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."curriculum_module_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_item_resources" ADD CONSTRAINT "curriculum_item_resources_item_id_curriculum_module_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."curriculum_module_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_module_items" ADD CONSTRAINT "curriculum_module_items_module_id_curriculum_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."curriculum_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_module_items" ADD CONSTRAINT "curriculum_module_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_module_prereqs" ADD CONSTRAINT "curriculum_module_prereqs_module_id_curriculum_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."curriculum_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_module_prereqs" ADD CONSTRAINT "curriculum_module_prereqs_requires_module_id_curriculum_modules_id_fk" FOREIGN KEY ("requires_module_id") REFERENCES "public"."curriculum_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_module_progress" ADD CONSTRAINT "curriculum_module_progress_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_module_progress" ADD CONSTRAINT "curriculum_module_progress_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_module_progress" ADD CONSTRAINT "curriculum_module_progress_module_id_curriculum_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."curriculum_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_path_modules" ADD CONSTRAINT "curriculum_path_modules_module_id_curriculum_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."curriculum_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_answers_student_answered" ON "curriculum_item_answers" USING btree ("student_id","answered_at");--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_answers_tenant_id" ON "curriculum_item_answers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_answers_item_id" ON "curriculum_item_answers" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_concepts_item_id" ON "curriculum_item_concepts" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_concepts_concept_id" ON "curriculum_item_concepts" USING btree ("concept_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_item_concepts_pair" ON "curriculum_item_concepts" USING btree ("item_id","concept_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_progress_student_id" ON "curriculum_item_progress" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_progress_tenant_id" ON "curriculum_item_progress" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_progress_item_id" ON "curriculum_item_progress" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_item_progress_student_item" ON "curriculum_item_progress" USING btree ("student_id","item_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_item_resources_item_id" ON "curriculum_item_resources" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_module_items_module_id" ON "curriculum_module_items" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_module_items_module_position" ON "curriculum_module_items" USING btree ("module_id","position");--> statement-breakpoint
CREATE INDEX "idx_curriculum_module_prereqs_module_id" ON "curriculum_module_prereqs" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_module_prereqs_pair" ON "curriculum_module_prereqs" USING btree ("module_id","requires_module_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_module_progress_student_id" ON "curriculum_module_progress" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_module_progress_tenant_id" ON "curriculum_module_progress" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_module_progress_student_module" ON "curriculum_module_progress" USING btree ("student_id","module_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_path_modules_module_id" ON "curriculum_path_modules" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_path_modules_path_module" ON "curriculum_path_modules" USING btree ("path_key","module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_path_modules_path_position" ON "curriculum_path_modules" USING btree ("path_key","position");--> statement-breakpoint
-- ============================================================================
-- 1E.1 (ADR-014 D2) — sekcja RĘCZNA (NIE generowana przez drizzle-kit):
-- GRANT-y + RLS. Wzorzec 0030 (ENABLE+FORCE, student_sees_own,
-- owner_passthrough DROP+CREATE — nota INFO Ryana z rls-matrix v0.25:
-- preferować DROP+CREATE nad IF NOT EXISTS).
-- ============================================================================
--> statement-breakpoint
-- K-PUB (definicje treści — globalny katalog jak projects/project_learning_resources:
-- bez tenant_id, bez RLS; odczyt dla obu ról, zapis wyłącznie ingest/owner per ADR-010)
GRANT SELECT ON curriculum_modules TO app_student, app_faculty;--> statement-breakpoint
GRANT SELECT ON curriculum_path_modules TO app_student, app_faculty;--> statement-breakpoint
GRANT SELECT ON curriculum_module_prereqs TO app_student, app_faculty;--> statement-breakpoint
GRANT SELECT ON curriculum_module_items TO app_student, app_faculty;--> statement-breakpoint
GRANT SELECT ON curriculum_item_concepts TO app_student, app_faculty;--> statement-breakpoint
GRANT SELECT ON curriculum_item_resources TO app_student, app_faculty;--> statement-breakpoint
-- K-INT (dane studenta, tenant): grant TYLKO SELECT dla app_student (zapisy
-- owner-side przez API w tenant-context), app_faculty fizycznie bez wstępu.
GRANT SELECT ON curriculum_item_progress TO app_student;--> statement-breakpoint
REVOKE ALL ON curriculum_item_progress FROM app_faculty;--> statement-breakpoint
GRANT SELECT ON curriculum_item_answers TO app_student;--> statement-breakpoint
REVOKE ALL ON curriculum_item_answers FROM app_faculty;--> statement-breakpoint
GRANT SELECT ON curriculum_module_progress TO app_student;--> statement-breakpoint
REVOKE ALL ON curriculum_module_progress FROM app_faculty;--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['curriculum_item_progress','curriculum_item_answers','curriculum_module_progress'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS student_sees_own ON %I', t);
    EXECUTE format(
      'CREATE POLICY student_sees_own ON %I FOR SELECT TO app_student
         USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting(''app.current_user_id'', true)))',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON %I', t);
    EXECUTE format(
      'CREATE POLICY owner_passthrough ON %I FOR ALL TO %I USING (true) WITH CHECK (true)',
      t, current_user
    );
  END LOOP;
END $$;
--> statement-breakpoint
-- ROLLBACK (ręczny, w razie potrzeby):
--   DROP TABLE curriculum_item_answers, curriculum_item_progress,
--     curriculum_module_progress, curriculum_item_resources,
--     curriculum_item_concepts, curriculum_module_items,
--     curriculum_module_prereqs, curriculum_path_modules, curriculum_modules;
--   ALTER TABLE project_learning_resources DROP COLUMN license,
--     DROP COLUMN language, DROP COLUMN registration_required,
--     DROP COLUMN verified_at;
