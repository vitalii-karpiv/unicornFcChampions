"use client";

import { ChevronDown, Lock, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { BetSlip, type SlipTarget } from "@/components/bets/bet-slip";
import type { Market } from "@/lib/domain/bets/markets";
import { BET_DELAY_MS, BET_TTL_MS, GROUP_CLOSE_HOUR, PAIR_WINDOW_DAYS } from "@/lib/domain/bets/rules";
import { formatOdds } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PairCard = {
  key: string;
  a: string;
  b: string;
  recent: { aWins: number; bWins: number };
  /** The viewer plays in this pair: shown, but no markets. */
  locked: boolean;
  markets: Market[];
};

const GROUP_KEY = "group";
const GRID_COLS: Record<Market["cols"], string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/** Where an open slip points; its label, odds and title are looked up in the current markets on every render. */
type SlipRef = Pick<SlipTarget, "selectionKey" | "scope" | "pair" | "openedAt">;

function findSelection(pairs: PairCard[], group: Market[], key: string) {
  for (const market of [...pairs.flatMap((p) => p.markets), ...group]) {
    const selection = market.selections.find((s) => s.key === key);
    if (selection) return { market, selection };
  }
  return null;
}

const DELAY_MIN = BET_DELAY_MS / 60_000;
const TTL_DAYS = BET_TTL_MS / 86_400_000;
const GROUP_CLOSE = `${String(GROUP_CLOSE_HOUR).padStart(2, "0")}:00`;

/** Single-selection markets ("Specials") count each line as its own market, as in the mockup. */
const marketCount = (markets: Market[]) => markets.reduce((n, m) => n + (m.cols === 1 ? m.selections.length : 1), 0);

export function TodayMarkets({
  day,
  dayLabel,
  pairs,
  group,
  groupOpen,
  held,
  balance,
}: {
  day: string;
  /** e.g. "Wed 11 Nov" */
  dayLabel: string;
  pairs: PairCard[];
  group: Market[];
  /** False from GROUP_CLOSE_HOUR (Kyiv) until midnight: the group card is hidden. */
  groupOpen: boolean;
  /** Selection keys the viewer already has an open bet on today. */
  held: string[];
  balance: number;
}) {
  const [open, setOpen] = useState<Set<string>>(() => {
    const first = pairs.find((p) => !p.locked);
    return new Set(first ? [first.key] : []);
  });
  const [slipRef, setSlipRef] = useState<SlipRef | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);
  const heldSet = new Set(held);

  // Derived, so a refresh after "the odds changed" updates the open slip's price instead of resending the old one.
  const found = slipRef && findSelection(pairs, group, slipRef.selectionKey);
  const slip: SlipTarget | null =
    slipRef && found
      ? { ...slipRef, label: found.selection.label, odds: found.selection.odds, title: found.market.title }
      : null;
  const missing = slipOpen && slipRef !== null && !found;

  useEffect(() => {
    if (!missing) return;
    setSlipOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- the selection vanished after a refresh
    toast("This bet is no longer available.");
  }, [missing]);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pick = (market: Market, i: number, openedAt: number, scope: string, pair: SlipTarget["pair"]) => {
    setSlipRef({ selectionKey: market.selections[i].key, scope, pair, openedAt });
    setSlipOpen(true);
  };

  const selected = slipOpen ? slip?.selectionKey : undefined;

  if (pairs.length === 0 && group.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No markets today. They appear for players who have played each other in the last {PAIR_WINDOW_DAYS} days.
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        {dayLabel} · a bet counts for matches played {DELAY_MIN}+ min after you place it. Pair bets settle on the next
        match between the two; if they don&apos;t play within {TTL_DAYS} days, you get your coins back. Group bets settle at
        midnight.
      </p>

      {pairs.map((p) =>
        p.locked ? (
          <div key={p.key} className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-2 px-4 py-3">
              <Who a={p.a} b={p.b} className="opacity-50" />
              <span className="ml-auto flex items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
                <Lock className="size-3.5" /> You&apos;re playing
              </span>
            </div>
          </div>
        ) : (
          <Collapsible
            key={p.key}
            open={open.has(p.key)}
            onToggle={() => toggle(p.key)}
            head={<Who a={p.a} b={p.b} />}
            meta={
              <>
                <span className="hidden sm:inline">
                  {p.recent.aWins}–{p.recent.bWins} ·
                </span>{" "}
                {marketCount(p.markets)} markets
              </>
            }
          >
            {p.markets.map((m) => (
              <MarketBlock
                key={m.key}
                market={m}
                held={heldSet}
                selected={selected}
                onPick={(i, at) => pick(m, i, at, `${p.a} vs ${p.b}`, { a: p.a, b: p.b })}
              />
            ))}
          </Collapsible>
        ),
      )}

      {group.length > 0 && !groupOpen && (
        <p className="text-xs text-muted-foreground">Group bets close at {GROUP_CLOSE}.</p>
      )}

      {group.length > 0 && groupOpen && (
        <Collapsible
          open={open.has(GROUP_KEY)}
          onToggle={() => toggle(GROUP_KEY)}
          head={
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <Users className="size-4 shrink-0" /> Everyone · today
            </span>
          }
          meta={<>{group.length} markets</>}
        >
          {group.map((m) => (
            <MarketBlock
              key={m.key}
              market={m}
              held={heldSet}
              selected={selected}
              onPick={(i, at) => pick(m, i, at, "Everyone · today", null)}
            />
          ))}
        </Collapsible>
      )}

      <BetSlip target={slip} open={slipOpen && !missing} onOpenChange={setSlipOpen} day={day} balance={balance} />
    </>
  );
}

function Who({ a, b, className }: { a: string; b: string; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2 font-medium", className)}>
      <Avatar username={a} size={22} />
      <span className="truncate">{a}</span>
      <span className="text-xs font-normal text-muted-foreground">vs</span>
      <span className="truncate">{b}</span>
      <Avatar username={b} size={22} />
    </span>
  );
}

function Collapsible({
  open,
  onToggle,
  head,
  meta,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  head: React.ReactNode;
  meta: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        {head}
        <span className="ml-auto flex items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
          <span>{meta}</span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && <div className="grid gap-x-5 gap-y-4 border-t px-4 pt-3.5 pb-4 sm:grid-cols-2">{children}</div>}
    </div>
  );
}

function MarketBlock({
  market,
  held,
  selected,
  onPick,
}: {
  market: Market;
  held: Set<string>;
  selected: string | undefined;
  /** `at`: when the selection was tapped (ms). */
  onPick: (i: number, at: number) => void;
}) {
  const vertical = market.cols >= 3;
  return (
    <div className={cn(market.cols !== 2 && market.cols !== 4 && "sm:col-span-2")}>
      <div className="mb-1.5 text-xs text-muted-foreground">{market.title}</div>
      <div className={cn("grid gap-1.5", GRID_COLS[market.cols])}>
        {market.selections.map((s, i) => {
          const isSel = selected === s.key;
          const isHeld = held.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onPick(i, Date.now())}
              title={isHeld ? "You have a bet here" : undefined}
              className={cn(
                "flex min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-[7px] text-[13px] transition-colors hover:bg-muted",
                vertical && "flex-col justify-center gap-px px-1 py-1.5 text-center",
                isHeld && "bg-foreground/12 hover:bg-foreground/18",
                isSel && "border-foreground bg-foreground text-background hover:bg-foreground",
              )}
            >
              <span className={cn("min-w-0 truncate", vertical && "max-w-full text-xs")}>{s.label}</span>
              {isHeld && <span className="sr-only">(you have a bet here)</span>}
              <span className="tabular font-mono font-semibold">{formatOdds(s.odds)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
