-- 1E.2 — tożsamość pozycji curriculum = stabilny slug (ustalenie wiążące
-- z przeglądu Ethana po 1E.1): klucz upsertu ingestu to (module_id, slug);
-- position zostaje WYŁĄCZNIE sortowaniem. Sekcja ręczna: backfill przed
-- NOT NULL (prod ma 4 pozycje capstone z ingestu 0035; ewentualne pozycje
-- testowe dostają deterministyczny slug z position).
ALTER TABLE "curriculum_module_items" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "curriculum_module_items" SET "slug" = CASE
	WHEN "kind" = 'project' THEN 'capstone'
	ELSE 'item-' || "position"::text
END WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "curriculum_module_items" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
-- 1E.2 — feedback diagnostyczny per opcja (treść atomów Sophii); wyrównany
-- indeksami z options_json, edytowalny w miejscu jak explanation_md (poza
-- hashem tożsamości itemu). Tabela pozostaje w wariancie DENY — bez zmian RLS.
ALTER TABLE "question_items" ADD COLUMN "option_feedback_json" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_module_items_module_slug" ON "curriculum_module_items" USING btree ("module_id","slug");
