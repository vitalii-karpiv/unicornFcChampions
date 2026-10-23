import { describe, expect, test } from "vitest";
import { computeRecords } from "@/lib/domain/records";
import { replayElo } from "@/lib/domain/replay";
import { mk } from "../helpers/fixtures";

describe("computeRecords", () => {
  test("empty history → all null", () => {
    expect(computeRecords([], ["a", "b"])).toEqual({
      longestWinStreak: null,
      longestLossStreak: null,
      biggestWin: null,
      highestElo: null,
      mostGoalsInMatch: null,
    });
  });

  test("biggest win: larger goal difference, then more total goals", () => {
    const ms = replayElo([
      mk("a", "b", 4, 0, "2026-10-01T18:00:00Z"),
      mk("b", "a", 5, 0, "2026-10-02T18:00:00Z"),
      mk("a", "b", 6, 1, "2026-10-03T18:00:00Z"),
    ]);
    expect(computeRecords(ms, ["a", "b"]).biggestWin).toMatchObject({ userId: "a", value: 5, matchId: ms[2].id });
  });

  test("streaks, highest Elo and most goals in a match", () => {
    const ms = replayElo([
      mk("a", "b", 1, 0, "2026-10-01T18:00:00Z"),
      mk("a", "b", 1, 0, "2026-10-02T18:00:00Z"),
      mk("b", "a", 7, 2, "2026-10-03T18:00:00Z"),
    ]);
    const r = computeRecords(ms, ["a", "b"]);
    expect(r.longestWinStreak).toMatchObject({ userId: "a", value: 2, matchId: ms[1].id });
    expect(r.longestLossStreak).toMatchObject({ userId: "b", value: 2 });
    expect(r.highestElo).toMatchObject({ userId: "a", value: ms[1].aEloAfter, matchId: ms[1].id });
    expect(r.mostGoalsInMatch).toMatchObject({ userId: "b", value: 7, matchId: ms[2].id });
  });

  test("only draws → no win/loss streak and no biggest win", () => {
    const ms = replayElo([mk("a", "b", 0, 0, "2026-10-01T18:00:00Z")]);
    const r = computeRecords(ms, ["a", "b"]);
    expect(r.longestWinStreak).toBeNull();
    expect(r.biggestWin).toBeNull();
    expect(r.mostGoalsInMatch).toBeNull();
  });
});
