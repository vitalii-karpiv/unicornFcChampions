import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { EloDelta } from "@/components/elo-delta";
import { MatchCard } from "@/components/match-card";
import { getRatedMatches, getUsers } from "@/lib/data/queries";
import { headToHead } from "@/lib/domain/h2h";
import type { RatedMatch } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";
import { userMap } from "@/lib/users";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Head-to-head" };

function Biggest({ label, match }: { label: string; match: RatedMatch | null }) {
  return (
    <div className="bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      {match ? (
        <Link href={`/matches/${match.id}`} className="mt-1 block">
          <span className="tabular font-mono text-xl font-semibold">
            {Math.max(match.goalsA, match.goalsB)}–{Math.min(match.goalsA, match.goalsB)}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">{formatDate(match.playedAt)}</span>
        </Link>
      ) : (
        <div className="mt-1 text-xl text-muted-foreground">—</div>
      )}
    </div>
  );
}

export default async function HeadToHeadPage({ params }: PageProps<"/h2h/[a]/[b]">) {
  await requireUser();
  const p = await params;
  const [aName, bName] = [p.a, p.b].map((s) => decodeURIComponent(s).toLowerCase());
  if (aName === bName) notFound();
  const [users, matches] = await Promise.all([getUsers(), getRatedMatches()]);
  const a = users.find((u) => u.username === aName);
  const b = users.find((u) => u.username === bName);
  if (!a || !b) notFound();

  const h = headToHead(matches, a.id, b.id);
  const names = userMap(users);
  const now = new Date();

  return (
    <div className="space-y-10">
      <section className="rounded-xl border bg-card p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
          <Link href={`/players/${a.username}`} className="flex flex-col items-center gap-2">
            <Avatar username={a.username} size={56} />
            <span className="text-sm font-medium">{a.username}</span>
          </Link>
          <div>
            <div className="tabular font-mono text-4xl font-semibold">
              {h.aWins} <span className="text-muted-foreground">–</span> {h.bWins}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {h.draws} draw{h.draws === 1 ? "" : "s"} · {h.games} game{h.games === 1 ? "" : "s"}
            </div>
          </div>
          <Link href={`/players/${b.username}`} className="flex flex-col items-center gap-2">
            <Avatar username={b.username} size={56} />
            <span className="text-sm font-medium">{b.username}</span>
          </Link>
        </div>
        <div className="mt-6 flex justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>
            Goals <span className="tabular font-mono text-foreground">{h.aGoals}:{h.bGoals}</span>
          </span>
          <span>
            Elo swing for {a.username} <EloDelta value={h.aEloNet} />
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border">
        <Biggest label={`${a.username}'s biggest win`} match={h.biggestAWin} />
        <Biggest label={`${b.username}'s biggest win`} match={h.biggestBWin} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Last {Math.min(10, h.games)} matches</h2>
        {h.recent.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            These two haven&apos;t played yet.
          </div>
        ) : (
          <div className="space-y-3">
            {h.recent.map((m) => (
              <MatchCard key={m.id} match={m} users={names} now={now} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
