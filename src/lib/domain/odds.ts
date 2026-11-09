import { handicappedExpected, rateMatch } from "./elo";
import { DEFAULT_STARS } from "./stars";

export type PlayerRating = { elo: number; games: number };

export type Odds = {
  /** Elo expected score: win probability with a draw counting as half. */
  expectedA: number;
  expectedB: number;
  /** Elo change for each player if the match ends in a one-goal win or loss. */
  a: { win: number; loss: number };
  b: { win: number; loss: number };
};

export function matchOdds(a: PlayerRating, b: PlayerRating, starsA = DEFAULT_STARS, starsB = DEFAULT_STARS): Odds {
  const stakes = (goalsA: number, goalsB: number) => {
    const { aAfter, bAfter } = rateMatch({
      ra: a.elo,
      rb: b.elo,
      priorA: a.games,
      priorB: b.games,
      goalsA,
      goalsB,
      starsA,
      starsB,
    });
    return { a: aAfter - a.elo, b: bAfter - b.elo };
  };
  const aWins = stakes(1, 0);
  const bWins = stakes(0, 1);
  const expectedA = handicappedExpected(a.elo, b.elo, starsA, starsB);
  return {
    expectedA,
    expectedB: 1 - expectedA,
    a: { win: aWins.a, loss: bWins.a },
    b: { win: bWins.b, loss: aWins.b },
  };
}
