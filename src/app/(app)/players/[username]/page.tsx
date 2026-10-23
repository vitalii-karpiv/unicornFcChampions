import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { EloChart } from "@/components/elo-chart";
import { FormDots } from "@/components/form-dots";
import { Heatmap } from "@/components/heatmap";
import { MatchCard } from "@/components/match-card";
import { Stat } from "@/components/stat";
import { getRatedMatches, getUsers } from "@/lib/data/queries";
import { headToHead } from "@/lib/domain/h2h";
import { activityByDay } from "@/lib/domain/heatmap";
import { currentElo, peakElo, playerResults } from "@/lib/domain/results";
import { currentStreak, lastN, longestStreak } from "@/lib/domain/streaks";
import { elo, formatDate, formatDateTime } from "@/lib/format";
import { userMap } from "@/lib/users";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/players/[username]">): Promise<Metadata> {
  return { title: decodeURIComponent((await params).username) };
}

const STREAK_LABEL = { W: "wins", D: "draws", L: "losses" } as const;

export default async function PlayerPage({ params }: PageProps<"/players/[username]">) {
  await requireUser();
  const username = decodeURIComponent((await params).username).toLowerCase();
  const [users, matches] = await Promise.all([getUsers(), getRatedMatches()]);
  const player = users.find((u) => u.username === username);
  if (!player) notFound();

  const now = new Date();
  const names = userMap(users);
  const rs = playerResults(matches, player.id);
  const wins = rs.filter((r) => r.outcome === "W").length;
  const draws = rs.filter((r) => r.outcome === "D").length;
  const goalsFor = rs.reduce((n, r) => n + r.goalsFor, 0);
  const goalsAgainst = rs.reduce((n, r) => n + r.goalsAgainst, 0);
  const streak = currentStreak(rs);
  const best = longestStreak(rs, "W");
  const chart = [
    { n: 0, elo: 1000, label: "Start" },
    ...rs.map((r, i) => ({ n: i + 1, elo: Math.round(r.eloAfter), label: formatDateTime(r.playedAt) })),
  ];
  const rivals = users
    .filter((u) => u.id !== player.id)
    .map((u) => ({ user: u, h: headToHead(matches, player.id, u.id) }))
    .filter((x) => x.h.games > 0)
    .sort((x, y) => y.h.games - x.h.games);
  const recent = matches.filter((m) => m.playerAId === player.id || m.playerBId === player.id).slice(-5).reverse();

  return (
    <div className="space-y-10">
      <header className="flex items-center gap-4">
        <Avatar username={player.username} size={64} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{player.username}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <FormDots outcomes={lastN(rs)} />
            {streak.outcome && (
              <span>
                {streak.length} {STREAK_LABEL[streak.outcome]} in a row
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        <Stat label="Elo" value={elo(currentElo(matches, player.id))} hint={`peak ${elo(peakElo(matches, player.id))}`} />
        <Stat label="Matches" value={rs.length} hint={`${wins}-${draws}-${rs.length - wins - draws}`} />
        <Stat label="Goals" value={`${goalsFor}:${goalsAgainst}`} hint={rs.length ? `${(goalsFor / rs.length).toFixed(1)} per game` : undefined} />
        <Stat label="Best win streak" value={best.length} hint={best.reachedAt ? formatDate(best.reachedAt) : undefined} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Elo history</h2>
        <div className="rounded-xl border p-4">
          <EloChart data={chart} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Activity</h2>
        <div className="rounded-xl border p-4">
          <Heatmap days={activityByDay(rs.map((r) => r.playedAt), now)} />
        </div>
      </section>

      {rivals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Head-to-head</h2>
          <div className="overflow-hidden rounded-xl border">
            {rivals.map(({ user, h }) => (
              <Link
                key={user.id}
                href={`/h2h/${player.username}/${user.username}`}
                className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/40"
              >
                <Avatar username={user.username} size={26} />
                <span className="flex-1 text-sm">vs {user.username}</span>
                <span className="tabular font-mono text-xs text-muted-foreground">
                  {h.aWins}-{h.draws}-{h.bWins}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Recent matches</h2>
          <div className="space-y-3">
            {recent.map((m) => (
              <MatchCard key={m.id} match={m} users={names} now={now} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
