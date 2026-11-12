import { describe, expect, test } from "vitest";
import { dayMarkets } from "@/lib/domain/bets/markets";
import { checkBet, groupMarketsOpen } from "@/lib/domain/bets/place";
import { replayElo } from "@/lib/domain/replay";
import { formatOdds } from "@/lib/format";
import { mk } from "../../helpers/fixtures";

const users = [
  { id: "L", username: "Lena" },
  { id: "M", username: "Max" },
  { id: "N", username: "Nina" },
];
const markets = dayMarkets("2026-11-11", replayElo([mk("L", "M", 5, 3, "2026-11-05T12:00:00Z"), mk("L", "M", 4, 4, "2026-11-06T12:00:00Z"), mk("L", "N", 4, 4, "2026-11-07T12:00:00Z")]), users);
const pairSel = markets.pairs.find((p) => p.key.includes("L") && p.key.includes("M"))!.markets[0].selections[0];
const groupSel = markets.group[0].selections[0];
const ctx = { today: "2026-11-11", markets, userId: "N", balance: 100, now: new Date("2026-11-11T10:00:00Z") };
const input = { day: "2026-11-11", selectionKey: pairSel.key, label: pairSel.label, odds: pairSel.odds, stake: 10 };
const groupInput = { ...input, selectionKey: groupSel.key, label: groupSel.label, odds: groupSel.odds };
// November: Kyiv is UTC+2, so 22:00 Kyiv is 20:00Z.
const at2159 = new Date("2026-11-11T19:59:00Z");
const at2200 = new Date("2026-11-11T20:00:00Z");

describe("groupMarketsOpen", () => {
  test("open at 21:59 Kyiv, closed at 22:00", () => {
    expect(groupMarketsOpen(at2159)).toBe(true);
    expect(groupMarketsOpen(at2200)).toBe(false);
  });
  test("open again after Kyiv midnight", () => {
    expect(groupMarketsOpen(new Date("2026-11-11T22:30:00Z"))).toBe(true);
  });
});

describe("checkBet", () => {
  test("stale day", () => expect(checkBet({ ...input, day: "2026-11-10" }, ctx)).toEqual({ error: "These odds are from yesterday. Refresh and try again." }));
  test("unknown selection", () => expect(checkBet({ ...input, selectionKey: "x" }, ctx)).toEqual({ error: "This bet is no longer available." }));
  test("participant", () => expect(checkBet(input, { ...ctx, userId: "L" })).toEqual({ error: "You can't bet on a match you play in." }));
  test("group bets are open to participants", () => {
    expect("error" in checkBet(groupInput, { ...ctx, userId: "L" })).toBe(false);
  });
  test("group bets are open until 21:59 Kyiv", () => {
    expect("error" in checkBet(groupInput, { ...ctx, now: at2159 })).toBe(false);
  });
  test("group bets close at 22:00 Kyiv", () => {
    expect(checkBet(groupInput, { ...ctx, now: at2200 })).toEqual({ error: "Group bets for today are closed." });
  });
  test("pair bets stay open after 22:00 Kyiv", () => {
    expect("error" in checkBet(input, { ...ctx, now: at2200 })).toBe(false);
  });
  test("closed group check comes after not found", () => {
    expect(checkBet({ ...groupInput, selectionKey: "x" }, { ...ctx, now: at2200 })).toEqual({ error: "This bet is no longer available." });
  });
  test("odds changed", () => expect(checkBet({ ...input, odds: pairSel.odds + 1 }, ctx)).toEqual({ error: `The odds changed to ${formatOdds(pairSel.odds)}. Check and try again.` }));
  test("label changed", () => {
    expect(checkBet({ ...input, label: "Someone else" }, ctx)).toEqual({ error: "This bet changed. Check and try again." });
  });
  test("odds are checked before the label", () => {
    expect(checkBet({ ...input, odds: pairSel.odds + 1, label: "Someone else" }, ctx)).toEqual({ error: `The odds changed to ${formatOdds(pairSel.odds)}. Check and try again.` });
  });
  test("label is checked before the stake", () => {
    expect(checkBet({ ...input, label: "Someone else", stake: 0 }, ctx)).toEqual({ error: "This bet changed. Check and try again." });
  });
  test("stake not whole", () => {
    expect(checkBet({ ...input, stake: 1.5 }, ctx)).toEqual({ error: "Enter a whole number of coins." });
    expect(checkBet({ ...input, stake: 0 }, ctx)).toEqual({ error: "Enter a whole number of coins." });
  });
  test("not enough coins", () => {
    expect(checkBet({ ...input, stake: 101 }, ctx)).toEqual({ error: "Not enough coins." });
    expect(checkBet(input, { ...ctx, balance: -900 })).toEqual({ error: "Not enough coins." });
  });
  test("happy path", () => {
    const r = checkBet(input, ctx);
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.selection).toBe(pairSel);
      expect(r.scope).toBe("Lena vs Max");
    }
  });
});
