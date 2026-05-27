ALTER TABLE "competencies" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "gaps" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "passports" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_submissions" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_maps" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint
-- Przechodzi tylko po zielonej walidacji 0006 (0 NULL — wymuszone RAISE EXCEPTION).
-- ROLLBACK:
-- ALTER TABLE "students" ALTER COLUMN "tenant_id" DROP NOT NULL;
-- ALTER TABLE "competencies" ALTER COLUMN "tenant_id" DROP NOT NULL;
-- ALTER TABLE "gaps" ALTER COLUMN "tenant_id" DROP NOT NULL;
-- ALTER TABLE "skill_maps" ALTER COLUMN "tenant_id" DROP NOT NULL;
-- ALTER TABLE "passports" ALTER COLUMN "tenant_id" DROP NOT NULL;
-- ALTER TABLE "project_submissions" ALTER COLUMN "tenant_id" DROP NOT NULL;