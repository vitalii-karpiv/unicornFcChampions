import { describe, expect, test } from "vitest";
import { replayElo } from "@/lib/domain/replay";
import { playerResults } from "@/lib/domain/results";
import { currentStreak, lastN, longestStreak } from "@/lib/domain/streaks";
import { mk } from "../helpers/fixtures";

// a's results: W W D W W W L
const scores: [number, number][] = [[1, 0], [2, 0], [1, 1], [3, 1], [1, 0], [2, 1], [0, 2]];
const ms = scores.map(([x, y], i) => mk("a", "b", x, y, `2026-10-0${i + 1}T18:00:00Z`));
const rs = playerResults(replayElo(ms), "a");

describe("streaks", () => {
  test("longest win streak and when it was reached", () => {
    expect(longestStreak(rs, "W")).toEqual({ length: 3, endMatchId: ms[5].id, reachedAt: ms[5].playedAt });
  });

  test("longest losing streak", () => {
    expect(longestStreak(rs, "L").length).toBe(1);
  });

  test("first time a max length is reached wins over a later equal run", () => {
    const tie = [[1, 0], [0, 1], [1, 0]].map(([x, y], i) => mk("a", "b", x, y, `2026-09-0${i + 1}T18:00:00Z`));
    const r = longestStreak(playerResults(replayElo(tie), "a"), "W");
    expect(r).toEqual({ length: 1, endMatchId: tie[0].id, reachedAt: tie[0].playedAt });
  });

  test("currentStreak", () => {
    expect(currentStreak(rs)).toEqual({ outcome: "L", length: 1 });
    expect(currentStreak(rs.slice(0, 6))).toEqual({ outcome: "W", length: 3 });
  });

  test("empty results", () => {
    expect(currentStreak([])).toEqual({ outcome: null, length: 0 });
    expect(longestStreak([], "W")).toEqual({ length: 0, endMatchId: null, reachedAt: null });
    expect(lastN([])).toEqual([]);
  });

  test("lastN returns the last 5 outcomes oldest to newest", () => {
    expect(lastN(rs)).toEqual(["D", "W", "W", "W", "L"]);
    expect(lastN(rs, 2)).toEqual(["W", "L"]);
  });
});
