import { describe, expect, test } from "vitest";
import { betReturn, cancelFee, isParticipant, settleBet } from "@/lib/domain/bets/settle";
import { mk } from "../../helpers/fixtures";

const P = new Date("2026-11-11T18:00:00Z"); // 20:00 Kyiv

describe("settleBet", () => {
  test("winner: ignores matches inside the 10-minute delay and reads sides by user id", () => {
    const early = mk("M", "L", 3, 5, "2026-11-11T18:05:00Z");
    const real = mk("M", "L", 4, 2, "2026-11-11T18:30:00Z");
    const r = settleBet({ spec: { type: "winner", a: "L", b: "M", pick: "L" }, placedAt: P }, [early, real], P);
    expect(r).toEqual({ status: "lost", matchIds: [real.id], at: real.playedAt });
  });
  test("pair bet with no match: open for 7 days, then void", () => {
    const bet = { spec: { type: "total", a: "L", b: "M", line: 9.5, side: "over" } as const, placedAt: P };
    expect(settleBet(bet, [], new Date(P.getTime() + 6 * 864e5)).status).toBe("open");
    expect(settleBet(bet, [], new Date(P.getTime() + 7 * 864e5))).toEqual({
      status: "void",
      matchIds: [],
      at: new Date(P.getTime() + 7 * 864e5),
    });
  });
  test("streak3: lost at the first non-win, won on the third win", () => {
    const spec = { type: "streak3", a: "L", b: "M", player: "L" } as const;
    const w = (iso: string) => mk("L", "M", 5, 3, iso);
    expect(
      settleBet({ spec, placedAt: P }, [w("2026-11-11T19:00Z"), mk("M", "L", 4, 4, "2026-11-11T19:20Z")], P).status,
    ).toBe("lost");
    expect(
      settleBet({ spec, placedAt: P }, [w("2026-11-11T19:00Z"), w("2026-11-11T19:20Z"), w("2026-11-12T19:00Z")], P).status,
    ).toBe("won");
  });
  test("group yes wins early; no wins at Kyiv midnight", () => {
    const big = mk("A", "B", 9, 1, "2026-11-11T19:00Z");
    expect(settleBet({ spec: { type: "group", cond: "bigWin", side: "yes" }, placedAt: P }, [big], P).status).toBe("won");
    const no = { spec: { type: "group", cond: "draw", side: "no" } as const, placedAt: P };
    expect(settleBet(no, [big], new Date("2026-11-11T21:59Z")).status).toBe("open");
    expect(settleBet(no, [big], new Date("2026-11-11T22:00Z")).status).toBe("won");
  });
  test("group bet at 23:55 Kyiv has an empty window and is refunded", () => {
    const r = settleBet(
      { spec: { type: "group", cond: "draw", side: "no" }, placedAt: new Date("2026-11-11T21:55Z") },
      [],
      new Date("2026-11-12T08:00Z"),
    );
    expect(r.status).toBe("void");
  });
  test("margin, score and playerGoals read goals by user id", () => {
    const m = mk("M", "L", 2, 6, "2026-11-11T19:00Z");
    const at = (spec: Parameters<typeof settleBet>[0]["spec"]) => settleBet({ spec, placedAt: P }, [m], P).status;
    expect(at({ type: "margin", a: "L", b: "M", winner: "L", min: 3, max: null })).toBe("won");
    expect(at({ type: "margin", a: "L", b: "M", winner: "L", min: 1, max: 3 })).toBe("lost");
    expect(at({ type: "score", a: "L", b: "M", goalsA: 6, goalsB: 2 })).toBe("won");
    expect(at({ type: "playerGoals", a: "L", b: "M", player: "M", line: 2.5, side: "under" })).toBe("won");
  });
});

describe("settleBet boundaries", () => {
  test("a match at exactly placedAt + 10 min counts", () => {
    const m = mk("L", "M", 5, 3, "2026-11-11T18:10:00Z");
    const r = settleBet({ spec: { type: "winner", a: "L", b: "M", pick: "L" }, placedAt: P }, [m], P);
    expect(r).toEqual({ status: "won", matchIds: [m.id], at: m.playedAt });
  });
  test("a match at exactly placedAt + 7 days does not count: the bet is void at that instant", () => {
    const expiry = new Date(P.getTime() + 7 * 864e5);
    const m = mk("L", "M", 5, 3, expiry.toISOString());
    const r = settleBet({ spec: { type: "winner", a: "L", b: "M", pick: "L" }, placedAt: P }, [m], expiry);
    expect(r).toEqual({ status: "void", matchIds: [], at: expiry });
  });
  test("a group match at exactly Kyiv midnight does not count", () => {
    const midnight = new Date("2026-11-11T22:00:00Z"); // 00:00 Kyiv on 12 Nov
    const draw = mk("A", "B", 4, 4, midnight.toISOString());
    const r = settleBet({ spec: { type: "group", cond: "draw", side: "yes" }, placedAt: P }, [draw], midnight);
    expect(r).toEqual({ status: "lost", matchIds: [], at: midnight });
  });
});

test("isParticipant", () => {
  expect(isParticipant({ type: "winner", a: "L", b: "M", pick: "draw" }, "M")).toBe(true);
  expect(isParticipant({ type: "group", cond: "draw", side: "yes" }, "M")).toBe(false);
});

describe("cancelled bets", () => {
  const spec = { type: "winner", a: "L", b: "M", pick: "L" } as const;
  const cancelledAt = new Date("2026-11-11T19:00:00Z");

  test("a cancelled bet stays cancelled, even if a match later turns up that would have settled it", () => {
    const m = mk("L", "M", 5, 1, "2026-11-11T18:30:00Z");
    expect(settleBet({ spec, placedAt: P, cancelledAt }, [m], P)).toEqual({
      status: "cancelled",
      matchIds: [],
      at: cancelledAt,
    });
  });

  test("cancelling returns the stake minus a 10% fee, rounded up so there is always a fee", () => {
    expect(cancelFee(100)).toBe(10);
    expect(cancelFee(55)).toBe(6);
    expect(cancelFee(1)).toBe(1);
    expect(betReturn({ stake: 100, odds: 2 }, "cancelled")).toBe(90);
    expect(betReturn({ stake: 55, odds: 2 }, "cancelled")).toBe(49);
  });
});
