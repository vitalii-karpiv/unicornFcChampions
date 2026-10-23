"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { matchComments, matchReactions } from "@/lib/db/schema";
import { fromKyivLocal } from "@/lib/domain/time";
import { commentSchema, isReaction, matchInputSchema } from "@/lib/domain/validation";
import { createMatch, deleteMatch, MatchRuleError, updateMatch } from "@/lib/matches/service";

export type FormState = { error?: string } | undefined;

export async function saveMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = matchInputSchema.safeParse({
    playerAId: formData.get("playerAId"),
    playerBId: formData.get("playerBId"),
    goalsA: formData.get("goalsA"),
    goalsB: formData.get("goalsB"),
    playedAt: fromKyivLocal(String(formData.get("playedAt") ?? "")),
  });
  if (!parsed.success) return { error: "Check the players, score and time." };

  const id = String(formData.get("id") ?? "");
  let matchId = id;
  try {
    if (id) await updateMatch(user.id, id, parsed.data);
    else matchId = await createMatch(user.id, parsed.data);
  } catch (e) {
    if (e instanceof MatchRuleError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/matches/${matchId}`);
}

export async function removeMatch(id: string): Promise<FormState> {
  const user = await requireUser();
  try {
    await deleteMatch(user.id, id);
  } catch (e) {
    if (e instanceof MatchRuleError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function addComment(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const body = commentSchema.safeParse(String(formData.get("body") ?? ""));
  if (!body.success) return { error: body.error.issues[0].message };
  await db.insert(matchComments).values({ matchId, userId: user.id, body: body.data });
  revalidatePath(`/matches/${matchId}`);
  return {};
}

export async function deleteComment(commentId: string, matchId: string): Promise<void> {
  const user = await requireUser();
  await db.delete(matchComments).where(and(eq(matchComments.id, commentId), eq(matchComments.userId, user.id)));
  revalidatePath(`/matches/${matchId}`);
}

export async function toggleReaction(matchId: string, emoji: string): Promise<void> {
  const user = await requireUser();
  if (!isReaction(emoji)) return;
  const where = and(
    eq(matchReactions.matchId, matchId),
    eq(matchReactions.userId, user.id),
    eq(matchReactions.emoji, emoji),
  );
  const deleted = await db.delete(matchReactions).where(where).returning();
  if (!deleted.length) await db.insert(matchReactions).values({ matchId, userId: user.id, emoji }).onConflictDoNothing();
  revalidatePath(`/matches/${matchId}`);
}
