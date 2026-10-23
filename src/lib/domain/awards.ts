import type { PlayerMonthStats } from "./month";
import type { AwardKey } from "./types";

export type { AwardKey };

export const AWARDS: { key: AwardKey; label: string; emoji: string; minGames: number }[] = [
  { key: "eloGain", label: "Biggest Elo gain", emoji: "📈", minGames: 1 },
  { key: "winStreak", label: "Longest win streak", emoji: "🔥", minGames: 1 },
  { key: "games", label: "Most games", emoji: "🎮", minGames: 1 },
  { key: "wins", label: "Most wins", emoji: "🏆", minGames: 1 },
  { key: "winRate", label: "Best win rate", emoji: "🎯", minGames: 5 },
  { key: "goals", label: "Most goals", emoji: "⚽", minGames: 1 },
];

export const POTM_MIN_GAMES = 5;

export type AwardWinner = { userId: string; value: number };

export type MonthAwards = {
  month: string;
  awards: Record<AwardKey, AwardWinner | null>;
  playerOfMonth: { userId: string; awardsWon: number } | null;
  stats: PlayerMonthStats[];
};

export function awardValue(s: PlayerMonthStats, key: AwardKey): number {
  switch (key) {
    case "eloGain":
      return s.eloGain;
    case "winStreak":
      return s.longestWinStreak;
    case "games":
      return s.games;
    case "wins":
      return s.wins;
    case "winRate":
      return s.winRate;
    case "goals":
      return s.goalsFor;
  }
}

const time = (d: Date | null) => (d ? d.getTime() : Number.POSITIVE_INFINITY);

/** Shared tiebreak chain: Elo gain (optional) → more wins → fewer games → reached first. */
function tiebreak(x: PlayerMonthStats, y: PlayerMonthStats, reachedKey: AwardKey, useEloGain: boolean): number {
  return (
    (useEloGain ? y.eloGain - x.eloGain : 0) ||
    y.wins - x.wins ||
    x.games - y.games ||
    time(x.reachedAt[reachedKey]) - time(y.reachedAt[reachedKey])
  );
}

export function computeAwards(month: string, stats: PlayerMonthStats[]): MonthAwards {
  const awards = {} as Record<AwardKey, AwardWinner | null>;
  const won = new Map<string, number>();

  for (const a of AWARDS) {
    const [best] = stats
      .filter((s) => s.games >= a.minGames && awardValue(s, a.key) > 0)
      .sort((x, y) => awardValue(y, a.key) - awardValue(x, a.key) || tiebreak(x, y, a.key, a.key !== "eloGain"));
    awards[a.key] = best ? { userId: best.userId, value: awardValue(best, a.key) } : null;
    if (best) won.set(best.userId, (won.get(best.userId) ?? 0) + 1);
  }

  const count = (s: PlayerMonthStats) => won.get(s.userId) ?? 0;
  const [potm] = stats
    .filter((s) => s.games >= POTM_MIN_GAMES)
    .sort((x, y) => count(y) - count(x) || tiebreak(x, y, "games", true));

  return {
    month,
    awards,
    playerOfMonth: potm ? { userId: potm.userId, awardsWon: count(potm) } : null,
    stats,
  };
}
