CREATE TABLE "job_market_data_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"career_goal" text NOT NULL,
	"competency_name" text NOT NULL,
	"demand_percentage" integer NOT NULL,
	"category" text NOT NULL,
	"salary_range" text
);
--> statement-breakpoint
CREATE TABLE "market_refresh_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferty_md5" text NOT NULL,
	"technologie_md5" text NOT NULL,
	"raw_offers" integer NOT NULL,
	"unique_offers" integer NOT NULL,
	"assigned_offers" integer NOT NULL,
	"staged_rows" integer NOT NULL,
	"diff" jsonb NOT NULL,
	"content_flat" text NOT NULL,
	"content_model" text NOT NULL,
	"status" text DEFAULT 'staged' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	CONSTRAINT "chk_market_refresh_runs_status" CHECK ("market_refresh_runs"."status" IN ('staged', 'accepted', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX "idx_job_market_staging_career_goal" ON "job_market_data_staging" USING btree ("career_goal");