"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { attemptLogin } from "@/lib/auth/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeUsername, passwordSchema, usernameSchema } from "@/lib/domain/validation";

export type AuthState = { error?: string; username?: string } | undefined;

// Drizzle wraps driver errors; the pg error (with its SQLSTATE code) is on `cause`.
const isUniqueViolation = (e: unknown): boolean => {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
};

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = String(formData.get("username") ?? "");
  const username = usernameSchema.safeParse(raw);
  if (!username.success) return { error: username.error.issues[0].message, username: raw };
  const password = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message, username: raw };

  let user: { id: string; tokenVersion: number };
  try {
    [user] = await db
      .insert(users)
      .values({ username: username.data, passwordHash: await hashPassword(password.data) })
      .returning({ id: users.id, tokenVersion: users.tokenVersion });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "That username is taken.", username: raw };
    throw e;
  }
  await setSessionCookie(user.id, user.tokenVersion);
  redirect("/");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = String(formData.get("username") ?? "");
  const username = normalizeUsername(raw);
  const password = String(formData.get("password") ?? "");

  const [user] = await db.select().from(users).where(eq(users.username, username));
  const result = await attemptLogin(username, async () => !!user && (await verifyPassword(user.passwordHash, password)));
  if (result === "limited") return { error: "Too many attempts, try again in 15 minutes.", username: raw };
  if (result === "invalid" || !user) return { error: "Wrong username or password.", username: raw };
  await setSessionCookie(user.id, user.tokenVersion);
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
