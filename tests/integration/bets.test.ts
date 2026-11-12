import { afterAll, beforeAll, describe, expect, test } from "vitest";

// Runs against the local dev database from .env.local; skipped when none is configured.
try {
  process.loadEnvFile(".env.local");
} catch {}

describe.skipIf(!process.env.DATABASE_URL)("placeBet (db)", () => {
  let service: typeof import("@/lib/bets/service");
  let dbm: typeof import("@/lib/db");
  let schema: typeof import("@/lib/db/schema");
  let ids: { a: string; b: string; c: string };
  let selection: { key: string; label: string; odds: number };
  let day: string;
  const tag = `bt_${Date.now()}`;

  beforeAll(async () => {
    service = await import("@/lib/bets/service");
    dbm = await import("@/lib/db");
    schema = await import("@/lib/db/schema");
    const { dayMarkets } = await import("@/lib/domain/bets/markets");
    const { replayElo } = await import("@/lib/domain/replay");
    const { dayKey } = await import("@/lib/domain/time");
    const { db } = dbm;

    const created = await db
      .insert(schema.users)
      .values(["a", "b", "c"].map((s) => ({ username: `${tag}_${s}`, passwordHash: "x" })))
      .returning({ id: schema.users.id, username: schema.users.username });
    const byName = (s: string) => created.find((u) => u.username === `${tag}_${s}`)!.id;
    ids = { a: byName("a"), b: byName("b"), c: byName("c") };

    const DAY = 86_400_000;
    await db.insert(schema.matches).values(
      [1, 2, 3].map((d, i) => ({
        playerAId: ids.a,
        playerBId: ids.b,
        goalsA: 3 - i,
        goalsB: i,
        playedAt: new Date(Date.now() - d * DAY),
        createdBy: ids.a,
      })),
    );

    day = dayKey(new Date());
    const users = await db.select({ id: schema.users.id, username: schema.users.username }).from(schema.users);
    const markets = dayMarkets(day, replayElo(await db.select().from(schema.matches)), users);
    const pair = markets.pairs.find((p) => [p.a, p.b].sort().join() === [ids.a, ids.b].sort().join())!;
    const winner = pair.markets.find((m) => m.selections[0].spec.type === "winner")!;
    selection = winner.selections[0];
  });

  /** Wallet read straight from the database (the cached readers need a Next request). */
  async function walletOf(userId: string) {
    const { eq } = await import("drizzle-orm");
    const { wallets } = await import("@/lib/domain/bets/ledger");
    const { replayElo } = await import("@/lib/domain/replay");
    const { db } = dbm;
    const rows = await db.select().from(schema.bets).where(eq(schema.bets.userId, userId));
    const matchRows = replayElo(await db.select().from(schema.matches));
    return wallets([userId], rows, [], matchRows, new Date()).get(userId)!;
  }

  afterAll(async () => {
    if (!ids) return dbm?.pool.end();
    const { db, pool } = dbm;
    const { eq, inArray } = await import("drizzle-orm");
    const all = Object.values(ids);
    await db.delete(schema.bets).where(inArray(schema.bets.userId, all));
    await db.delete(schema.matches).where(eq(schema.matches.createdBy, ids.a));
    await db.delete(schema.users).where(inArray(schema.users.id, all));
    await pool.end();
  });

  test("cannot bet on a match you play in", async () => {
    await expect(
      service.placeBet(ids.a, { day, selectionKey: selection.key, label: selection.label, odds: selection.odds, stake: 10 }),
    ).rejects.toThrow("You can't bet on a match you play in.");
  });

  test("10 parallel 300-coin bets from 1000 coins: exactly 3 succeed", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.placeBet(ids.c, { day, selectionKey: selection.key, label: selection.label, odds: selection.odds, stake: 300 }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    for (const r of results) {
      if (r.status === "rejected") expect(r.reason.message).toBe("Not enough coins.");
    }
  });

  test("cancelling an open bet refunds the stake minus 10%, once, and only for its owner", async () => {
    const { eq } = await import("drizzle-orm");
    const { db } = dbm;
    const stake = 50;
    const betId = await service.placeBet(ids.c, {
      day,
      selectionKey: selection.key,
      label: selection.label,
      odds: selection.odds,
      stake,
    });
    const before = (await walletOf(ids.c)).balance;

    await expect(service.cancelBet(ids.a, betId)).rejects.toThrow("Bet not found.");
    expect(await service.cancelBet(ids.c, betId)).toBe(45);
    await expect(service.cancelBet(ids.c, betId)).rejects.toThrow("This bet is already cancelled.");

    const [row] = await db.select().from(schema.bets).where(eq(schema.bets.id, betId));
    expect(row.cancelledAt).toBeInstanceOf(Date);
    expect((await walletOf(ids.c)).balance).toBe(before + 45);
  });

  test("a settled bet can't be cancelled", async () => {
    const { db } = dbm;
    const placedAt = new Date(Date.now() - 3 * 3_600_000);
    const [bet] = await db
      .insert(schema.bets)
      .values({
        userId: ids.c,
        day,
        selectionKey: selection.key,
        label: selection.label,
        marketTitle: "Winner",
        scope: "a vs b",
        spec: { type: "winner", a: ids.a, b: ids.b, pick: ids.a },
        odds: 2,
        stake: 10,
        placedAt,
      })
      .returning({ id: schema.bets.id });
    await db.insert(schema.matches).values({
      playerAId: ids.a,
      playerBId: ids.b,
      goalsA: 2,
      goalsB: 1,
      playedAt: new Date(placedAt.getTime() + 3_600_000),
      createdBy: ids.a,
    });
    await expect(service.cancelBet(ids.c, bet.id)).rejects.toThrow("This bet is already settled.");
  });
});
