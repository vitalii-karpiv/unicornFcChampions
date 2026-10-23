import { z } from "zod";
import { isLockedDate } from "./time";

const goals = z.coerce.number().int().min(0).max(99);

export const matchInputSchema = z.object({
  playerAId: z.uuid(),
  playerBId: z.uuid(),
  goalsA: goals,
  goalsB: goals,
  playedAt: z.coerce.date(),
});

export type MatchInput = z.infer<typeof matchInputSchema>;

export const LOCKED_MONTH_MESSAGE = "That month is closed — matches from past months can't be added or changed.";
const FUTURE_TOLERANCE_MS = 5 * 60_000;

/** Business rules beyond shape validation. Returns an error message or null. */
export function checkMatchRules(i: MatchInput, now: Date): string | null {
  if (i.playerAId === i.playerBId) return "Pick two different players.";
  if (i.playedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) return "Match time can't be in the future.";
  if (isLockedDate(i.playedAt, now)) return LOCKED_MONTH_MESSAGE;
  return null;
}
