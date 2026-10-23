// Usage: npm run reset-password <username>
// Sets a random password, signs the user out everywhere and prints the new password.
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db, pool } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeUsername } from "@/lib/domain/validation";

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error("Usage: npm run reset-password <username>");
  const username = normalizeUsername(arg);
  const password = randomBytes(9).toString("base64url"); // 12 chars

  const updated = await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.username, username))
    .returning({ id: users.id });
  if (!updated.length) throw new Error(`No user named "${username}"`);

  console.log(`New password for ${username}: ${password}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
