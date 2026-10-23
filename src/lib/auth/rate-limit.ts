import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

const windowStart = () => new Date(Date.now() - WINDOW_MS);

export async function clearFailures(username: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
}

/**
 * Record the attempt *before* checking the password, then count including it.
 * Each insert commits before its count, so of N parallel attempts at most
 * MAX_FAILURES ever see a count within the limit — no check-then-act race.
 */
export async function attemptLogin(username: string, verify: () => Promise<boolean>): Promise<"ok" | "invalid" | "limited"> {
  await db.delete(loginAttempts).where(and(eq(loginAttempts.username, username), lt(loginAttempts.attemptedAt, windowStart())));
  await db.insert(loginAttempts).values({ username });
  const [{ n }] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.username, username), gt(loginAttempts.attemptedAt, windowStart())));
  if (n > MAX_FAILURES) return "limited";
  if (!(await verify())) return "invalid";
  await clearFailures(username);
  return "ok";
}
