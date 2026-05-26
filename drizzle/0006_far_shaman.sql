ALTER TABLE "competencies" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "gaps" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "passports" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "project_submissions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "skill_maps" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passports" ADD CONSTRAINT "passports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_submissions" ADD CONSTRAINT "project_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_maps" ADD CONSTRAINT "skill_maps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_competencies_tenant_id" ON "competencies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_gaps_tenant_id" ON "gaps" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_passports_tenant_id" ON "passports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_project_submissions_tenant_id" ON "project_submissions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_skill_maps_tenant_id" ON "skill_maps" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_students_tenant_id" ON "students" USING btree ("tenant_id");--> statement-breakpoint

-- ============================================================================
-- BACKFILL (docs/data/tenant-mapping-beta.md). Dwustopniowy: tu nullable+backfill,
-- 0006b robi SET NOT NULL. Match dokładny na znormalizowanym kluczu; brak
-- dopasowania -> __unmapped (fail-closed, nie cudzy tenant).
-- ============================================================================

-- 1. students: normalizacja university (trim -> lower -> bez ogonków -> zwinięcie spacji)
UPDATE "students" s
SET "tenant_id" = t."id"
FROM "tenants" t
WHERE t."slug" = CASE
		regexp_replace(
			translate(lower(btrim(s."university")), 'łąęóżźśćń', 'laeozzscn'),
			'\s+', ' ', 'g')
		WHEN 'wsb merito szczecin' THEN 'wsb-merito-szczecin'
		WHEN 'wsb merito warszawa' THEN 'wsb-merito-warszawa'
		ELSE '__unmapped'
	END;--> statement-breakpoint

-- 2. tabele dziecięce dziedziczą tenant_id po students (join na student_id)
UPDATE "competencies" c SET "tenant_id" = s."tenant_id" FROM "students" s WHERE c."student_id" = s."id";--> statement-breakpoint
UPDATE "gaps" g SET "tenant_id" = s."tenant_id" FROM "students" s WHERE g."student_id" = s."id";--> statement-breakpoint
UPDATE "skill_maps" m SET "tenant_id" = s."tenant_id" FROM "students" s WHERE m."student_id" = s."id";--> statement-breakpoint
UPDATE "passports" p SET "tenant_id" = s."tenant_id" FROM "students" s WHERE p."student_id" = s."id";--> statement-breakpoint
UPDATE "project_submissions" ps SET "tenant_id" = s."tenant_id" FROM "students" s WHERE ps."student_id" = s."id";--> statement-breakpoint

-- 3. audyt sierot — każdy student wpadający do __unmapped = sygnał do ręcznej korekty
INSERT INTO "audit_log" ("actor_type", "action", "target_type", "target_id", "metadata")
SELECT 'system', 'tenant.backfill.unmapped', 'students', s."id"::text,
	jsonb_build_object('university', s."university")
FROM "students" s
JOIN "tenants" t ON s."tenant_id" = t."id"
WHERE t."slug" = '__unmapped';--> statement-breakpoint

-- 4. walidacja fail-closed: 0 NULL po backfillu, inaczej migracja przerywa
--    (blokuje 0006b SET NOT NULL na niekompletnych danych)
DO $$
DECLARE n bigint;
BEGIN
	SELECT
		(SELECT count(*) FROM "students" WHERE "tenant_id" IS NULL)
		+ (SELECT count(*) FROM "competencies" WHERE "tenant_id" IS NULL)
		+ (SELECT count(*) FROM "gaps" WHERE "tenant_id" IS NULL)
		+ (SELECT count(*) FROM "skill_maps" WHERE "tenant_id" IS NULL)
		+ (SELECT count(*) FROM "passports" WHERE "tenant_id" IS NULL)
		+ (SELECT count(*) FROM "project_submissions" WHERE "tenant_id" IS NULL)
	INTO n;
	IF n > 0 THEN
		RAISE EXCEPTION 'backfill 0006: % wierszy z tenant_id IS NULL — przerwano przed SET NOT NULL', n;
	END IF;
END $$;

-- ROLLBACK:
-- ALTER TABLE "students" DROP COLUMN "tenant_id";
-- ALTER TABLE "competencies" DROP COLUMN "tenant_id";
-- ALTER TABLE "gaps" DROP COLUMN "tenant_id";
-- ALTER TABLE "skill_maps" DROP COLUMN "tenant_id";
-- ALTER TABLE "passports" DROP COLUMN "tenant_id";
-- ALTER TABLE "project_submissions" DROP COLUMN "tenant_id";
-- (DROP COLUMN kasuje też FK i indeksy idx_*_tenant_id)