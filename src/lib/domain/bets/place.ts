import { TZDate } from "@date-fns/tz";
import { TZ } from "@/lib/domain/time";
import { formatOdds } from "@/lib/format";
import type { DayMarkets, Market, Selection } from "./markets";
import { findSelection } from "./markets";
import { GROUP_CLOSE_HOUR } from "./rules";
import { isParticipant } from "./settle";

/** Group markets take bets until GROUP_CLOSE_HOUR, Kyiv wall-clock time. */
export function groupMarketsOpen(now: Date): boolean {
  return new TZDate(now.getTime(), TZ).getHours() < GROUP_CLOSE_HOUR;
}

export function checkBet(
  input: { day: string; selectionKey: string; label: string; odds: number; stake: number },
  ctx: { today: string; markets: DayMarkets; userId: string; balance: number; now: Date },
): { error: string } | { selection: Selection; market: Market; scope: string } {
  if (input.day !== ctx.today) return { error: "These odds are from yesterday. Refresh and try again." };
  const found = findSelection(ctx.markets, input.selectionKey);
  if (!found) return { error: "This bet is no longer available." };
  if (found.selection.spec.type === "group" && !groupMarketsOpen(ctx.now)) {
    return { error: "Group bets for today are closed." };
  }
  if (isParticipant(found.selection.spec, ctx.userId)) return { error: "You can't bet on a match you play in." };
  if (found.selection.odds !== input.odds) {
    return { error: `The odds changed to ${formatOdds(found.selection.odds)}. Check and try again.` };
  }
  if (found.selection.label !== input.label) return { error: "This bet changed. Check and try again." };
  if (!Number.isInteger(input.stake) || input.stake < 1) return { error: "Enter a whole number of coins." };
  if (input.stake > ctx.balance) return { error: "Not enough coins." };
  return found;
}
