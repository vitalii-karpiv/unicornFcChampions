import type { RatedMatch } from "./types";

export type HeadToHead = {
  games: number;
  aWins: number;
  draws: number;
  bWins: number;
  aGoals: number;
  bGoals: number;
  aEloNet: number;
  biggestAWin: RatedMatch | null;
  biggestBWin: RatedMatch | null;
  /** Last 10 matches, newest first. */
  recent: RatedMatch[];
};

/** Head-to-head between a and b from a's perspective (expects replay order). */
export function headToHead(ms: RatedMatch[], a: string, b: string): HeadToHead {
  const h: HeadToHead = {
    games: 0, aWins: 0, draws: 0, bWins: 0, aGoals: 0, bGoals: 0, aEloNet: 0,
    biggestAWin: null, biggestBWin: null, recent: [],
  };
  let aBest = { gd: 0, goals: 0 };
  let bBest = { gd: 0, goals: 0 };
  const played: RatedMatch[] = [];

  for (const m of ms) {
    const aIsA = m.playerAId === a && m.playerBId === b;
    if (!aIsA && !(m.playerAId === b && m.playerBId === a)) continue;
    played.push(m);
    const ag = aIsA ? m.goalsA : m.goalsB;
    const bg = aIsA ? m.goalsB : m.goalsA;
    h.games++;
    h.aGoals += ag;
    h.bGoals += bg;
    h.aEloNet += aIsA ? m.aEloAfter - m.aEloBefore : m.bEloAfter - m.bEloBefore;
    const gd = Math.abs(ag - bg);
    const goals = ag + bg;
    if (ag > bg) {
      h.aWins++;
      if (gd > aBest.gd || (gd === aBest.gd && goals > aBest.goals)) [aBest, h.biggestAWin] = [{ gd, goals }, m];
    } else if (bg > ag) {
      h.bWins++;
      if (gd > bBest.gd || (gd === bBest.gd && goals > bBest.goals)) [bBest, h.biggestBWin] = [{ gd, goals }, m];
    } else h.draws++;
  }

  h.recent = played.slice(-10).reverse();
  return h;
}
