"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setPickAction } from "@/app/(app)/bets/actions";
import { Avatar } from "@/components/avatar";
import type { FuturesKey } from "@/lib/domain/bets/futures";
import { FUTURES_BASE } from "@/lib/domain/bets/rules";
import { coins, formatOdds } from "@/lib/format";
import { cn } from "@/lib/utils";

export type FuturesOption = { userId: string; username: string; odds: number };
export type FuturesQuestionData = {
  key: FuturesKey;
  label: string;
  emoji: string;
  sub?: string;
  /** Favourites first. */
  options: FuturesOption[];
};
type Picks = Partial<Record<FuturesKey, string>>;

const payout = (odds: number) => Math.round(FUTURES_BASE * odds);

/** Header card plus one card per question; picks update optimistically and revert (with a toast) on error. */
export function FuturesPicker({
  month,
  monthName,
  closesIn,
  questions,
  picks,
  viewerId,
}: {
  /** Target month key, "YYYY-MM". */
  month: string;
  /** e.g. "December" */
  monthName: string;
  /** e.g. "19d 4h" */
  closesIn: string;
  questions: FuturesQuestionData[];
  picks: Picks;
  viewerId: string;
}) {
  const [shown, setShown] = useOptimistic(picks, (state: Picks, next: { key: FuturesKey; userId: string | null }) => {
    const out = { ...state };
    if (next.userId === null) delete out[next.key];
    else out[next.key] = next.userId;
    return out;
  });
  const [, startTransition] = useTransition();

  const toggle = (key: FuturesKey, userId: string) => {
    const pickUserId = shown[key] === userId ? null : userId;
    startTransition(async () => {
      setShown({ key, userId: pickUserId });
      const res = await setPickAction({ month, question: key, pickUserId });
      if (res.error) toast.error(res.error);
    });
  };

  const chosen = questions
    .map((q) => q.options.find((o) => o.userId === shown[q.key]))
    .filter((o): o is FuturesOption => o !== undefined);
  const ifAllHit = chosen.reduce((sum, o) => sum + payout(o.odds), 0);

  return (
    <>
      <div className="flex flex-col gap-2.5 rounded-xl border bg-card p-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold">{monthName} picks</div>
            <p className="text-xs text-muted-foreground">Free to play · a correct pick pays {FUTURES_BASE} × odds</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted-foreground">Closes in</div>
            <div className="tabular font-mono font-semibold">{closesIn}</div>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-200"
            style={{ width: `${(chosen.length / questions.length) * 100}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {chosen.length} of {questions.length} picked
          </span>
          <span>
            if all hit: <span className="tabular font-mono font-semibold text-foreground">{coins(ifAllHit)}</span>
          </span>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {questions.map((q) => (
          <FuturesQuestion
            key={q.key}
            question={q}
            selected={shown[q.key]}
            viewerId={viewerId}
            onPick={(userId) => toggle(q.key, userId)}
          />
        ))}
      </div>
    </>
  );
}

function FuturesQuestion({
  question,
  selected,
  viewerId,
  onPick,
}: {
  question: FuturesQuestionData;
  selected: string | undefined;
  viewerId: string;
  onPick: (userId: string) => void;
}) {
  const pick = question.options.find((o) => o.userId === selected);
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border bg-card px-3.5 py-3">
      <div className="flex items-center gap-2 font-medium">
        <span aria-hidden>{question.emoji}</span>
        <span className="min-w-0 truncate">{question.label}</span>
        {question.sub && <span className="text-xs font-normal whitespace-nowrap text-muted-foreground">{question.sub}</span>}
        <span className="ml-auto text-xs font-normal whitespace-nowrap text-muted-foreground">
          {pick ? (
            <>
              pays <span className="tabular font-mono font-semibold text-foreground">{coins(payout(pick.odds))}</span>
            </>
          ) : (
            "pick one"
          )}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {question.options.map((o) => {
          const isSel = o.userId === selected;
          const name = o.userId === viewerId ? "you" : o.username;
          return (
            <button
              key={o.userId}
              type="button"
              aria-pressed={isSel}
              aria-label={`${name} ${formatOdds(o.odds)}`}
              onClick={() => onPick(o.userId)}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg border bg-background px-1 py-2 text-xs transition-colors hover:bg-muted",
                isSel && "border-foreground shadow-[inset_0_0_0_1px_var(--foreground)]",
              )}
            >
              <Avatar username={o.username} size={26} />
              <span className="max-w-full truncate">{name}</span>
              <span className="tabular font-mono text-[13px] font-semibold">{formatOdds(o.odds)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
