import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getFrozenMonths, type FrozenMonth } from "@/lib/awards/freeze";
import { toMatchRow } from "@/lib/data/match-row";
import { getBets, getPicks, getFuturesMarkets, getRatedMatches, getUsers } from "@/lib/data/queries";
import { db, type Tx } from "@/lib/db";
import { bets, futuresMarkets, futuresPicks, matches, monthlyAwards, users } from "@/lib/db/schema";
import {
  futuresOdds,
  futuresPayouts,
  FUTURES_QUESTIONS,
  picksOpen,
  type FuturesKey,
  type FuturesOdds,
  type FuturesPick,
} from "@/lib/domain/bets/futures";
import { wallets } from "@/lib/domain/bets/ledger";
import { dayMarkets } from "@/lib/domain/bets/markets";
import { checkBet } from "@/lib/domain/bets/place";
import { betReturn, settleBet } from "@/lib/domain/bets/settle";
import type { BetRecord, FuturesPayout, Wallet } from "@/lib/domain/bets/types";
import { replayElo } from "@/lib/domain/replay";
import { currentMonthKey, dayKey, shiftMonth } from "@/lib/domain/time";

export class BetRuleError extends Error {}

const BET_LOCK = 4243;

type PickRow = FuturesPick & { month: string };
export type MarketRow = { month: string; odds: FuturesOdds };

/** Futures payouts for every frozen month that has a market. Shared by the cached and in-transaction paths. */
export function computePayouts(markets: MarketRow[], picks: PickRow[], frozen: FrozenMonth[]): FuturesPayout[] {
  const out: FuturesPayout[] = [];
  for (const f of frozen) {
    const market = markets.find((m) => m.month === f.month);
    if (!market) continue;
    out.push(
      ...futuresPayouts(
        f.month,
        market.odds,
        picks.filter((p) => p.month === f.month),
        f,
      ),
    );
  }
  return out;
}

/**
 * Next month's futures market, created once there is enough history to price it (null until then).
 * Read uncached, so a market created during this render is visible straight away. Safe to call concurrently.
 */
export async function ensureFuturesMarket(now = new Date()): Promise<MarketRow | null> {
  const target = shiftMonth(currentMonthKey(now), 1);
  const read = async () => {
    const [row] = await db.select().from(futuresMarkets).where(eq(futuresMarkets.month, target));
    return row ? { month: row.month, odds: row.odds } : null;
  };
  const existing = await read();
  if (existing) return existing;
  const [matchList, userList] = await Promise.all([getRatedMatches(), getUsers()]);
  const odds = futuresOdds(target, matchList, userList.map((u) => u.id));
  if (!odds) return null;
  await db.insert(futuresMarkets).values({ month: target, odds }).onConflictDoNothing();
  // A concurrent request may have won the insert; return whichever row is stored.
  return read();
}

export async function getPayouts(): Promise<FuturesPayout[]> {
  const [markets, picks, frozen] = await Promise.all([getFuturesMarkets(), getPicks(), getFrozenMonths()]);
  return computePayouts(markets, picks, frozen);
}

export async function getWallets(now = new Date()): Promise<Map<string, Wallet>> {
  const [userList, betList, payouts, matchList] = await Promise.all([
    getUsers(),
    getBets(),
    getPayouts(),
    getRatedMatches(),
  ]);
  return wallets(userList.map((u) => u.id), betList, payouts, matchList, now);
}

async function loadPicks(tx: Tx): Promise<PickRow[]> {
  const rows = await tx.select().from(futuresPicks);
  return rows.map((r) => ({ month: r.month, userId: r.userId, question: r.question as FuturesKey, pickUserId: r.pickUserId }));
}

/** Cancels the user's own open bet for a fee; returns the coins given back. */
export async function cancelBet(userId: string, betId: string, now = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BET_LOCK}, hashtext(${userId}))`);

    const [bet] = (await tx
      .select()
      .from(bets)
      .where(and(eq(bets.id, betId), eq(bets.userId, userId)))) as BetRecord[];
    if (!bet) throw new BetRuleError("Bet not found.");

    const matchRows = replayElo((await tx.select().from(matches)).map(toMatchRow));
    const status = settleBet(bet, matchRows, now).status;
    if (status === "cancelled") throw new BetRuleError("This bet is already cancelled.");
    if (status !== "open") throw new BetRuleError("This bet is already settled.");

    await tx
      .update(bets)
      .set({ cancelledAt: now })
      .where(and(eq(bets.id, betId), isNull(bets.cancelledAt)));
    return betReturn(bet, "cancelled");
  });
}

export async function placeBet(
  userId: string,
  input: { day: string; selectionKey: string; label: string; odds: number; stake: number },
  now = new Date(),
): Promise<string> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BET_LOCK}, hashtext(${userId}))`);

    const userRows = await tx.select({ id: users.id, username: users.username }).from(users);
    const matchRows = replayElo((await tx.select().from(matches)).map(toMatchRow));
    const myBets = (await tx.select().from(bets).where(eq(bets.userId, userId))) as BetRecord[];
    const markets = await tx.select({ month: futuresMarkets.month, odds: futuresMarkets.odds }).from(futuresMarkets);
    const picks = await loadPicks(tx);
    const frozen = (await tx.select().from(monthlyAwards)).map((r) => r.snapshot as FrozenMonth);

    const payouts = computePayouts(markets, picks, frozen).filter((p) => p.userId === userId);
    const balance = wallets([userId], myBets, payouts, matchRows, now).get(userId)!.balance;

    const today = dayKey(now);
    const checked = checkBet(input, { today, markets: dayMarkets(today, matchRows, userRows), userId, balance, now });
    if ("error" in checked) throw new BetRuleError(checked.error);

    const [row] = await tx
      .insert(bets)
      .values({
        userId,
        day: input.day,
        selectionKey: input.selectionKey,
        label: checked.selection.label,
        marketTitle: checked.market.title,
        scope: checked.scope,
        spec: checked.selection.spec,
        odds: checked.selection.odds,
        stake: input.stake,
        placedAt: now,
      })
      .returning({ id: bets.id });
    return row.id;
  });
}

export async function setPick(
  userId: string,
  input: { month: string; question: FuturesKey; pickUserId: string | null },
  now = new Date(),
): Promise<void> {
  if (!picksOpen(input.month, now)) throw new BetRuleError("Picks for this month are closed.");
  if (!FUTURES_QUESTIONS.some((q) => q.key === input.question)) throw new BetRuleError("Unknown question.");
  const key = and(
    eq(futuresPicks.month, input.month),
    eq(futuresPicks.question, input.question),
    eq(futuresPicks.userId, userId),
  );
  if (input.pickUserId === null) {
    await db.delete(futuresPicks).where(key);
    return;
  }
  const [market] = await db.select().from(futuresMarkets).where(eq(futuresMarkets.month, input.month));
  if (market?.odds[input.question]?.[input.pickUserId] === undefined) {
    throw new BetRuleError("Pick a player from the list.");
  }
  await db
    .insert(futuresPicks)
    .values({ month: input.month, question: input.question, userId, pickUserId: input.pickUserId, updatedAt: now })
    .onConflictDoUpdate({
      target: [futuresPicks.month, futuresPicks.question, futuresPicks.userId],
      set: { pickUserId: input.pickUserId, updatedAt: now },
    });
}
