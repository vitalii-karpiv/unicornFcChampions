import { playerResults } from "./results";
import { longestStreak } from "./streaks";
import type { Outcome, RatedMatch } from "./types";

export type RecordEntry = { userId: string; value: number; matchId: string; playedAt: Date } | null;

export type Records = {
  longestWinStreak: RecordEntry;
  longestLossStreak: RecordEntry;
  biggestWin: RecordEntry;
  /** Win with the largest team-star deficit; value is the deficit in half-stars. */
  biggestGiantKilling: RecordEntry;
  highestElo: RecordEntry;
  mostGoalsInMatch: RecordEntry;
};

/** Keep the higher value; on a tie keep the earlier (already held) entry. */
function better(cur: RecordEntry, next: RecordEntry): RecordEntry {
  if (!next) return cur;
  if (!cur) return next;
  return next.value > cur.value ? next : cur;
}

export function computeRecords(ms: RatedMatch[], userIds: string[]): Records {
  const streak = (kind: Outcome): RecordEntry => {
    let best: RecordEntry = null;
    for (const userId of userIds) {
      const s = longestStreak(playerResults(ms, userId), kind);
      if (!s.length) continue;
      const entry = { userId, value: s.length, matchId: s.endMatchId!, playedAt: s.reachedAt! };
      if (!best || entry.value > best.value || (entry.value === best.value && entry.playedAt < best.playedAt)) {
        best = entry;
      }
    }
    return best;
  };

  let biggestWin: RecordEntry = null;
  let biggestWinGoals = 0;
  let biggestGiantKilling: RecordEntry = null;
  let giantKillingGd = 0;
  let highestElo: RecordEntry = null;
  let mostGoalsInMatch: RecordEntry = null;

  for (const m of ms) {
    const gd = Math.abs(m.goalsA - m.goalsB);
    const total = m.goalsA + m.goalsB;
    if (gd > 0 && (!biggestWin || gd > biggestWin.value || (gd === biggestWin.value && total > biggestWinGoals))) {
      biggestWin = { userId: m.goalsA > m.goalsB ? m.playerAId : m.playerBId, value: gd, matchId: m.id, playedAt: m.playedAt };
      biggestWinGoals = total;
    }
    if (gd > 0) {
      const aWon = m.goalsA > m.goalsB;
      const deficit = aWon ? m.starsB - m.starsA : m.starsA - m.starsB;
      if (
        deficit > 0 &&
        (!biggestGiantKilling ||
          deficit > biggestGiantKilling.value ||
          (deficit === biggestGiantKilling.value && gd > giantKillingGd))
      ) {
        biggestGiantKilling = { userId: aWon ? m.playerAId : m.playerBId, value: deficit, matchId: m.id, playedAt: m.playedAt };
        giantKillingGd = gd;
      }
    }
    for (const [userId, elo, goals] of [
      [m.playerAId, m.aEloAfter, m.goalsA],
      [m.playerBId, m.bEloAfter, m.goalsB],
    ] as const) {
      highestElo = better(highestElo, { userId, value: elo, matchId: m.id, playedAt: m.playedAt });
      if (goals > 0) mostGoalsInMatch = better(mostGoalsInMatch, { userId, value: goals, matchId: m.id, playedAt: m.playedAt });
    }
  }

  return {
    longestWinStreak: streak("W"),
    longestLossStreak: streak("L"),
    biggestWin,
    biggestGiantKilling,
    highestElo,
    mostGoalsInMatch,
  };
}
