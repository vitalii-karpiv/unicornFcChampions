import { describe, expect, test } from "vitest";
import { replayElo, sortMatches } from "@/lib/domain/replay";
import { mk } from "../helpers/fixtures";

describe("replayElo", () => {
  test("empty history", () => {
    expect(replayElo([])).toEqual([]);
  });

  test("chains ratings from one match to the next", () => {
    const m1 = mk("a", "b", 2, 1, "2026-10-01T18:00:00Z");
    const m2 = mk("a", "c", 0, 1, "2026-10-02T18:00:00Z");
    const [r1, r2] = replayElo([m2, m1]);
    expect(r1.id).toBe(m1.id);
    expect(r1).toMatchObject({ aEloBefore: 1000, aEloAfter: 1020, bEloBefore: 1000, bEloAfter: 980 });
    expect(r2.aEloBefore).toBe(1020);
    expect(r2.bEloBefore).toBe(1000);
    expect(r2.aEloAfter).toBeLessThan(1020);
  });

  test("switches to K=32 after 10 prior games", () => {
    const ms = Array.from({ length: 11 }, (_, i) =>
      mk("a", "b", 1, 1, `2026-10-01T${String(10 + i).padStart(2, "0")}:00:00Z`),
    );
    // 10 draws at equal ratings keep both at 1000, then an 11th game where a wins 1-0
    ms[10] = { ...ms[10], goalsA: 1, goalsB: 0 };
    const rated = replayElo(ms);
    expect(rated[10]).toMatchObject({ aEloAfter: 1016, bEloAfter: 984 });
  });

  test("same playedAt is ordered by createdAt, then id, regardless of input order", () => {
    const t = "2026-10-05T19:00:00Z";
    const x = mk("a", "b", 3, 0, t, { id: "x", createdAt: new Date("2026-10-05T19:05:00Z") });
    const y = mk("a", "b", 0, 3, t, { id: "y", createdAt: new Date("2026-10-05T19:01:00Z") });
    const z = mk("a", "b", 1, 0, t, { id: "a-z", createdAt: new Date("2026-10-05T19:05:00Z") });
    expect(sortMatches([x, y, z]).map((m) => m.id)).toEqual(["y", "a-z", "x"]);
    expect(replayElo([x, y, z])).toEqual(replayElo([z, x, y]));
  });
});
