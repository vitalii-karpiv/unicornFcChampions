import Link from "next/link";
import { AwardsTable } from "@/components/awards-table";
import { EloHistoryChart } from "@/components/elo-history-chart";
import { Leaderboard } from "@/components/leaderboard";
import { MatchCard } from "@/components/match-card";
import { buttonVariants } from "@/components/ui/button";
import { ensureFrozenMonths, liveAwards } from "@/lib/awards/freeze";
import { requireUser } from "@/lib/auth/session";
import { getFeed, getRatedMatches, getUsers } from "@/lib/data/queries";
import { avatarColor } from "@/lib/domain/avatar-color";
import { eloHistoryByDay } from "@/lib/domain/elo-history";
import { buildLeaderboard } from "@/lib/domain/leaderboard";
import { currentMonthKey } from "@/lib/domain/time";
import { formatMonth } from "@/lib/format";
import { userMap } from "@/lib/users";

const PAGE = 10;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const show = Math.min(Math.max(Number((await searchParams).show) || PAGE, PAGE), 500);
  const month = currentMonthKey();
  const [matches, users, feed, awards] = await Promise.all([
    getRatedMatches(),
    getUsers(),
    getFeed(show),
    liveAwards(month),
    ensureFrozenMonths(),
  ]);
  const names = userMap(users);
  const now = new Date();
  const board = buildLeaderboard(matches, users);
  // Players whose avatar color is already taken get a dashed line so the chart stays readable.
  const usedColors = new Set<string>();
  const series = board
    .filter((r) => r.games > 0)
    .map((r) => {
      const color = avatarColor(r.username);
      const dashed = usedColors.has(color);
      usedColors.add(color);
      return { key: r.userId, name: r.username, color, dashed };
    });
  const history = eloHistoryByDay(
    matches,
    series.map((s) => s.key),
  ).map((row) => ({ t: Date.parse(`${row.day}T12:00:00Z`), ...row.elo }));

  return (
    <div className="space-y-12">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
        <Leaderboard rows={board} highlight={user.id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Elo history</h2>
        <div className="rounded-xl border p-4">
          <EloHistoryChart data={history} series={series} now={now.getTime()} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">{formatMonth(month)} · live</h2>
          <Link href="/month" className="text-sm text-muted-foreground hover:text-foreground">
            Details →
          </Link>
        </div>
        <AwardsTable awards={awards.awards} playerOfMonth={awards.playerOfMonth} users={names} live />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Latest matches</h2>
        {feed.items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No matches yet.{" "}
            <Link href="/matches/new" className="text-foreground underline underline-offset-4">
              Log the first one
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {feed.items.map((f) => (
              <MatchCard key={f.match.id} match={f.match} users={names} reactions={f.reactions} comments={f.comments} now={now} />
            ))}
          </div>
        )}
        {feed.hasMore && (
          <div className="flex justify-center pt-2">
            <Link href={`/?show=${show + PAGE}`} scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Load more
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
