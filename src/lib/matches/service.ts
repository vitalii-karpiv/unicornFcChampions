import { eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { activityLog, matches } from "@/lib/db/schema";
import { replayElo } from "@/lib/domain/replay";
import { isLockedDate } from "@/lib/domain/time";
import { checkMatchRules, LOCKED_MONTH_MESSAGE, type MatchInput } from "@/lib/domain/validation";

export class MatchRuleError extends Error {}

const REPLAY_LOCK = 4242;

type MatchSnapshot = Pick<MatchInput, "playerAId" | "playerBId" | "goalsA" | "goalsB"> & { playedAt: string };

const snapshot = (m: MatchInput): MatchSnapshot => ({
  playerAId: m.playerAId,
  playerBId: m.playerBId,
  goalsA: m.goalsA,
  goalsB: m.goalsB,
  playedAt: m.playedAt.toISOString(),
});

/** Recompute all ratings and write back the rows whose Elo changed. */
export async function replayAll(tx: Tx): Promise<void> {
  const rows = await tx.select().from(matches);
  const current = new Map(rows.map((r) => [r.id, r]));
  for (const r of replayElo(rows)) {
    const old = current.get(r.id)!;
    if (
      old.aEloBefore === r.aEloBefore &&
      old.aEloAfter === r.aEloAfter &&
      old.bEloBefore === r.bEloBefore &&
      old.bEloAfter === r.bEloAfter
    ) {
      continue;
    }
    await tx
      .update(matches)
      .set({ aEloBefore: r.aEloBefore, aEloAfter: r.aEloAfter, bEloBefore: r.bEloBefore, bEloAfter: r.bEloAfter })
      .where(eq(matches.id, r.id));
  }
}

async function inLockedTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${REPLAY_LOCK})`);
    const result = await fn(tx);
    await replayAll(tx);
    return result;
  });
}

function assertRules(i: MatchInput, now: Date) {
  const error = checkMatchRules(i, now);
  if (error) throw new MatchRuleError(error);
}

async function loadEditable(tx: Tx, id: string, now: Date) {
  const [existing] = await tx.select().from(matches).where(eq(matches.id, id));
  if (!existing) throw new MatchRuleError("Match not found.");
  if (isLockedDate(existing.playedAt, now)) throw new MatchRuleError(LOCKED_MONTH_MESSAGE);
  return existing;
}

export async function createMatch(actorId: string, i: MatchInput, now = new Date()): Promise<string> {
  assertRules(i, now);
  return inLockedTx(async (tx) => {
    const [row] = await tx
      .insert(matches)
      .values({ ...i, createdBy: actorId })
      .returning({ id: matches.id });
    await tx.insert(activityLog).values({ actorId, action: "create", matchId: row.id, after: snapshot(i) });
    return row.id;
  });
}

export async function updateMatch(actorId: string, id: string, i: MatchInput, now = new Date()): Promise<void> {
  assertRules(i, now);
  await inLockedTx(async (tx) => {
    const existing = await loadEditable(tx, id, now);
    await tx
      .update(matches)
      .set({ ...i, updatedAt: now })
      .where(eq(matches.id, id));
    await tx
      .insert(activityLog)
      .values({ actorId, action: "update", matchId: id, before: snapshot(existing), after: snapshot(i) });
  });
}

export async function deleteMatch(actorId: string, id: string, now = new Date()): Promise<void> {
  await inLockedTx(async (tx) => {
    const existing = await loadEditable(tx, id, now);
    await tx.delete(matches).where(eq(matches.id, id));
    await tx.insert(activityLog).values({ actorId, action: "delete", matchId: id, before: snapshot(existing) });
  });
}
