import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { activityLog, matchComments, matches, matchReactions, users } from "@/lib/db/schema";
import { replayElo, sortMatches } from "@/lib/domain/replay";
import type { RatedMatch } from "@/lib/domain/types";

export type UserSummary = { id: string; username: string };

export const getUsers = cache(async (): Promise<UserSummary[]> => {
  return db.select({ id: users.id, username: users.username }).from(users).orderBy(asc(users.username));
});

/** Whole history in replay order. Small enough (a few friends) to derive every stat in memory. */
export const getRatedMatches = cache(async (): Promise<RatedMatch[]> => {
  const rows = await db.select().from(matches);
  if (rows.some((r) => r.aEloAfter === null || r.bEloAfter === null)) return replayElo(rows);
  return sortMatches(rows as RatedMatch[]);
});

export async function getMatch(id: string): Promise<RatedMatch | null> {
  return (await getRatedMatches()).find((m) => m.id === id) ?? null;
}

export type FeedItem = { match: RatedMatch; reactions: Record<string, number>; comments: number };

export async function getFeed(limit: number, offset = 0): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const all = await getRatedMatches();
  const page = all.slice().reverse().slice(offset, offset + limit);
  const ids = page.map((m) => m.id);
  if (!ids.length) return { items: [], hasMore: false };

  const [reactionRows, commentRows] = await Promise.all([
    db
      .select({ matchId: matchReactions.matchId, emoji: matchReactions.emoji, n: sql<number>`count(*)::int` })
      .from(matchReactions)
      .where(inArray(matchReactions.matchId, ids))
      .groupBy(matchReactions.matchId, matchReactions.emoji),
    db
      .select({ matchId: matchComments.matchId, n: sql<number>`count(*)::int` })
      .from(matchComments)
      .where(inArray(matchComments.matchId, ids))
      .groupBy(matchComments.matchId),
  ]);

  const items = page.map((match) => ({
    match,
    reactions: Object.fromEntries(reactionRows.filter((r) => r.matchId === match.id).map((r) => [r.emoji, r.n])),
    comments: commentRows.find((r) => r.matchId === match.id)?.n ?? 0,
  }));
  return { items, hasMore: offset + limit < all.length };
}

export async function getComments(matchId: string) {
  return db
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
    .orderBy(asc(matchComments.createdAt));
}

export async function getReactions(matchId: string) {
  return db
    .select({ emoji: matchReactions.emoji, userId: matchReactions.userId })
    .from(matchReactions)
    .where(eq(matchReactions.matchId, matchId));
}

export async function getActivity(limit: number) {
  return db
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
    .limit(limit);
}
