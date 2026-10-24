import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { db } from "@/lib/db";
import { activityLog, matchComments, matches, matchReactions, users } from "@/lib/db/schema";
import { replayElo, sortMatches } from "@/lib/domain/replay";
import type { RatedMatch } from "@/lib/domain/types";

export type UserSummary = { id: string; username: string };

/**
 * Cross-request cache for read queries. Every write path calls `updateTag` for the tags it touches, so these only
 * serve stale data after changes made outside the app (seed, manual SQL) - the TTL bounds that.
 * The cache stores JSON, so Dates come back as strings: revive them after every read.
 */
export const CACHE_TAGS = {
  users: "users",
  matches: "matches",
  comments: "comments",
  reactions: "reactions",
  activity: "activity",
} as const;
const TTL_SECONDS = 300;

const cached = <A extends unknown[], R>(fn: (...args: A) => Promise<R>, name: keyof typeof CACHE_TAGS) =>
  unstable_cache(fn, [`q:${name}`], { tags: [CACHE_TAGS[name]], revalidate: TTL_SECONDS });

const date = (d: Date | string) => new Date(d);

const cachedUsers = cached(
  () => db.select({ id: users.id, username: users.username }).from(users).orderBy(asc(users.username)),
  "users",
);

export const getUsers = cache(async (): Promise<UserSummary[]> => cachedUsers());

const cachedMatchRows = cached(() => db.select().from(matches), "matches");

/** Whole history in replay order. Small enough (a few friends) to derive every stat in memory. */
export const getRatedMatches = cache(async (): Promise<RatedMatch[]> => {
  const rows = (await cachedMatchRows()).map((r) => ({
    ...r,
    playedAt: date(r.playedAt),
    createdAt: date(r.createdAt),
    updatedAt: date(r.updatedAt),
  }));
  if (rows.some((r) => r.aEloAfter === null || r.bEloAfter === null)) return replayElo(rows);
  return sortMatches(rows as RatedMatch[]);
});

export async function getMatch(id: string): Promise<RatedMatch | null> {
  return (await getRatedMatches()).find((m) => m.id === id) ?? null;
}

const reactionCounts = cached(
  (ids: string[]) =>
    db
      .select({ matchId: matchReactions.matchId, emoji: matchReactions.emoji, n: sql<number>`count(*)::int` })
      .from(matchReactions)
      .where(inArray(matchReactions.matchId, ids))
      .groupBy(matchReactions.matchId, matchReactions.emoji),
  "reactions",
);

const commentCounts = cached(
  (ids: string[]) =>
    db
      .select({ matchId: matchComments.matchId, n: sql<number>`count(*)::int` })
      .from(matchComments)
      .where(inArray(matchComments.matchId, ids))
      .groupBy(matchComments.matchId),
  "comments",
);

export type FeedItem = { match: RatedMatch; reactions: Record<string, number>; comments: number };

export async function getFeed(limit: number, offset = 0): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const all = await getRatedMatches();
  const page = all
    .slice()
    .reverse()
    .slice(offset, offset + limit);
  const ids = page.map((m) => m.id);
  if (!ids.length) return { items: [], hasMore: false };

  const [reactionRows, commentRows] = await Promise.all([reactionCounts(ids), commentCounts(ids)]);

  const items = page.map((match) => ({
    match,
    reactions: Object.fromEntries(reactionRows.filter((r) => r.matchId === match.id).map((r) => [r.emoji, r.n])),
    comments: commentRows.find((r) => r.matchId === match.id)?.n ?? 0,
  }));
  return { items, hasMore: offset + limit < all.length };
}

const cachedComments = cached(
  (matchId: string) =>
    db
      .select({
        id: matchComments.id,
        body: matchComments.body,
        createdAt: matchComments.createdAt,
        userId: matchComments.userId,
        username: users.username,
      })
      .from(matchComments)
      .innerJoin(users, eq(users.id, matchComments.userId))
      .where(eq(matchComments.matchId, matchId))
      .orderBy(asc(matchComments.createdAt)),
  "comments",
);

export async function getComments(matchId: string) {
  return (await cachedComments(matchId)).map((c) => ({ ...c, createdAt: date(c.createdAt) }));
}

export const getReactions = cached(
  (matchId: string) =>
    db
      .select({ emoji: matchReactions.emoji, userId: matchReactions.userId })
      .from(matchReactions)
      .where(eq(matchReactions.matchId, matchId)),
  "reactions",
);

const cachedActivity = cached(
  (limit: number) =>
    db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        matchId: activityLog.matchId,
        before: activityLog.before,
        after: activityLog.after,
        createdAt: activityLog.createdAt,
        actor: users.username,
      })
      .from(activityLog)
      .innerJoin(users, eq(users.id, activityLog.actorId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit),
  "activity",
);

export async function getActivity(limit: number) {
  return (await cachedActivity(limit)).map((a) => ({ ...a, createdAt: date(a.createdAt) }));
}
