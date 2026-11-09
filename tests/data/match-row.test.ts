import { describe, expect, test } from "vitest";
import { toMatchRow } from "@/lib/data/match-row";

describe("toMatchRow", () => {
  test("rows cached before the stars migration read as 5★ v 5★ with real dates", () => {
    const r = toMatchRow({
      id: "m1",
      playerAId: "a",
      playerBId: "b",
      goalsA: 1,
      goalsB: 0,
      playedAt: "2026-11-01T18:00:00.000Z",
      createdAt: "2026-11-01T18:01:00.000Z",
      updatedAt: "2026-11-01T18:01:00.000Z",
    });
    expect(r).toMatchObject({ starsA: 10, starsB: 10 });
    expect(r.playedAt).toEqual(new Date("2026-11-01T18:00:00Z"));
    expect(r.createdAt).toBeInstanceOf(Date);
  });

  test("keeps stored stars", () => {
    const r = toMatchRow({ starsA: 6, starsB: 12, playedAt: new Date(), createdAt: new Date(), updatedAt: new Date() });
    expect(r).toMatchObject({ starsA: 6, starsB: 12 });
  });
});
