import { expectedScore, rateMatch } from "./elo";

export type PlayerRating = { elo: number; games: number };

export type Odds = {
  /** Elo expected score: win probability with a draw counting as half. */
  expectedA: number;
  expectedB: number;
  /** Elo change for each player if the match ends in a one-goal win or loss. */
  a: { win: number; loss: number };
  b: { win: number; loss: number };
};

export function matchOdds(a: PlayerRating, b: PlayerRating): Odds {
  const stakes = (goalsA: number, goalsB: number) => {
    const { aAfter, bAfter } = rateMatch({
      ra: a.elo,
      rb: b.elo,
      priorA: a.games,
      priorB: b.games,
      goalsA,
      goalsB,
    });
    return { a: aAfter - a.elo, b: bAfter - b.elo };
  };
  const aWins = stakes(1, 0);
  const bWins = stakes(0, 1);
  const expectedA = expectedScore(a.elo, b.elo);
  return {
    expectedA,
    expectedB: 1 - expectedA,
    a: { win: aWins.a, loss: bWins.a },
    b: { win: bWins.b, loss: aWins.b },
  };
}
