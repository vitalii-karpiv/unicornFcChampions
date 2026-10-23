import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

const windowStart = () => new Date(Date.now() - WINDOW_MS);

export async function isRateLimited(username: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.username, username), gt(loginAttempts.attemptedAt, windowStart())));
  return row.n >= MAX_FAILURES;
}

export async function recordFailure(username: string): Promise<void> {
  await db.insert(loginAttempts).values({ username });
  await db.delete(loginAttempts).where(and(eq(loginAttempts.username, username), lt(loginAttempts.attemptedAt, windowStart())));
}

export async function clearFailures(username: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
}
