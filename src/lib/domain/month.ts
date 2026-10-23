import { playerResults } from "./results";
import { longestStreak } from "./streaks";
import { monthKey } from "./time";
import type { AwardKey, RatedMatch } from "./types";

export type PlayerMonthStats = {
  userId: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  eloGain: number;
  longestWinStreak: number;
  winRate: number;
  /** When the player last changed each stat (tiebreak: reached first wins). */
  reachedAt: Record<AwardKey, Date | null>;
};

export function monthStats(ms: RatedMatch[], key: string, userIds: string[]): PlayerMonthStats[] {
  const inMonth = ms.filter((m) => monthKey(m.playedAt) === key);
  return userIds.map((userId) => {
    const rs = playerResults(inMonth, userId);
    const reachedAt: Record<AwardKey, Date | null> = {
      eloGain: null,
      winStreak: null,
      games: null,
      wins: null,
      winRate: null,
      goals: null,
    };
    const s = { games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, eloGain: 0 };
    for (const r of rs) {
      s.games++;
      s.goalsFor += r.goalsFor;
      s.goalsAgainst += r.goalsAgainst;
      s.eloGain += r.eloDelta;
      if (r.outcome === "W") {
        s.wins++;
        reachedAt.wins = r.playedAt;
      } else if (r.outcome === "D") s.draws++;
      else s.losses++;
      if (r.goalsFor > 0) reachedAt.goals = r.playedAt;
      reachedAt.games = reachedAt.eloGain = reachedAt.winRate = r.playedAt;
    }
    const streak = longestStreak(rs, "W");
    reachedAt.winStreak = streak.reachedAt;
    return {
      userId,
      ...s,
      longestWinStreak: streak.length,
      winRate: s.games ? s.wins / s.games : 0,
      reachedAt,
    };
  });
}
