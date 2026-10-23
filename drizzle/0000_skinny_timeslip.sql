CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"match_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_reactions" (
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_reactions_match_id_user_id_emoji_pk" PRIMARY KEY("match_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_a_id" uuid NOT NULL,
	"player_b_id" uuid NOT NULL,
	"goals_a" integer NOT NULL,
	"goals_b" integer NOT NULL,
	"played_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"a_elo_before" double precision,
	"a_elo_after" double precision,
	"b_elo_before" double precision,
	"b_elo_after" double precision,
	CONSTRAINT "matches_distinct_players" CHECK ("matches"."player_a_id" <> "matches"."player_b_id")
);
--> statement-breakpoint
CREATE TABLE "monthly_awards" (
	"month" text PRIMARY KEY NOT NULL,
	"snapshot" jsonb NOT NULL,
	"frozen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_comments" ADD CONSTRAINT "match_comments_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_comments" ADD CONSTRAINT "match_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_reactions" ADD CONSTRAINT "match_reactions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_reactions" ADD CONSTRAINT "match_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_a_id_users_id_fk" FOREIGN KEY ("player_a_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_b_id_users_id_fk" FOREIGN KEY ("player_b_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_created_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_username_idx" ON "login_attempts" USING btree ("username","attempted_at");--> statement-breakpoint
CREATE INDEX "match_comments_match_idx" ON "match_comments" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "matches_played_at_idx" ON "matches" USING btree ("played_at");