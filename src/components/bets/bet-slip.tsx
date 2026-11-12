"use client";

import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { placeBetAction } from "@/app/(app)/bets/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BET_DELAY_MS, BET_TTL_MS } from "@/lib/domain/bets/rules";
import { TZ } from "@/lib/domain/time";
import { coins, formatOdds } from "@/lib/format";

export type SlipTarget = {
  selectionKey: string;
  label: string;
  odds: number;
  /** Market title, e.g. "Winner". */
  title: string;
  /** "A vs B" for a pair, "Everyone · today" for the group card. */
  scope: string;
  /** Player names for a pair market; null for a group market. */
  pair: { a: string; b: string } | null;
  /** When the slip was opened (ms), for the settlement times. */
  openedAt: number;
};

const CHIPS = [50, 100, 250];
const kyiv = (ms: number, pattern: string) => format(new TZDate(ms, TZ), pattern);

/** Bottom sheet below `md`, centred dialog from `md`. Stays mounted so the close animation keeps its content. */
export function BetSlip({
  target,
  open,
  onOpenChange,
  day,
  balance,
}: {
  target: SlipTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: string;
  balance: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-t-2xl border border-b-0 bg-background px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ring-0 data-open:slide-in-from-bottom data-closed:slide-out-to-bottom sm:max-w-none md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-[400px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b md:p-5 md:data-open:slide-in-from-bottom-0 md:data-closed:slide-out-to-bottom-0"
      >
        {target && (
          <SlipBody
            key={`${target.selectionKey}:${target.openedAt}`}
            target={target}
            day={day}
            balance={balance}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SlipBody({
  target,
  day,
  balance,
  onDone,
}: {
  target: SlipTarget;
  day: string;
  balance: number;
  onDone: () => void;
}) {
  const [stake, setStake] = useState(() => Math.max(0, Math.min(100, balance)));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const returns = Math.round(stake * target.odds);
  const tooMuch = stake > balance;
  const after = kyiv(target.openedAt + BET_DELAY_MS, "HH:mm");

  function pickStake(n: number) {
    setStake(Math.max(0, n));
    setError(null);
  }

  function submit() {
    startTransition(async () => {
      const res = await placeBetAction({ day, selectionKey: target.selectionKey, label: target.label, odds: target.odds, stake });
      if (res.error) {
        setError(res.error);
        router.refresh(); // pick up new odds / balance behind the slip
        return;
      }
      onDone();
      toast(`Bet placed · ${target.label} ${formatOdds(target.odds)} · ${coins(returns)} if it wins`);
    });
  }

  return (
    <>
      <div aria-hidden className="mx-auto mt-1 mb-3 h-1 w-10 rounded-full bg-muted md:hidden" />
      <div className="flex items-center justify-between gap-3">
        <DialogDescription className="min-w-0 truncate text-xs">
          {target.scope} · {target.title}
        </DialogDescription>
        <DialogClose
          aria-label="Close"
          className="-mr-1 flex shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </DialogClose>
      </div>
      <DialogTitle className="mt-0.5 mb-4 flex items-baseline justify-between gap-3 text-[17px] leading-snug font-semibold">
        <span className="min-w-0">{target.label}</span>
        <span className="tabular shrink-0 font-mono">{formatOdds(target.odds)}</span>
      </DialogTitle>

      <label htmlFor="bet-stake" className="mb-1.5 block text-xs font-medium">
        Stake
      </label>
      <Input
        id="bet-stake"
        inputMode="numeric"
        autoComplete="off"
        value={stake ? String(stake) : ""}
        placeholder="0"
        onChange={(e) => pickStake(Number.parseInt(e.target.value.replace(/\D/g, "") || "0", 10))}
        className="tabular h-11 font-mono text-lg font-semibold md:text-lg"
      />
      <div className="mt-2 mb-3.5 flex gap-1.5">
        {CHIPS.map((c) => (
          <Chip key={c} onClick={() => pickStake(c)}>
            {c}
          </Chip>
        ))}
        <Chip onClick={() => pickStake(balance)}>All in</Chip>
      </div>

      <div className="flex justify-between py-0.5 text-sm">
        <span className="text-muted-foreground">Returns</span>
        <span className="tabular font-mono font-semibold">{coins(returns)}</span>
      </div>
      <div className="flex justify-between py-0.5 text-sm">
        <span className="text-muted-foreground">Balance after</span>
        <span className="tabular font-mono">{coins(balance - stake)}</span>
      </div>

      <p className="mt-3 mb-4 rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        {target.pair ? (
          <>
            Settles on the first{" "}
            <b className="font-medium text-foreground">
              {target.pair.a}–{target.pair.b}
            </b>{" "}
            match played after <b className="font-medium text-foreground">{after}</b>. If they don&apos;t play by{" "}
            <b className="font-medium text-foreground">{kyiv(target.openedAt + BET_TTL_MS, "EEE d MMM")}</b>, you get
            your coins back.
          </>
        ) : (
          <>
            Counts matches played after <b className="font-medium text-foreground">{after}</b> today. Settles at
            midnight.
          </>
        )}
      </p>

      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button className="h-10 w-full" disabled={pending || stake < 1 || tooMuch} onClick={submit}>
        {tooMuch ? "Not enough coins" : `Place bet · ${coins(stake)}`}
      </Button>
    </>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border bg-background px-3 py-1 text-xs transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
}
