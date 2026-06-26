CREATE TABLE "project_source_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_dead" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_source_links" ADD CONSTRAINT "project_source_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_source_links_project_id" ON "project_source_links" USING btree ("project_id");--> statement-breakpoint

-- ============================================================================
-- #7 GRANTy — sekcja DOPISANA RĘCZNIE (drizzle-kit nie generuje GRANT).
-- Wzorzec: 0016 (project_learning_resources) i 0008 (role grupowe app_student/app_faculty).
--
-- Decyzja schematu (#7, odporność linków): project_source_links to katalog K-PUB
-- (publiczny/referencyjny), dziecko katalogu projects — te same prawa co
-- project_competencies i project_learning_resources (rls-matrix §4). Bez RLS
-- tenant-owej — projekty to globalny katalog, nie dane studenta. GRANT SELECT dla
-- app_student i app_faculty: studenci widzą linki źródła danych, faculty widzi je
-- jako wykładowca. Zapis tylko seed/system (brak endpointu zapisu klienta — jak projects).
-- Tabela trafia na listę wyjątków RLS w rls-matrix §4 + k3-validate (tak jak
-- project_competencies / project_learning_resources).
-- ============================================================================

-- Katalog K-PUB: odczyt dla zalogowanych ról (student i faculty); zapis tylko seed/system.
GRANT SELECT ON project_source_links TO app_student, app_faculty;--> statement-breakpoint

-- ============================================================================
-- BACKFILL — przeniesienie istniejącego linku do PIERWSZEGO wiersza (position 0).
-- Idempotentny: NOT EXISTS chroni przed dublem, gdy migracja puszczona ponownie po
-- ręcznym wgraniu danych. Tylko projekty z niepustym source_url.
-- Po backfillu projects.source_url ZOSTAJE (odwracalność) — widok i tak czyta z
-- nowej tabeli, a do source_url degraduje tylko, gdy projekt nie ma żadnego wiersza.
-- ============================================================================
INSERT INTO project_source_links (project_id, url, position, is_dead)
SELECT p.id, p.source_url, 0, false
FROM projects p
WHERE p.source_url IS NOT NULL
  AND p.source_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM project_source_links l WHERE l.project_id = p.id
  );

-- ROLLBACK:
-- REVOKE SELECT ON project_source_links FROM app_student, app_faculty;
-- DROP TABLE project_source_links;
-- (projects.source_url nie był usuwany — nic do przywrócenia po stronie projects.)