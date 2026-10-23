import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { FormDots } from "@/components/form-dots";
import type { LeaderboardRow } from "@/lib/domain/leaderboard";
import { elo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Leaderboard({ rows, highlight }: { rows: LeaderboardRow[]; highlight?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-[2rem_1fr_auto_4rem] items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground sm:grid-cols-[2rem_1fr_6rem_5rem_4rem]">
        <span>#</span>
        <span>Player</span>
        <span className="hidden sm:block">W-D-L</span>
        <span>Form</span>
        <span className="text-right">Elo</span>
      </div>
      {rows.map((r) => (
        <Link
          key={r.userId}
          href={`/players/${r.username}`}
          className={cn(
            "grid grid-cols-[2rem_1fr_auto_4rem] items-center gap-3 border-b px-4 py-3 last:border-b-0 transition-colors hover:bg-muted/40 sm:grid-cols-[2rem_1fr_6rem_5rem_4rem]",
            r.games === 0 && "text-muted-foreground",
          )}
        >
          <span className="tabular font-mono text-sm text-muted-foreground">{r.rank ?? "–"}</span>
          <span className="flex min-w-0 items-center gap-2">
            <Avatar username={r.username} size={26} />
            <span className={cn("truncate text-sm", r.userId === highlight && "font-semibold")}>{r.username}</span>
            <span className="tabular text-xs text-muted-foreground sm:hidden">{r.games}g</span>
          </span>
          <span className="tabular hidden font-mono text-xs text-muted-foreground sm:block">
            {r.wins}-{r.draws}-{r.losses}
          </span>
          <FormDots outcomes={r.form} />
          <span className="tabular text-right font-mono text-sm font-semibold">{elo(r.elo)}</span>
        </Link>
      ))}
    </div>
  );
}
