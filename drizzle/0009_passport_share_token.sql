ALTER TABLE "passports" ADD COLUMN "public_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "passports" ADD COLUMN "share_token" text;--> statement-breakpoint
CREATE INDEX "idx_passports_share_token" ON "passports" USING btree ("share_token");--> statement-breakpoint
ALTER TABLE "passports" ADD CONSTRAINT "passports_share_token_unique" UNIQUE("share_token");
--> statement-breakpoint
-- B1/RODO: istniejące paszporty domyślnie NIEPUBLICZNE (public_enabled=false z DEFAULT,
-- share_token NULL) — żaden nie jest publicznie dostępny dopóki student nie włączy.
-- ROLLBACK:
-- ALTER TABLE "passports" DROP COLUMN "share_token";
-- ALTER TABLE "passports" DROP COLUMN "public_enabled";