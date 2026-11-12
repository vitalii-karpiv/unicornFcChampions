import { expect, test } from "vitest";
import { wallets } from "@/lib/domain/bets/ledger";
import type { BetRecord } from "@/lib/domain/bets/types";
import { mk } from "../../helpers/fixtures";

const bet = (id: string, stake: number, odds: number, placedAt: string, spec: BetRecord["spec"]): BetRecord => ({
  id, userId: "U", spec, odds, stake, placedAt: new Date(placedAt), label: "", marketTitle: "", scope: "",
});
const pair = (a: string, b: string) => ({ type: "winner", a, b, pick: a }) as const;

test("balance = 1000 + payouts − stakes + returns; open bets are at stake", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const won = bet("w", 100, 1.9, "2026-11-11T18:00:00Z", pair("A", "B"));
  const lost = bet("l", 50, 2, "2026-11-11T18:00:00Z", pair("C", "D"));
  const voided = bet("v", 30, 2, "2026-11-11T18:00:00Z", pair("E", "F"));
  const open = bet("o", 20, 2, "2026-11-19T18:00:00Z", pair("G", "H"));
  const matches = [
    mk("A", "B", 5, 1, "2026-11-11T19:00:00Z"),
    mk("D", "C", 5, 1, "2026-11-11T19:10:00Z"),
  ];
  const w = wallets(["U"], [won, lost, voided, open], [{ userId: "U", month: "2026-10", amount: 70 }], matches, now).get("U")!;
  expect(w.balance).toBe(1090);
  expect(w.atStake).toBe(20);
  expect(w.openCount).toBe(1);
  expect(w.won).toBe(1);
  expect(w.settled).toBe(2);
  expect(w.monthNet).toBe(110);
});

test("a re-settle can push the balance below zero", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  const a = bet("a", 500, 2, "2026-11-11T18:00:00Z", pair("A", "B"));
  const b = bet("b", 1400, 2, "2026-11-12T18:00:00Z", pair("C", "D"));
  const decider = mk("A", "B", 3, 0, "2026-11-11T19:00:00Z");
  expect(wallets(["U"], [a, b], [], [decider], now).get("U")!.balance).toBe(100);
  expect(wallets(["U"], [a, b], [], [], now).get("U")!.balance).toBe(-900);
});

test("a cancelled bet costs only the fee and doesn't count as settled", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const c = { ...bet("c", 100, 2, "2026-11-11T18:00:00Z", pair("A", "B")), cancelledAt: new Date("2026-11-11T18:20:00Z") };
  const w = wallets(["U"], [c], [], [mk("A", "B", 5, 1, "2026-11-11T19:00:00Z")], now).get("U")!;
  expect(w.balance).toBe(990);
  expect(w.atStake).toBe(0);
  expect(w.openCount).toBe(0);
  expect(w.won).toBe(0);
  expect(w.settled).toBe(0);
  expect(w.monthNet).toBe(-10);
});
