"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { BetRuleError, cancelBet, placeBet, setPick } from "@/lib/bets/service";
import { CACHE_TAGS } from "@/lib/data/queries";
import { FUTURES_QUESTIONS, type FuturesKey } from "@/lib/domain/bets/futures";

const betInput = z.object({
  day: z.string(),
  selectionKey: z.string(),
  label: z.string(),
  odds: z.number(),
  stake: z.number(),
});

export async function placeBetAction(input: {
  day: string;
  selectionKey: string;
  label: string;
  odds: number;
  stake: number;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = betInput.safeParse(input);
  if (!parsed.success) return { error: "This bet is no longer available." };
  try {
    await placeBet(user.id, parsed.data);
  } catch (e) {
    if (e instanceof BetRuleError) return { error: e.message };
    throw e;
  }
  updateTag(CACHE_TAGS.bets);
  revalidatePath("/bets");
  revalidatePath("/");
  return {};
}

export async function cancelBetAction(betId: string): Promise<{ error?: string; refund?: number }> {
  const user = await requireUser();
  const parsed = z.uuid().safeParse(betId);
  if (!parsed.success) return { error: "Bet not found." };
  let refund: number;
  try {
    refund = await cancelBet(user.id, parsed.data);
  } catch (e) {
    if (e instanceof BetRuleError) return { error: e.message };
    throw e;
  }
  updateTag(CACHE_TAGS.bets);
  revalidatePath("/bets");
  revalidatePath("/");
  return { refund };
}

const pickInput = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  question: z.enum(FUTURES_QUESTIONS.map((q) => q.key) as [FuturesKey, ...FuturesKey[]]),
  pickUserId: z.string().nullable(),
});

export async function setPickAction(input: {
  month: string;
  question: FuturesKey;
  pickUserId: string | null;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = pickInput.safeParse(input);
  if (!parsed.success) return { error: "This pick is no longer available." };
  try {
    await setPick(user.id, parsed.data);
  } catch (e) {
    if (e instanceof BetRuleError) return { error: e.message };
    throw e;
  }
  updateTag(CACHE_TAGS.picks);
  revalidatePath("/bets");
  return {};
}
