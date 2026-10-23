import { currentElo, playerResults } from "./results";
import { lastN } from "./streaks";
import type { Outcome, RatedMatch } from "./types";

export type LeaderboardRow = {
  userId: string;
  username: string;
  /** null for players who haven't played yet. */
  rank: number | null;
  elo: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  form: Outcome[];
};

export function buildLeaderboard(ms: RatedMatch[], users: { id: string; username: string }[]): LeaderboardRow[] {
  const rows = users.map((u) => {
    const rs = playerResults(ms, u.id);
    return {
      userId: u.id,
      username: u.username,
      rank: null as number | null,
      elo: currentElo(ms, u.id),
      games: rs.length,
      wins: rs.filter((r) => r.outcome === "W").length,
      draws: rs.filter((r) => r.outcome === "D").length,
      losses: rs.filter((r) => r.outcome === "L").length,
      form: lastN(rs),
    };
  });
  rows.sort((x, y) => Number(y.games > 0) - Number(x.games > 0) || y.elo - x.elo || x.username.localeCompare(y.username));
  let rank = 0;
  for (const r of rows) if (r.games > 0) r.rank = ++rank;
  return rows;
}
