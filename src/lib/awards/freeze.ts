import "server-only";
import { desc, eq } from "drizzle-orm";
import { getRatedMatches, getUsers } from "@/lib/data/queries";
import { db } from "@/lib/db";
import { monthlyAwards } from "@/lib/db/schema";
import { computeAwards, type MonthAwards } from "@/lib/domain/awards";
import { monthStats, monthsToFreeze, type PlayerMonthStats } from "@/lib/domain/month";

/** Frozen snapshot as stored in JSON (reachedAt is only needed while computing). */
export type FrozenMonth = Omit<MonthAwards, "stats"> & { stats: Omit<PlayerMonthStats, "reachedAt">[] };

export async function liveAwards(month: string): Promise<MonthAwards> {
  const [matches, users] = await Promise.all([getRatedMatches(), getUsers()]);
  return computeAwards(month, monthStats(matches, month, users.map((u) => u.id)));
}

const toSnapshot = (a: MonthAwards): FrozenMonth => ({
  ...a,
  stats: a.stats
    .filter((s) => s.games > 0)
    .map((s) => {
      const { reachedAt, ...rest } = s;
      void reachedAt;
      return rest;
    }),
});

/** Lazily freeze every ended month that has matches. Safe to call concurrently. */
export async function ensureFrozenMonths(now = new Date()): Promise<void> {
  const [matches, frozen] = await Promise.all([
    getRatedMatches(),
    db.select({ month: monthlyAwards.month }).from(monthlyAwards),
  ]);
  const todo = monthsToFreeze(matches.map((m) => m.playedAt), new Set(frozen.map((f) => f.month)), now);
  for (const month of todo) {
    await db
      .insert(monthlyAwards)
      .values({ month, snapshot: toSnapshot(await liveAwards(month)) })
      .onConflictDoNothing();
  }
}

export async function getFrozenMonths(): Promise<FrozenMonth[]> {
  const rows = await db.select().from(monthlyAwards).orderBy(desc(monthlyAwards.month));
  return rows.map((r) => r.snapshot as FrozenMonth);
}

export async function getFrozenMonth(month: string): Promise<FrozenMonth | null> {
  const [row] = await db.select().from(monthlyAwards).where(eq(monthlyAwards.month, month));
  return row ? (row.snapshot as FrozenMonth) : null;
}
