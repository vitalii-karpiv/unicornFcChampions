import { Stat } from "@/components/stat";
import type { Wallet } from "@/lib/domain/bets/types";
import { coins, signedCoins } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Balance · At stake · this month's profit. `month` is the month's name, e.g. "November". */
export function WalletStats({ wallet, month }: { wallet: Wallet; month: string }) {
  return (
    <section className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
      <Stat label="Balance" value={coins(wallet.balance)} hint="all-time" />
      <Stat
        label="At stake"
        value={coins(wallet.atStake)}
        hint={`${wallet.openCount} open bet${wallet.openCount === 1 ? "" : "s"}`}
      />
      <Stat
        label={month}
        value={
          <span className={cn(wallet.monthNet > 0 && "text-win", wallet.monthNet < 0 && "text-loss")}>
            {signedCoins(wallet.monthNet)}
          </span>
        }
        hint="profit"
      />
    </section>
  );
}
