import { afterAll, beforeAll, describe, expect, test } from "vitest";

// Runs against the local dev database from .env.local; skipped when none is configured.
try {
  process.loadEnvFile(".env.local");
} catch {}

describe.skipIf(!process.env.DATABASE_URL)("login rate limit (db)", () => {
  let rl: typeof import("@/lib/auth/rate-limit");
  let pool: typeof import("@/lib/db").pool;
  const username = `rl_test_${Date.now()}`;
  const slowWrongPassword = () => new Promise<boolean>((r) => setTimeout(() => r(false), 30));

  beforeAll(async () => {
    rl = await import("@/lib/auth/rate-limit");
    pool = (await import("@/lib/db")).pool;
  });

  afterAll(async () => {
    await rl.clearFailures(username);
    await rl.clearFailures(`${username}_ok`);
    await pool.end();
  });

  test("20 parallel wrong-password attempts get at most 5 password checks", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => rl.attemptLogin(username, slowWrongPassword)));
    expect(results.filter((r) => r === "invalid").length).toBeLessThanOrEqual(5);
    expect(results.filter((r) => r === "limited").length).toBeGreaterThanOrEqual(15);
  });

  test("a correct password within the limit succeeds and clears failures", async () => {
    const u = `${username}_ok`;
    for (let i = 0; i < 4; i++) expect(await rl.attemptLogin(u, async () => false)).toBe("invalid");
    expect(await rl.attemptLogin(u, async () => true)).toBe("ok");
    for (let i = 0; i < 5; i++) expect(await rl.attemptLogin(u, async () => false)).toBe("invalid");
    expect(await rl.attemptLogin(u, async () => true)).toBe("limited");
  });
});
