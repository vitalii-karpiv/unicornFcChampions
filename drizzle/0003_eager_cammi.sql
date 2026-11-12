CREATE TABLE "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" text NOT NULL,
	"selection_key" text NOT NULL,
	"label" text NOT NULL,
	"market_title" text NOT NULL,
	"scope" text NOT NULL,
	"spec" jsonb NOT NULL,
	"odds" double precision NOT NULL,
	"stake" integer NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bets_stake_positive" CHECK ("bets"."stake" > 0),
	CONSTRAINT "bets_odds_valid" CHECK ("bets"."odds" > 1)
);
--> statement-breakpoint
CREATE TABLE "futures_markets" (
	"month" text PRIMARY KEY NOT NULL,
	"odds" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "futures_picks" (
	"month" text NOT NULL,
	"question" text NOT NULL,
	"user_id" uuid NOT NULL,
	"pick_user_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "futures_picks_month_question_user_id_pk" PRIMARY KEY("month","question","user_id")
);
--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "futures_picks" ADD CONSTRAINT "futures_picks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "futures_picks" ADD CONSTRAINT "futures_picks_pick_user_id_users_id_fk" FOREIGN KEY ("pick_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bets_user_idx" ON "bets" USING btree ("user_id");