import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SESSION_TTL_SECONDS, signSession, verifySession } from "./jwt";

export const SESSION_COOKIE = "session";
const REFRESH_AFTER_SECONDS = 24 * 60 * 60;

export type CurrentUser = { id: string; username: string; tokenVersion: number; needsRefresh: boolean };

export async function setSessionCookie(userId: string, ver: number): Promise<void> {
  const token = await signSession({ sub: userId, ver });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Verified user for this request, or null if the token is missing, invalid or revoked via token_version. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  const [user] = await db
    .select({ id: users.id, username: users.username, tokenVersion: users.tokenVersion })
    .from(users)
    .where(eq(users.id, payload.sub));
  if (!user || user.tokenVersion !== payload.ver) return null;
  return { ...user, needsRefresh: Date.now() / 1000 - payload.iat > REFRESH_AFTER_SECONDS };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
