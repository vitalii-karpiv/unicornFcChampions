import { describe, expect, test } from "vitest";
import { expectedScore, goalDiffMultiplier, kFactor, rateMatch, START_ELO } from "@/lib/domain/elo";

describe("elo", () => {
  test("start rating is 1000", () => {
    expect(START_ELO).toBe(1000);
  });

  test("expectedScore", () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
    expect(expectedScore(1200, 1000)).toBeCloseTo(0.7597, 4);
  });

  test("goalDiffMultiplier follows World Football Elo", () => {
    expect(goalDiffMultiplier(0)).toBe(1);
    expect(goalDiffMultiplier(1)).toBe(1);
    expect(goalDiffMultiplier(2)).toBe(1.5);
    expect(goalDiffMultiplier(3)).toBe(1.75);
    expect(goalDiffMultiplier(5)).toBe(2);
  });

  test("kFactor is 40 for the first 10 games, then 32", () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(9)).toBe(40);
    expect(kFactor(10)).toBe(32);
  });

  test("new players, 2-1 at equal ratings", () => {
    expect(rateMatch({ ra: 1000, rb: 1000, priorA: 0, priorB: 0, goalsA: 2, goalsB: 1 })).toEqual({
      aAfter: 1020,
      bAfter: 980,
    });
  });

  test("established players, 3-0 applies the 1.75 multiplier", () => {
    expect(rateMatch({ ra: 1000, rb: 1000, priorA: 20, priorB: 20, goalsA: 3, goalsB: 0 })).toEqual({
      aAfter: 1028,
      bAfter: 972,
    });
  });

  test("draw at equal ratings changes nothing", () => {
    expect(rateMatch({ ra: 1000, rb: 1000, priorA: 5, priorB: 30, goalsA: 2, goalsB: 2 })).toEqual({
      aAfter: 1000,
      bAfter: 1000,
    });
  });

  test("each player uses their own K-factor", () => {
    expect(rateMatch({ ra: 1000, rb: 1000, priorA: 0, priorB: 20, goalsA: 1, goalsB: 0 })).toEqual({
      aAfter: 1020,
      bAfter: 984,
    });
  });

  test("away win (B wins) moves ratings the other way", () => {
    expect(rateMatch({ ra: 1000, rb: 1000, priorA: 0, priorB: 0, goalsA: 0, goalsB: 1 })).toEqual({
      aAfter: 980,
      bAfter: 1020,
    });
  });
});
