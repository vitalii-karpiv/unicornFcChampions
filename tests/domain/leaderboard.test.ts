import { describe, expect, test } from "vitest";
import { buildLeaderboard } from "@/lib/domain/leaderboard";
import { replayElo } from "@/lib/domain/replay";
import { mk } from "../helpers/fixtures";

describe("buildLeaderboard", () => {
  const users = [
    { id: "a", username: "andrii" },
    { id: "b", username: "bohdan" },
    { id: "c", username: "chris" },
    { id: "z", username: "zed" },
  ];
  const ms = replayElo([
    mk("a", "b", 2, 0, "2026-10-01T18:00:00Z"),
    mk("c", "a", 1, 1, "2026-10-02T18:00:00Z"),
    mk("b", "c", 0, 3, "2026-10-03T18:00:00Z"),
  ]);
  const rows = buildLeaderboard(ms, users);

  test("sorted by Elo, players without games last", () => {
    expect(rows.map((r) => r.username)).toEqual(["chris", "andrii", "bohdan", "zed"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, null]);
  });

  test("row stats", () => {
    expect(rows.find((r) => r.userId === "a")).toMatchObject({ games: 2, wins: 1, draws: 1, losses: 0, form: ["W", "D"] });
    expect(rows.find((r) => r.userId === "z")).toMatchObject({ games: 0, elo: 1000, form: [] });
  });
});
