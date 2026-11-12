import { currentMonthKey, monthKey, shiftMonth } from "@/lib/domain/time";
import type { MatchRow } from "@/lib/domain/types";
import { START_COINS } from "./rules";
import { betReturn, settleBet } from "./settle";
import type { BetRecord, FuturesPayout, Wallet } from "./types";

export function wallets(
  userIds: string[],
  bets: BetRecord[],
  payouts: FuturesPayout[],
  matches: MatchRow[],
  now: Date,
): Map<string, Wallet> {
  const cur = currentMonthKey(now);
  const out = new Map<string, Wallet>();
  for (const userId of userIds) {
    out.set(userId, { userId, balance: START_COINS, atStake: 0, openCount: 0, won: 0, settled: 0, monthNet: 0 });
  }
  for (const p of payouts) {
    const w = out.get(p.userId);
    if (!w) continue;
    w.balance += p.amount;
    if (shiftMonth(p.month, 1) === cur) w.monthNet += p.amount;
  }
  for (const b of bets) {
    const w = out.get(b.userId);
    if (!w) continue;
    const { status } = settleBet(b, matches, now);
    const ret = betReturn(b, status);
    w.balance += ret - b.stake;
    if (status === "open") {
      w.atStake += b.stake;
      w.openCount += 1;
      continue;
    }
    if (status === "won") w.won += 1;
    if (status === "won" || status === "lost") w.settled += 1;
    if (monthKey(b.placedAt) === cur) w.monthNet += ret - b.stake;
  }
  return out;
}
