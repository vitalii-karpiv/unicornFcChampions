"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, requireUser, setSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { passwordSchema } from "@/lib/domain/validation";

export type SettingsState = { error?: string; ok?: boolean } | undefined;

export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = passwordSchema.safeParse(String(formData.get("next") ?? ""));
  if (!next.success) return { error: next.error.issues[0].message };
  if (next.data !== formData.get("confirm")) return { error: "New passwords don't match." };

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!row || !(await verifyPassword(row.passwordHash, current))) return { error: "Current password is wrong." };

  // Bumping token_version signs out every other device; this one gets a fresh cookie.
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(next.data), tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, user.id))
    .returning({ tokenVersion: users.tokenVersion });
  await setSessionCookie(user.id, updated.tokenVersion);
  return { ok: true };
}

export async function logoutEverywhere(): Promise<void> {
  const user = await requireUser();
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, user.id));
  await clearSessionCookie();
  redirect("/login");
}
