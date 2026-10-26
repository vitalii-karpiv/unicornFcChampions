import { describe, expect, test } from "vitest";
import { rateMatch } from "@/lib/domain/elo";
import { matchOdds } from "@/lib/domain/odds";

describe("matchOdds", () => {
  test("equal ratings are a coin flip with symmetric stakes", () => {
    const o = matchOdds({ elo: 1000, games: 0 }, { elo: 1000, games: 0 });
    expect(o.expectedA).toBe(0.5);
    expect(o.expectedB).toBe(0.5);
    expect(o.a).toEqual({ win: 20, loss: -20 });
    expect(o.b).toEqual({ win: 20, loss: -20 });
  });

  test("the favourite has the higher odds and risks more than they gain", () => {
    const o = matchOdds({ elo: 1200, games: 20 }, { elo: 1000, games: 20 });
    expect(o.expectedA).toBeCloseTo(0.7597, 4);
    expect(o.expectedA + o.expectedB).toBeCloseTo(1, 10);
    expect(o.a.win).toBeLessThan(-o.a.loss);
    expect(o.b.win).toBeGreaterThan(-o.b.loss);
  });

  test("stakes match what rateMatch awards for a one-goal result", () => {
    const a = { elo: 1130, games: 4 };
    const b = { elo: 1010, games: 15 };
    const o = matchOdds(a, b);
    const aWins = rateMatch({ ra: a.elo, rb: b.elo, priorA: a.games, priorB: b.games, goalsA: 1, goalsB: 0 });
    const bWins = rateMatch({ ra: a.elo, rb: b.elo, priorA: a.games, priorB: b.games, goalsA: 0, goalsB: 1 });
    expect(o.a.win).toBeCloseTo(aWins.aAfter - a.elo, 10);
    expect(o.b.loss).toBeCloseTo(aWins.bAfter - b.elo, 10);
    expect(o.a.loss).toBeCloseTo(bWins.aAfter - a.elo, 10);
    expect(o.b.win).toBeCloseTo(bWins.bAfter - b.elo, 10);
  });
});
