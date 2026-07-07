CREATE TABLE "career_model_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot" text NOT NULL,
	"source" text NOT NULL,
	"checksum" text NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "career_model_versions_checksum_unique" UNIQUE("checksum")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_career_model_versions_active" ON "career_model_versions" USING btree ("is_active") WHERE "career_model_versions"."is_active" = true;--> statement-breakpoint
-- Global read-only dla ról aplikacyjnych (wzorzec job_market_data, 0008):
-- model kariery to publiczna konfiguracja; zapis wyłącznie owner (ingest tool).
GRANT SELECT ON career_model_versions TO app_student, app_faculty;
