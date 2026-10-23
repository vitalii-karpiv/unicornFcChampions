"use server";

import { getCurrentUser, setSessionCookie } from "@/lib/auth/session";

export async function refreshSession(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await setSessionCookie(user.id, user.tokenVersion);
}
