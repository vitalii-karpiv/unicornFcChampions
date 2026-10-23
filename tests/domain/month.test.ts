import { describe, expect, test } from "vitest";
import { monthStats } from "@/lib/domain/month";
import { replayElo } from "@/lib/domain/replay";
import { mk } from "../helpers/fixtures";

describe("monthStats", () => {
  const ms = replayElo([
    mk("a", "b", 2, 0, "2026-09-30T20:00:00Z"), // 23:00 Kyiv Sep 30 → September
    mk("a", "b", 1, 0, "2026-09-30T21:30:00Z"), // 00:30 Kyiv Oct 1 → October
    mk("b", "a", 3, 3, "2026-10-10T18:00:00Z"),
    mk("a", "c", 2, 1, "2026-10-12T18:00:00Z"),
    mk("a", "b", 0, 1, "2026-11-01T18:00:00Z"), // November
  ]);
  const stats = monthStats(ms, "2026-10", ["a", "b", "c", "d"]);
  const a = stats.find((s) => s.userId === "a")!;

  test("only counts matches in the Kyiv month", () => {
    expect(a).toMatchObject({ games: 3, wins: 2, draws: 1, losses: 0, goalsFor: 6, goalsAgainst: 4 });
    expect(a.winRate).toBeCloseTo(2 / 3);
  });

  test("eloGain is the sum of deltas within the month", () => {
    const inMonth = ms.slice(1, 4);
    const expected =
      inMonth[0].aEloAfter - inMonth[0].aEloBefore +
      (inMonth[1].bEloAfter - inMonth[1].bEloBefore) +
      (inMonth[2].aEloAfter - inMonth[2].aEloBefore);
    expect(a.eloGain).toBeCloseTo(expected, 10);
  });

  test("win streak does not carry over from the previous month and a draw breaks it", () => {
    expect(a.longestWinStreak).toBe(1);
  });

  test("reachedAt is the time of the last match that changed each stat", () => {
    expect(a.reachedAt.games).toEqual(ms[3].playedAt);
    expect(a.reachedAt.wins).toEqual(ms[3].playedAt);
    expect(a.reachedAt.goals).toEqual(ms[3].playedAt);
    expect(a.reachedAt.winStreak).toEqual(ms[1].playedAt);
  });

  test("players without games get zeroed stats", () => {
    expect(stats.find((s) => s.userId === "d")).toMatchObject({
      games: 0,
      wins: 0,
      eloGain: 0,
      winRate: 0,
      longestWinStreak: 0,
    });
  });
});
