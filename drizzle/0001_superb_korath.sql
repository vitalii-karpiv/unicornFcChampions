ALTER TABLE "matches" ADD COLUMN "stars_a" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "stars_b" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_stars_valid" CHECK ("matches"."stars_a" in (1,2,3,4,5,6,7,8,9,10,12) and "matches"."stars_b" in (1,2,3,4,5,6,7,8,9,10,12));