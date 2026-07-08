CREATE TABLE "project_hidden_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"deps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"command" jsonb NOT NULL,
	"timeout_ms" integer DEFAULT 60000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_hidden_tests" ADD CONSTRAINT "project_hidden_tests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_hidden_tests_project" ON "project_hidden_tests" USING btree ("project_id");
-- ============================================================================
-- B6/1.8 (ADR-012) — project_hidden_tests: DENY-BY-DEFAULT (sekcja ręczna).
-- Zero grantów dla app_student/app_faculty — ukryte testy czyta WYŁĄCZNIE
-- server-side runner jako owner. Wariant DENY jak job_market_data_staging
-- (k3-validate #13a pilnuje zerowych grantów). Bez RLS-policy: brak grantu
-- = brak dostępu; tabela bez tenant_id (katalog per projekt).
-- ============================================================================
REVOKE ALL ON project_hidden_tests FROM app_student, app_faculty;

-- ROLLBACK:
-- DROP TABLE project_hidden_tests;
