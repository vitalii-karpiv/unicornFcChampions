import { MARGIN, MAX_DAILY_ODDS, MAX_FUTURES_ODDS, MIN_PROB } from "./rules";

/** P(X = k) for X ~ Poisson(lambda), via an iterative product (no factorial overflow). */
export function poisson(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

/** grid[i][j] = P(A scores i, B scores j) for independent Poisson scores, 0..max each. */
export function scoreGrid(la: number, lb: number, max = 40): number[][] {
  const pa = Array.from({ length: max + 1 }, (_, i) => poisson(i, la));
  const pb = Array.from({ length: max + 1 }, (_, j) => poisson(j, lb));
  return pa.map((a) => pb.map((b) => a * b));
}

export function gridProb(grid: number[][], pred: (i: number, j: number) => boolean): number {
  let sum = 0;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) if (pred(i, j)) sum += grid[i][j];
  }
  return sum;
}

function expectedShare(la: number, lb: number): number {
  const g = scoreGrid(la, lb);
  return gridProb(g, (i, j) => i > j) + gridProb(g, (i, j) => i === j) / 2;
}

/** Split `total` expected goals so that P(A wins) + ½·P(draw) equals `expectedA`. */
export function splitLambdas(total: number, expectedA: number): { la: number; lb: number } {
  let lo = 0;
  let hi = 1;
  for (let n = 0; n < 60; n++) {
    const mid = (lo + hi) / 2;
    if (expectedShare(total * mid, total * (1 - mid)) < expectedA) lo = mid;
    else hi = mid;
  }
  const share = (lo + hi) / 2;
  return { la: total * share, lb: total - total * share };
}

/** Decimal odds with margin, floored to 2 decimals; null when the outcome is too unlikely to offer. */
export function priceOdds(p: number): number | null {
  if (p < MIN_PROB) return null;
  const floored = Math.floor((1 / (p * (1 + MARGIN))) * 100 + 1e-9) / 100;
  return Math.min(MAX_DAILY_ODDS, Math.max(1.01, floored));
}

/** Margin-free decimal odds, rounded to 2 decimals. */
export function fairOdds(p: number): number {
  return Math.min(MAX_FUTURES_ODDS, Math.max(1.01, Math.round((1 / p) * 100) / 100));
}
