import { DEFAULT_STARS, starWhole } from "./stars";

export const START_ELO = 1000;
/** Virtual Elo points each whole team star adds inside the expected score. */
export const STAR_ELO = 100;

export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

/** Expected score for A with each team's stars added as virtual rating; displayed ratings are never shifted. */
export function handicappedExpected(ra: number, rb: number, starsA = DEFAULT_STARS, starsB = DEFAULT_STARS): number {
  return expectedScore(ra + STAR_ELO * starWhole(starsA), rb + STAR_ELO * starWhole(starsB));
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
  /** Team stars in half-stars; equal stars (the default) mean no handicap. */
  starsA?: number;
  starsB?: number;
}): { aAfter: number; bAfter: number } {
  const sa = i.goalsA > i.goalsB ? 1 : i.goalsA === i.goalsB ? 0.5 : 0;
  const ea = handicappedExpected(i.ra, i.rb, i.starsA, i.starsB);
  const g = goalDiffMultiplier(Math.abs(i.goalsA - i.goalsB));
  return {
    aAfter: i.ra + kFactor(i.priorA) * g * (sa - ea),
    bAfter: i.rb + kFactor(i.priorB) * g * (1 - sa - (1 - ea)),
  };
}
