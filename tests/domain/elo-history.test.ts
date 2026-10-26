import { describe, expect, test } from "vitest";
import { eloHistoryByDay } from "@/lib/domain/elo-history";
import { replayElo } from "@/lib/domain/replay";
import { mk } from "../helpers/fixtures";

describe("eloHistoryByDay", () => {
  test("no matches means no rows", () => {
    expect(eloHistoryByDay([], ["a", "b"])).toEqual([]);
  });

  test("starts from a shared row the day before the first match", () => {
    const ms = replayElo([mk("a", "b", 2, 1, "2026-10-01T18:00:00Z")]);
    const rows = eloHistoryByDay(ms, ["a", "b"]);
    expect(rows[0]).toEqual({ day: "2026-09-30", elo: { a: 1000, b: 1000 } });
    expect(rows[1]).toEqual({ day: "2026-10-01", elo: { a: 1020, b: 980 } });
  });

  test("keeps the last rating of the day and carries it over days off", () => {
    const ms = replayElo([
      mk("a", "b", 2, 1, "2026-10-01T10:00:00Z"),
      mk("a", "b", 0, 1, "2026-10-01T11:00:00Z"),
      mk("b", "c", 1, 0, "2026-10-03T18:00:00Z"),
    ]);
    const rows = eloHistoryByDay(ms, ["a", "b", "c"]);
    expect(rows.map((r) => r.day)).toEqual(["2026-09-30", "2026-10-01", "2026-10-03"]);
    expect(rows[1].elo.a).toBe(Math.round(ms[1].aEloAfter));
    expect(rows[1].elo.c).toBe(1000);
    expect(rows[2].elo.a).toBe(rows[1].elo.a);
    expect(rows[2].elo.c).toBe(Math.round(ms[2].bEloAfter));
  });

  test("ignores players that were not asked for", () => {
    const ms = replayElo([mk("a", "b", 1, 0, "2026-10-01T18:00:00Z")]);
    expect(Object.keys(eloHistoryByDay(ms, ["a"])[1].elo)).toEqual(["a"]);
  });
});
