import { describe, expect, test } from "vitest";
import { fairOdds, gridProb, priceOdds, scoreGrid, splitLambdas } from "@/lib/domain/bets/pricing";

describe("pricing", () => {
  test("priceOdds applies a 5% margin and floors", () => {
    expect(priceOdds(0.5)).toBe(1.9);
    expect(priceOdds(0.25)).toBe(3.8);
    expect(priceOdds(0.98)).toBe(1.01);
    expect(priceOdds(0.009)).toBeNull();
    expect(priceOdds(0.011)).toBe(50);
  });
  test("fairOdds has no margin", () => {
    expect(fairOdds(0.25)).toBe(4);
    expect(fairOdds(0.01)).toBe(100);
  });
  test("scoreGrid sums to ~1", () => {
    const g = scoreGrid(5, 4);
    expect(gridProb(g, () => true)).toBeCloseTo(1, 6);
  });
  test("splitLambdas: equal strength splits evenly, favourite gets more goals", () => {
    expect(splitLambdas(10, 0.5).la).toBeCloseTo(5, 4);
    const { la, lb } = splitLambdas(10, 0.76);
    expect(la + lb).toBeCloseTo(10, 9);
    const g = scoreGrid(la, lb);
    expect(gridProb(g, (i, j) => i > j) + gridProb(g, (i, j) => i === j) / 2).toBeCloseTo(0.76, 4);
  });
});
