import { describe, expect, test } from "vitest";
import { headToHead } from "@/lib/domain/h2h";
import { replayElo } from "@/lib/domain/replay";
import { mk } from "../helpers/fixtures";

describe("headToHead", () => {
  const ms = replayElo([
    mk("a", "b", 3, 0, "2026-10-01T18:00:00Z"),
    mk("b", "a", 2, 1, "2026-10-02T18:00:00Z"),
    mk("b", "a", 1, 1, "2026-10-03T18:00:00Z"),
    mk("a", "c", 9, 0, "2026-10-04T18:00:00Z"),
  ]);

  test("counts from a's perspective even when a played as player B", () => {
    const h = headToHead(ms, "a", "b");
    expect(h).toMatchObject({ games: 3, aWins: 1, draws: 1, bWins: 1, aGoals: 5, bGoals: 3 });
    expect(h.biggestAWin!.id).toBe(ms[0].id);
    expect(h.biggestBWin!.id).toBe(ms[1].id);
    expect(h.recent.map((m) => m.id)).toEqual([ms[2].id, ms[1].id, ms[0].id]);
  });

  test("aEloNet sums a's deltas in these matches only", () => {
    const h = headToHead(ms, "a", "b");
    const expected =
      ms[0].aEloAfter - ms[0].aEloBefore + (ms[1].bEloAfter - ms[1].bEloBefore) + (ms[2].bEloAfter - ms[2].bEloBefore);
    expect(h.aEloNet).toBeCloseTo(expected, 10);
  });

  test("recent is capped at 10", () => {
    const many = replayElo(
      Array.from({ length: 12 }, (_, i) => mk("a", "b", 1, 0, `2026-10-${String(i + 1).padStart(2, "0")}T18:00:00Z`)),
    );
    expect(headToHead(many, "a", "b").recent).toHaveLength(10);
  });

  test("no matches", () => {
    expect(headToHead(ms, "b", "c")).toMatchObject({ games: 0, biggestAWin: null, biggestBWin: null, recent: [] });
  });
});
