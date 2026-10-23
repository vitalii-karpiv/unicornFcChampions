import { rateMatch, START_ELO } from "./elo";
import type { MatchRow, RatedMatch } from "./types";

/** Canonical match order: playedAt, then createdAt, then id. */
export function sortMatches<T extends MatchRow>(ms: T[]): T[] {
  return [...ms].sort(
    (x, y) =>
      x.playedAt.getTime() - y.playedAt.getTime() ||
      x.createdAt.getTime() - y.createdAt.getTime() ||
      (x.id < y.id ? -1 : x.id > y.id ? 1 : 0),
  );
}

/** Recompute every rating from scratch over the whole history. */
export function replayElo(ms: MatchRow[]): RatedMatch[] {
  const rating = new Map<string, number>();
  const games = new Map<string, number>();

  return sortMatches(ms).map((m) => {
    const ra = rating.get(m.playerAId) ?? START_ELO;
    const rb = rating.get(m.playerBId) ?? START_ELO;
    const priorA = games.get(m.playerAId) ?? 0;
    const priorB = games.get(m.playerBId) ?? 0;
    const { aAfter, bAfter } = rateMatch({ ra, rb, priorA, priorB, goalsA: m.goalsA, goalsB: m.goalsB });

    rating.set(m.playerAId, aAfter);
    rating.set(m.playerBId, bAfter);
    games.set(m.playerAId, priorA + 1);
    games.set(m.playerBId, priorB + 1);

    return { ...m, aEloBefore: ra, aEloAfter: aAfter, bEloBefore: rb, bEloAfter: bAfter };
  });
}
