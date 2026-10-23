import { describe, expect, test } from "vitest";
import { replayElo } from "@/lib/domain/replay";
import { currentElo, peakElo, playerResults } from "@/lib/domain/results";
import { mk } from "../helpers/fixtures";

describe("playerResults", () => {
  const rated = replayElo([
    mk("a", "b", 2, 1, "2026-10-01T18:00:00Z"),
    mk("b", "a", 3, 3, "2026-10-02T18:00:00Z"),
    mk("c", "a", 2, 0, "2026-10-03T18:00:00Z"),
  ]);

  test("returns the player's perspective chronologically", () => {
    const rs = playerResults(rated, "a");
    expect(rs.map((r) => r.outcome)).toEqual(["W", "D", "L"]);
    expect(rs[2]).toMatchObject({ opponentId: "c", goalsFor: 0, goalsAgainst: 2 });
    expect(rs[0].eloDelta).toBe(20);
    expect(rs[0].eloAfter - rs[0].eloBefore).toBe(rs[0].eloDelta);
  });

  test("player B side is flipped", () => {
    const rs = playerResults(rated, "b");
    expect(rs[0]).toMatchObject({ outcome: "L", goalsFor: 1, goalsAgainst: 2, eloDelta: -20 });
  });

  test("a player with no matches has no results and Elo 1000", () => {
    expect(playerResults(rated, "nobody")).toEqual([]);
    expect(currentElo(rated, "nobody")).toBe(1000);
    expect(peakElo(rated, "nobody")).toBe(1000);
  });

  test("currentElo is the latest eloAfter, peakElo the max ever (including start)", () => {
    const rs = playerResults(rated, "a");
    expect(currentElo(rated, "a")).toBe(rs[2].eloAfter);
    expect(peakElo(rated, "a")).toBe(1020);
    expect(peakElo(rated, "c")).toBeGreaterThan(1000);
    expect(peakElo(rated, "b")).toBe(1000);
  });
});
