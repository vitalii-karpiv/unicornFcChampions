import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import type { Metadata } from "next";
import { BetsTabs, type BetsTab } from "@/components/bets/bets-tabs";
import { FuturesTab } from "@/components/bets/futures-tab";
import { MyBets } from "@/components/bets/my-bets";
import { TodayMarkets, type PairCard } from "@/components/bets/today-markets";
import { WalletStats } from "@/components/bets/wallet-stats";
import { ensureFrozenMonths } from "@/lib/awards/freeze";
import { requireUser } from "@/lib/auth/session";
import { ensureFuturesMarket, getWallets } from "@/lib/bets/service";
import { getBets, getRatedMatches, getUsers } from "@/lib/data/queries";
import { dayMarkets } from "@/lib/domain/bets/markets";
import { groupMarketsOpen } from "@/lib/domain/bets/place";
import { START_COINS } from "@/lib/domain/bets/rules";
import { settleBet } from "@/lib/domain/bets/settle";
import { dayKey, TZ } from "@/lib/domain/time";
import { nameOf, userMap } from "@/lib/users";

export const metadata: Metadata = { title: "Bets" };

const isTab = (t: unknown): t is BetsTab => t === "today" || t === "futures" || t === "mine";

export default async function BetsPage({ searchParams }: PageProps<"/bets">) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const active: BetsTab = isTab(tab) ? tab : "today";

  const now = new Date();
  const [, nextMarket] = await Promise.all([ensureFrozenMonths(), ensureFuturesMarket(now)]);
  const [wallets, matches, users, bets] = await Promise.all([getWallets(now), getRatedMatches(), getUsers(), getBets()]);
  const wallet = wallets.get(user.id) ?? {
    userId: user.id,
    balance: START_COINS,
    atStake: 0,
    openCount: 0,
    won: 0,
    settled: 0,
    monthNet: 0,
  };

  const today = dayKey(now);
  const names = userMap(users);
  const markets = dayMarkets(today, matches, users);
  const pairs: PairCard[] = markets.pairs.map((p) => {
    const locked = p.a === user.id || p.b === user.id;
    return {
      key: p.key,
      a: nameOf(names, p.a),
      b: nameOf(names, p.b),
      recent: p.recent,
      locked,
      markets: locked ? [] : p.markets,
    };
  });
  const held = bets
    .filter((b) => b.userId === user.id && b.day === today && settleBet(b, matches, now).status === "open")
    .map((b) => b.selectionKey);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Bets</h1>
      <WalletStats wallet={wallet} month={format(new TZDate(now.getTime(), TZ), "MMMM")} />
      <BetsTabs active={active} />
      <div className="space-y-3">
        {active === "today" ? (
          <TodayMarkets
            day={today}
            dayLabel={format(new TZDate(now.getTime(), TZ), "EEE d MMM")}
            pairs={pairs}
            group={markets.group}
            groupOpen={groupMarketsOpen(now)}
            held={held}
            balance={wallet.balance}
          />
        ) : active === "futures" ? (
          <FuturesTab viewerId={user.id} now={now} market={nextMarket} />
        ) : (
          <MyBets
            bets={bets.filter((b) => b.userId === user.id)}
            matches={matches}
            users={names}
            won={wallet.won}
            settledCount={wallet.settled}
            now={now}
          />
        )}
      </div>
    </div>
  );
}
