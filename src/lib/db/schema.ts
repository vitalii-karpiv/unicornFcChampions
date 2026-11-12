import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { FuturesOdds } from "@/lib/domain/bets/futures";
import type { BetSpec } from "@/lib/domain/bets/types";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  tokenVersion: integer("token_version").notNull().default(0),
  /** Newest release whose "What's new" the user has closed; null = never seen one (shows every release with notes). */
  lastSeenRelease: text("last_seen_release"),
  createdAt: createdAt(),
});

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerAId: uuid("player_a_id").notNull().references(() => users.id),
    playerBId: uuid("player_b_id").notNull().references(() => users.id),
    goalsA: integer("goals_a").notNull(),
    goalsB: integer("goals_b").notNull(),
    // Team stars in half-stars: 1…10 = 0.5★…5★, 12 = 5+ (see src/lib/domain/stars.ts).
    starsA: integer("stars_a").notNull().default(10),
    starsB: integer("stars_b").notNull().default(10),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // Filled by the Elo replay after every write.
    aEloBefore: doublePrecision("a_elo_before"),
    aEloAfter: doublePrecision("a_elo_after"),
    bEloBefore: doublePrecision("b_elo_before"),
    bEloAfter: doublePrecision("b_elo_after"),
  },
  (t) => [
    check("matches_distinct_players", sql`${t.playerAId} <> ${t.playerBId}`),
    check(
      "matches_stars_valid",
      sql`${t.starsA} in (1,2,3,4,5,6,7,8,9,10,12) and ${t.starsB} in (1,2,3,4,5,6,7,8,9,10,12)`,
    ),
    index("matches_played_at_idx").on(t.playedAt),
  ],
);

export const matchComments = pgTable(
  "match_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("match_comments_match_idx").on(t.matchId)],
);

export const matchReactions = pgTable(
  "match_reactions",
  {
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    emoji: text("emoji").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.userId, t.emoji] })],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").notNull().references(() => users.id),
    action: text("action", { enum: ["create", "update", "delete"] }).notNull(),
    matchId: uuid("match_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_log_created_idx").on(t.createdAt)],
);

export const monthlyAwards = pgTable("monthly_awards", {
  month: text("month").primaryKey(),
  snapshot: jsonb("snapshot").notNull(),
  frozenAt: timestamp("frozen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_username_idx").on(t.username, t.attemptedAt)],
);

export const bets = pgTable(
  "bets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    day: text("day").notNull(),
    selectionKey: text("selection_key").notNull(),
    label: text("label").notNull(),
    marketTitle: text("market_title").notNull(),
    scope: text("scope").notNull(),
    spec: jsonb("spec").$type<BetSpec>().notNull(),
    odds: doublePrecision("odds").notNull(),
    stake: integer("stake").notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    check("bets_stake_positive", sql`${t.stake} > 0`),
    check("bets_odds_valid", sql`${t.odds} > 1`),
    index("bets_user_idx").on(t.userId),
  ],
);

export const futuresMarkets = pgTable("futures_markets", {
  month: text("month").primaryKey(),
  odds: jsonb("odds").$type<FuturesOdds>().notNull(),
  createdAt: createdAt(),
});

export const futuresPicks = pgTable(
  "futures_picks",
  {
    month: text("month").notNull(),
    question: text("question").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id),
    pickUserId: uuid("pick_user_id").notNull().references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.month, t.question, t.userId] })],
);
