import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { BetBadge } from "@/components/bets/my-bets";
import { FuturesPicker, type FuturesQuestionData } from "@/components/bets/futures-question";
import { liveAwards } from "@/lib/awards/freeze";
import type { MarketRow } from "@/lib/bets/service";
import { getFuturesMarkets, getPicks, getUsers } from "@/lib/data/queries";
import { AWARDS, awardValue, POTM_MIN_GAMES, type AwardKey, type MonthAwards } from "@/lib/domain/awards";
import { FUTURES_QUESTIONS, type FuturesKey } from "@/lib/domain/bets/futures";
import { FUTURES_BASE } from "@/lib/domain/bets/rules";
import type { PlayerMonthStats } from "@/lib/domain/month";
import { currentMonthKey, monthStart, shiftMonth, TZ } from "@/lib/domain/time";
import { coins, formatOdds, pct } from "@/lib/format";
import { nameOf, userMap } from "@/lib/users";

const monthName = (key: string) => format(new TZDate(`${key}-15T12:00:00`, TZ), "MMMM");

/** "19d 4h" until `end`; "4h 12m" in the last day. */
function countdown(end: Date, now: Date): string {
  const mins = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${mins % 60}m`;
}

const ordinal = (n: number) => {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
};

function formatValue(key: FuturesKey, v: number): string {
  if (key === "winRate") return pct(v);
  if (key === "eloGain") {
    const n = Math.round(v);
    return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0";
  }
  return String(v);
}

type LiveStatus = { leading: true } | { leading: false; text: string };

/** How a pick is doing against this month's live awards. */
function liveStatus(key: FuturesKey, pickUserId: string, live: MonthAwards): LiveStatus {
  const potm = key === "potm";
  const leader = potm ? live.playerOfMonth : live.awards[key];
  if (!leader) return { leading: false, text: "No leader yet" };
  if (leader.userId === pickUserId) return { leading: true };

  const won = new Map<string, number>();
  for (const w of Object.values(live.awards)) if (w) won.set(w.userId, (won.get(w.userId) ?? 0) + 1);
  const minGames = potm ? POTM_MIN_GAMES : (AWARDS.find((a) => a.key === key)?.minGames ?? 1);
  const value = (s: PlayerMonthStats) => (potm ? (won.get(s.userId) ?? 0) : awardValue(s, key as AwardKey));
  const leaderValue = "awardsWon" in leader ? leader.awardsWon : leader.value;

  const mine = live.stats.find((s) => s.userId === pickUserId);
  const theirs = mine ? value(mine) : 0;
  // Everyone who qualifies and is ahead, counting the leader even when level (they win the tiebreak).
  const ahead = live.stats.filter(
    (s) =>
      s.userId !== pickUserId &&
      s.games >= minGames &&
      (s.userId === leader.userId || value(s) > theirs || !mine || mine.games < minGames),
  ).length;
  const text = `${ordinal(ahead + 1)} · ${formatValue(key, theirs)} vs ${formatValue(key, leaderValue)}`;
  return { leading: false, text };
}

export async function FuturesTab({
  viewerId,
  now,
  market: next,
}: {
  viewerId: string;
  now: Date;
  /** Next month's market, read uncached by ensureFuturesMarket so a just-created one shows up. */
  market: MarketRow | null;
}) {
  const current = currentMonthKey(now);
  const target = shiftMonth(current, 1);
  const [markets, picks, users, live] = await Promise.all([
    getFuturesMarkets(),
    getPicks(),
    getUsers(),
    liveAwards(current),
  ]);
  const names = userMap(users);
  const mine = picks.filter((p) => p.userId === viewerId);
  const market = next?.month === target ? next : undefined;
  const currentOdds = markets.find((m) => m.month === current)?.odds;

  const questions: FuturesQuestionData[] = market
    ? FUTURES_QUESTIONS.filter((q) => market.odds[q.key]).map((q) => ({
        ...q,
        options: Object.entries(market.odds[q.key]!)
          .map(([userId, odds]) => ({ userId, username: nameOf(names, userId), odds }))
          .sort((a, b) => a.odds - b.odds || a.username.localeCompare(b.username)),
      }))
    : [];

  const livePicks = FUTURES_QUESTIONS.flatMap((q) => {
    const p = mine.find((x) => x.month === current && x.question === q.key);
    if (!p) return [];
    const odds = currentOdds?.[q.key]?.[p.pickUserId];
    return [{ q, pickUserId: p.pickUserId, odds, status: liveStatus(q.key, p.pickUserId, live) }];
  });

  return (
    <>
      {market ? (
        <FuturesPicker
          month={target}
          monthName={monthName(target)}
          closesIn={countdown(monthStart(target), now)}
          questions={questions}
          picks={Object.fromEntries(mine.filter((p) => p.month === target).map((p) => [p.question, p.pickUserId]))}
          viewerId={viewerId}
        />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Not enough games in the last three months to set odds for {monthName(target)}.
        </div>
      )}

      {livePicks.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-medium text-muted-foreground">{monthName(current)} picks · live</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            {livePicks.map(({ q, pickUserId, odds, status }) => (
              <div key={q.key} className="flex items-center gap-3 border-t px-4 py-3 first:border-t-0">
                <span aria-hidden className="text-base">
                  {q.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{q.label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {pickUserId === viewerId ? "you" : nameOf(names, pickUserId)}
                    {odds !== undefined && (
                      <>
                        {" "}
                        <span className="tabular font-mono">{formatOdds(odds)}</span> · pays{" "}
                        {coins(Math.round(FUTURES_BASE * odds))}
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {status.leading ? <BetBadge tone="win">Leading</BetBadge> : <BetBadge>{status.text}</BetBadge>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Pays out when {monthName(current)} ends.</p>
        </section>
      )}
    </>
  );
}
