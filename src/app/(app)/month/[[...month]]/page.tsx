import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { AwardsTable } from "@/components/awards-table";
import { EloDelta } from "@/components/elo-delta";
import { buttonVariants } from "@/components/ui/button";
import { ensureFrozenMonths, type FrozenMonth, getFrozenMonth, liveAwards } from "@/lib/awards/freeze";
import { getUsers } from "@/lib/data/queries";
import { currentMonthKey, shiftMonth } from "@/lib/domain/time";
import { formatMonth, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { nameOf, userMap } from "@/lib/users";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Month" };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function MonthPage({ params }: PageProps<"/month/[[...month]]">) {
  await requireUser();
  const { month: segments } = await params;
  const current = currentMonthKey();
  if (segments && (segments.length > 1 || !MONTH.test(segments[0]))) notFound();
  const month = segments?.[0] ?? current;
  if (month > current) notFound();

  const live = month === current;
  let data: FrozenMonth | null;
  if (live) {
    data = await liveAwards(month);
  } else {
    await ensureFrozenMonths();
    data = await getFrozenMonth(month);
  }
  const names = userMap(await getUsers());
  const standings = (data?.stats ?? []).filter((s) => s.games > 0).sort((x, y) => y.eloGain - x.eloGain);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <Link href={`/month/${shiftMonth(month, -1)}`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Previous month">
          <ChevronLeft />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">{formatMonth(month)}</h1>
          <p className="text-xs text-muted-foreground">{live ? "Live standings" : "Final · frozen"}</p>
        </div>
        <Link
          href={`/month/${shiftMonth(month, 1)}`}
          aria-label="Next month"
          aria-disabled={live}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), live && "pointer-events-none opacity-30")}
        >
          <ChevronRight />
        </Link>
      </div>

      {!data || standings.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No matches {live ? "this month yet" : "that month"}.
        </div>
      ) : (
        <>
          <AwardsTable awards={data.awards} playerOfMonth={data.playerOfMonth} users={names} live={live} />
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Elo change this month</h2>
            <div className="overflow-hidden rounded-xl border">
              {standings.map((s, i) => {
                const name = nameOf(names, s.userId);
                return (
                  <Link
                    key={s.userId}
                    href={`/players/${name}`}
                    className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/40"
                  >
                    <span className="tabular w-5 font-mono text-sm text-muted-foreground">{i + 1}</span>
                    <Avatar username={name} size={26} />
                    <span className="flex-1 truncate text-sm">{name}</span>
                    <span className="tabular hidden font-mono text-xs text-muted-foreground sm:inline">
                      {s.games}g · {s.wins}-{s.draws}-{s.losses} · {pct(s.winRate)} · {s.goalsFor} goals
                    </span>
                    <span className="tabular font-mono text-xs text-muted-foreground sm:hidden">{s.games}g</span>
                    <EloDelta value={s.eloGain} className="w-12 text-right text-sm" />
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
