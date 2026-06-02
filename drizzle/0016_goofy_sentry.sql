CREATE TABLE "project_learning_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_learning_resources_type_values" CHECK ("project_learning_resources"."type" IN ('video','docs','course'))
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "theory_md" text;--> statement-breakpoint
ALTER TABLE "project_learning_resources" ADD CONSTRAINT "project_learning_resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_learning_resources_project_id" ON "project_learning_resources" USING btree ("project_id");--> statement-breakpoint

-- ============================================================================
-- B3 GRANTy — sekcja DOPISANA RĘCZNIE (drizzle-kit nie generuje GRANT).
-- Wzorzec: 0008 (role grupowe app_student/app_faculty).
--
-- Decyzja schematu (Ethan, 2026-05-31, §B3.2): project_learning_resources to
-- katalog K-PUB (publiczny/referencyjny), dziecko katalogu projects — te same
-- prawa co project_competencies (rls-matrix §4). Bez RLS tenant-owej — projekty
-- to globalny katalog, nie dane studenta. GRANT SELECT dla app_student i
-- app_faculty: studenci widzą materiały do nauki, faculty widzi je jako wykładowca.
-- Zapis tylko seed/system (brak endpointu zapisu klienta — jak projects).
-- Tabela trafia na listę wyjątków RLS w rls-matrix §4 + k3-validate (tak jak
-- project_competencies).
-- ============================================================================

-- Katalog K-PUB: odczyt dla zalogowanych ról (student i faculty); zapis tylko seed/system.
GRANT SELECT ON project_learning_resources TO app_student, app_faculty;

-- ROLLBACK:
-- REVOKE SELECT ON project_learning_resources FROM app_student, app_faculty;
-- DROP TABLE project_learning_resources;
-- ALTER TABLE projects DROP COLUMN theory_md;