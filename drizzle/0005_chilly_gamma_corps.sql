CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "idx_tenants_slug" ON "tenants" USING btree ("slug");
--> statement-breakpoint
-- Seed: 2 design partnerzy Bety (potwierdzeni 2026-05-25) + parking sierot.
-- docs/data/tenant-mapping-beta.md sekcja 3. Idempotentny (ON CONFLICT slug).
INSERT INTO "tenants" ("slug", "name") VALUES
	('wsb-merito-szczecin', 'WSB Merito Szczecin'),
	('wsb-merito-warszawa', 'WSB Merito Warszawa'),
	('__unmapped', 'Niezmapowane (parking sierot — RLS deny)')
ON CONFLICT ("slug") DO NOTHING;

-- ROLLBACK:
-- DROP TABLE "tenants" CASCADE;
