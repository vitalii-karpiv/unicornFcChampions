import type { PlayerResult } from "./types";

/**
 * Team star ratings, stored as integer half-stars: 1…10 = 0.5★…5★, 12 = 5+ (legend teams, counts as 6★).
 * 11 is never valid.
 */
export const DEFAULT_STARS = 10;
export const STAR_VALUES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];

export const isStars = (n: unknown): n is number => typeof n === "number" && STAR_VALUES.includes(n);

/** Whole-star strength used by Elo: 12 (5+) → 6. */
export const starWhole = (half: number) => half / 2;

/** "4.5", "5", "5+" — pair with a star icon in the UI. */
export const starsLabel = (half: number) => (half === 12 ? "5+" : String(half / 2));

/** Plain-text form ("★4.5") for places that can't render an icon, such as the activity log. */
export const formatStars = (half: number) => `★${starsLabel(half)}`;

/** Next or previous value on the scale, clamped to its ends. */
export function stepStars(half: number, dir: 1 | -1): number {
  const i = STAR_VALUES.indexOf(half);
  const at = i === -1 ? STAR_VALUES.indexOf(DEFAULT_STARS) : i;
  return STAR_VALUES[Math.max(0, Math.min(STAR_VALUES.length - 1, at + dir))];
}

/** Stars from an activity-log snapshot; rows written before stars existed read as 5★ v 5★. */
export function snapshotStars(s: { starsA?: number; starsB?: number }): { starsA: number; starsB: number } {
  return { starsA: s.starsA ?? DEFAULT_STARS, starsB: s.starsB ?? DEFAULT_STARS };
}

export type WDL = { w: number; d: number; l: number };

/** Average team stars (whole stars, 5+ = 6) and W-D-L by team strength, judged by stars alone. */
export function starStats(rs: PlayerResult[]): { avgStars: number | null; underdog: WDL; even: WDL; favourite: WDL } {
  const empty = (): WDL => ({ w: 0, d: 0, l: 0 });
  const out = { underdog: empty(), even: empty(), favourite: empty() };
  let total = 0;
  for (const r of rs) {
    total += starWhole(r.starsFor);
    const bucket = r.starsFor < r.starsAgainst ? out.underdog : r.starsFor > r.starsAgainst ? out.favourite : out.even;
    bucket[r.outcome === "W" ? "w" : r.outcome === "D" ? "d" : "l"] += 1;
  }
  return { avgStars: rs.length ? total / rs.length : null, ...out };
}
