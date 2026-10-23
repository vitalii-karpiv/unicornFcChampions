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

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  tokenVersion: integer("token_version").notNull().default(0),
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
