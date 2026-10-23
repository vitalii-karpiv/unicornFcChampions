export const START_ELO = 1000;

export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

/** World Football Elo goal-difference multiplier. */
export function goalDiffMultiplier(gd: number): number {
  if (gd <= 1) return 1;
  if (gd === 2) return 1.5;
  return (11 + gd) / 8;
}

export function kFactor(priorGames: number): number {
  return priorGames < 10 ? 40 : 32;
}

export function rateMatch(i: {
  ra: number;
  rb: number;
  priorA: number;
  priorB: number;
  goalsA: number;
  goalsB: number;
}): { aAfter: number; bAfter: number } {
  const sa = i.goalsA > i.goalsB ? 1 : i.goalsA === i.goalsB ? 0.5 : 0;
  const ea = expectedScore(i.ra, i.rb);
  const g = goalDiffMultiplier(Math.abs(i.goalsA - i.goalsB));
  return {
    aAfter: i.ra + kFactor(i.priorA) * g * (sa - ea),
    bAfter: i.rb + kFactor(i.priorB) * g * (1 - sa - (1 - ea)),
  };
}
