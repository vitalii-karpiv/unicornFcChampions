import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import Link from "next/link";
import { CancelBet } from "@/components/bets/cancel-bet";
import type { BetRow } from "@/lib/data/queries";
import { BET_TTL_MS } from "@/lib/domain/bets/rules";
import { betReturn, settleBet } from "@/lib/domain/bets/settle";
import type { BetStatus } from "@/lib/domain/bets/types";
import { TZ } from "@/lib/domain/time";
import type { MatchRow } from "@/lib/domain/types";
import { coins, formatOdds, signedCoins } from "@/lib/format";
import { nameOf, type UserMap } from "@/lib/users";
import { cn } from "@/lib/utils";

const kyiv = (ms: number, pattern: string) => format(new TZDate(ms, TZ), pattern);

/** Small pill; `tone` colours it as a win or a loss, or in the foreground colour for something still live. */
export function BetBadge({ tone, children }: { tone?: "win" | "loss" | "live"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium whitespace-nowrap text-muted-foreground",
        tone === "win" && "border-win/35 bg-win/10 text-win",
        tone === "loss" && "border-loss/35 bg-loss/10 text-loss",
        tone === "live" && "text-foreground",
      )}
    >
      {children}
    </span>
  );
}

const row = "flex items-center gap-3 border-t px-4 py-3 first:border-t-0";

/** The viewer's open and settled bets. `bets` are the viewer's own; `matches` in replay order. */
export function MyBets({
  bets,
  matches,
  users,
  won,
  settledCount,
  now,
}: {
  bets: BetRow[];
  matches: MatchRow[];
  users: UserMap;
  won: number;
  /** Won + lost (refunds and cancellations excluded), from the wallet. */
  settledCount: number;
  now: Date;
}) {
  const rows = bets.map((bet) => ({ bet, settlement: settleBet(bet, matches, now) }));
  const open = rows.filter((r) => r.settlement.status === "open").sort((x, y) => +y.bet.placedAt - +x.bet.placedAt);
  const settled = rows
    .filter((r) => r.settlement.status !== "open")
    .sort((x, y) => +(y.settlement.at ?? y.bet.placedAt) - +(x.settlement.at ?? x.bet.placedAt));
  const byId = new Map(matches.map((m) => [m.id, m]));

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Open · {open.length}</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          {open.length === 0 ? (
            <p className={cn(row, "text-xs text-muted-foreground")}>No open bets.</p>
          ) : (
            open.map(({ bet }) => (
              <div key={bet.id} className={row}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{bet.label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {bet.marketTitle} · {bet.scope} · <span className="tabular font-mono">{formatOdds(bet.odds)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-[3px] text-xs">
                  <span className="tabular font-mono">
                    {coins(bet.stake)} → <b className="font-semibold">{coins(betReturn(bet, "won"))}</b>
                  </span>
                  <div className="flex items-center gap-2">
                    <BetBadge tone="live">
                      {bet.spec.type === "group" ? "today" : `until ${kyiv(bet.placedAt.getTime() + BET_TTL_MS, "EEE d MMM")}`}
                    </BetBadge>
                    <CancelBet betId={bet.id} label={bet.label} stake={bet.stake} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Settled</h2>
          {settledCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {won} won of {settledCount}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          {settled.length === 0 ? (
            <p className={cn(row, "text-xs text-muted-foreground")}>No settled bets yet.</p>
          ) : (
            settled.map(({ bet, settlement }) => {
              const matchId = settlement.matchIds.at(-1);
              const match = matchId ? byId.get(matchId) : undefined;
              const where = match
                ? `${nameOf(users, match.playerAId)} ${match.goalsA}–${match.goalsB} ${nameOf(users, match.playerBId)}`
                : bet.scope;
              const at = settlement.at ?? bet.placedAt;
              const body = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {bet.label} <span className="font-normal text-muted-foreground">· {bet.marketTitle}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {where} · {kyiv(at.getTime(), "d MMM")} ·{" "}
                      <span className="tabular font-mono">{formatOdds(bet.odds)}</span> · stake {coins(bet.stake)}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Outcome status={settlement.status} profit={betReturn(bet, settlement.status) - bet.stake} />
                  </div>
                </>
              );
              return match ? (
                <Link key={bet.id} href={`/matches/${match.id}`} className={cn(row, "transition-colors hover:bg-muted/50")}>
                  {body}
                </Link>
              ) : (
                <div key={bet.id} className={row}>
                  {body}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function Outcome({ status, profit }: { status: BetStatus; profit: number }) {
  if (status === "void") return <BetBadge>Refunded</BetBadge>;
  if (status === "cancelled") {
    return (
      <BetBadge>
        Cancelled · <span className="tabular ml-1 font-mono">{signedCoins(profit)}</span>
      </BetBadge>
    );
  }
  return (
    <BetBadge tone={status === "won" ? "win" : "loss"}>
      <span className="tabular font-mono">{signedCoins(profit)}</span>
    </BetBadge>
  );
}
