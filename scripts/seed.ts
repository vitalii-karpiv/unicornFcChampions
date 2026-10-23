// Local dev only: wipes all data and creates 4 players with ~3 months of random matches.
// Seeded users all have the password "password123".
import { hashPassword } from "@/lib/auth/password";
import { db, pool } from "@/lib/db";
import { activityLog, loginAttempts, matchComments, matches, matchReactions, monthlyAwards, users } from "@/lib/db/schema";
import { replayAll } from "@/lib/matches/service";

const USERNAMES = ["vitalii", "max", "andrii", "oleh"];
const PASSWORD = "password123";
const DAYS = 90;
const MATCHES = 150;

// Small deterministic PRNG so every seed run produces the same history.
let state = 42;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const goals = () => Math.floor(rand() ** 1.6 * 6);

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

  await db.delete(matchReactions);
  await db.delete(matchComments);
  await db.delete(activityLog);
  await db.delete(monthlyAwards);
  await db.delete(loginAttempts);
  await db.delete(matches);
  await db.delete(users);

  const passwordHash = await hashPassword(PASSWORD);
  const created = await db
    .insert(users)
    .values(USERNAMES.map((username) => ({ username, passwordHash })))
    .returning({ id: users.id });

  // Skill bias so the leaderboard isn't flat.
  const skill = new Map(created.map((u, i) => [u.id, [1.3, 1.0, 0.9, 0.7][i]]));
  const now = Date.now();
  const rows = Array.from({ length: MATCHES }, () => {
    const a = pick(created).id;
    let b = pick(created).id;
    while (b === a) b = pick(created).id;
    // Evenings, spread over the last DAYS days.
    const day = Math.floor(rand() * DAYS);
    const playedAt = new Date(now - day * 86_400_000 - Math.floor(rand() * 4 * 3_600_000));
    return {
      playerAId: a,
      playerBId: b,
      goalsA: Math.round(goals() * skill.get(a)!),
      goalsB: Math.round(goals() * skill.get(b)!),
      playedAt: playedAt.getTime() > now ? new Date(now) : playedAt,
      createdBy: a,
    };
  });
  await db.insert(matches).values(rows);
  await db.transaction((tx) => replayAll(tx));

  console.log(`Seeded ${created.length} users (password "${PASSWORD}") and ${rows.length} matches.`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
