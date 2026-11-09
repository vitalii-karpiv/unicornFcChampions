import { describe, expect, test } from "vitest";
import { replayElo } from "@/lib/domain/replay";
import { playerResults } from "@/lib/domain/results";
import { formatStars, isStars, snapshotStars, STAR_VALUES, starsLabel, starStats, stepStars } from "@/lib/domain/stars";
import { mk } from "../helpers/fixtures";

describe("stars", () => {
  test("formatStars", () => {
    expect([1, 9, 10, 12].map(formatStars)).toEqual(["★0.5", "★4.5", "★5", "★5+"]);
  });

  test("starsLabel is the number without the glyph", () => {
    expect([1, 9, 10, 12].map(starsLabel)).toEqual(["0.5", "4.5", "5", "5+"]);
  });

  test("isStars accepts only the scale", () => {
    expect(STAR_VALUES.every(isStars)).toBe(true);
    for (const bad of [0, 11, 13, 9.5, "10", null]) expect(isStars(bad)).toBe(false);
  });

  test("stepStars skips 11 and clamps", () => {
    expect(stepStars(10, 1)).toBe(12);
    expect(stepStars(12, -1)).toBe(10);
    expect(stepStars(12, 1)).toBe(12);
    expect(stepStars(1, -1)).toBe(1);
    expect(stepStars(9, 1)).toBe(10);
  });

  test("snapshotStars reads pre-stars activity rows as 5★", () => {
    expect(snapshotStars({})).toEqual({ starsA: 10, starsB: 10 });
    expect(snapshotStars({ starsA: 12, starsB: 3 })).toEqual({ starsA: 12, starsB: 3 });
  });

  test("starStats buckets by stars only and averages 5+ as 6", () => {
    const ms = replayElo([
      mk("a", "b", 1, 0, "2026-10-01T18:00:00Z", { starsA: 8, starsB: 10 }), // a underdog W
      mk("b", "a", 1, 1, "2026-10-02T18:00:00Z", { starsA: 10, starsB: 10 }), // even D
      mk("a", "b", 0, 2, "2026-10-03T18:00:00Z", { starsA: 12, starsB: 9 }), // a favourite L
    ]);
    expect(starStats(playerResults(ms, "a"))).toEqual({
      avgStars: 5, // (4 + 5 + 6) / 3
      underdog: { w: 1, d: 0, l: 0 },
      even: { w: 0, d: 1, l: 0 },
      favourite: { w: 0, d: 0, l: 1 },
    });
    expect(starStats([]).avgStars).toBeNull();
  });

  test("playerResults reports stars from the player's side", () => {
    const ms = replayElo([mk("b", "a", 0, 1, "2026-10-01T18:00:00Z", { starsA: 12, starsB: 3 })]);
    expect(playerResults(ms, "a")[0]).toMatchObject({ starsFor: 3, starsAgainst: 12 });
  });
});
