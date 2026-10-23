import type { Outcome, PlayerResult } from "./types";

export function longestStreak(
  rs: PlayerResult[],
  kind: Outcome,
): { length: number; endMatchId: string | null; reachedAt: Date | null } {
  let best = { length: 0, endMatchId: null as string | null, reachedAt: null as Date | null };
  let run = 0;
  for (const r of rs) {
    run = r.outcome === kind ? run + 1 : 0;
    if (run > best.length) best = { length: run, endMatchId: r.matchId, reachedAt: r.playedAt };
  }
  return best;
}

export function currentStreak(rs: PlayerResult[]): { outcome: Outcome | null; length: number } {
  if (!rs.length) return { outcome: null, length: 0 };
  const outcome = rs[rs.length - 1].outcome;
  let length = 0;
  for (let i = rs.length - 1; i >= 0 && rs[i].outcome === outcome; i--) length++;
  return { outcome, length };
}

/** Last n outcomes, oldest → newest. */
export function lastN(rs: PlayerResult[], n = 5): Outcome[] {
  return rs.slice(-n).map((r) => r.outcome);
}
