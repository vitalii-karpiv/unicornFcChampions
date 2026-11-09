"use server";

import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { LATEST_RELEASE } from "@/lib/releases";

/** Called when the "What's new" popup is closed in any way: every release up to the latest counts as seen. */
export async function markReleasesSeen(): Promise<void> {
  const user = await requireUser();
  await db.update(users).set({ lastSeenRelease: LATEST_RELEASE }).where(eq(users.id, user.id));
}
