import { Avatar } from "@/components/avatar";
import type { Wallet } from "@/lib/domain/bets/types";
import { currentMonthKey } from "@/lib/domain/time";
import { coins, formatMonth, signedCoins } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLS = "grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2rem_1fr_6rem_4rem_5rem]";

export function BettingRating({ rows, highlight }: {
  rows: (Wallet & { username: string })[];
  highlight?: string;
}) {
  const monthLabel = formatMonth(currentMonthKey()).slice(0, 3);
  const sorted = [...rows].sort((a, b) => b.balance - a.balance || a.username.localeCompare(b.username));
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className={cn("grid items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground", COLS)}>
        <span>#</span>
        <span>Player</span>
        <span className="hidden sm:block">Bets won</span>
        <span className="text-right">{monthLabel}</span>
        <span className="text-right">Balance</span>
      </div>
      {sorted.map((r, i) => (
        <div key={r.userId} className={cn("grid items-center gap-3 border-b px-4 py-3 last:border-b-0", COLS)}>
          <span className="tabular font-mono text-sm text-muted-foreground">{i + 1}</span>
          <span className="flex min-w-0 items-center gap-2">
            <Avatar username={r.username} size={26} />
            <span className={cn("truncate text-sm", r.userId === highlight && "font-semibold")}>{r.username}</span>
          </span>
          <span className="tabular hidden font-mono text-xs text-muted-foreground sm:block">
            {r.won} / {r.settled}
          </span>
          <span
            className={cn(
              "tabular text-right font-mono text-sm",
              r.monthNet > 0 && "text-win",
              r.monthNet < 0 && "text-loss",
              r.monthNet === 0 && "text-muted-foreground",
            )}
          >
            {signedCoins(r.monthNet)}
          </span>
          <span className="tabular text-right font-mono text-sm font-semibold">{coins(r.balance)}</span>
        </div>
      ))}
    </div>
  );
}
