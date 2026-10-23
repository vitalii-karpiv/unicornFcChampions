import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Comments } from "@/components/comments";
import { DeleteMatchButton } from "@/components/delete-match-button";
import { EloDelta } from "@/components/elo-delta";
import { Reactions } from "@/components/reactions";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getComments, getMatch, getReactions, getUsers } from "@/lib/data/queries";
import { isLockedDate } from "@/lib/domain/time";
import { elo, formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { nameOf, userMap } from "@/lib/users";

export const metadata: Metadata = { title: "Match" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Player({ username, goals, before, after, won }: {
  username: string;
  goals: number;
  before: number;
  after: number;
  won: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Avatar username={username} size={56} />
      <Link href={`/players/${username}`} className={cn("text-sm", won ? "font-semibold" : "text-muted-foreground")}>
        {username}
      </Link>
      <div className="tabular font-mono text-6xl font-semibold">{goals}</div>
      <div className="text-xs text-muted-foreground">
        <span className="tabular font-mono">
          {elo(before)} → {elo(after)}
        </span>{" "}
        <EloDelta value={after - before} />
      </div>
    </div>
  );
}

export default async function MatchPage({ params }: PageProps<"/matches/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const user = await requireUser();
  const [match, users, comments, reactions] = await Promise.all([getMatch(id), getUsers(), getComments(id), getReactions(id)]);
  if (!match) notFound();

  const names = userMap(users);
  const now = new Date();
  const locked = isLockedDate(match.playedAt, now);
  const a = nameOf(names, match.playerAId);
  const b = nameOf(names, match.playerBId);

  return (
    <div className="space-y-10">
      <section className="rounded-xl border bg-card p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
          <Player username={a} goals={match.goalsA} before={match.aEloBefore} after={match.aEloAfter} won={match.goalsA > match.goalsB} />
          <span className="pt-24 text-2xl text-muted-foreground">:</span>
          <Player username={b} goals={match.goalsB} before={match.bEloBefore} after={match.bEloAfter} won={match.goalsB > match.goalsA} />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
          <span>{formatDateTime(match.playedAt)}</span>
          <div className="flex items-center gap-1">
            <Link href={`/h2h/${a}/${b}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Head-to-head
            </Link>
            {locked ? (
              <span className="px-2">Month closed</span>
            ) : (
              <>
                <Link href={`/matches/${id}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Edit
                </Link>
                <DeleteMatchButton matchId={id} />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Reactions</h2>
        <Reactions matchId={id} rows={reactions} userId={user.id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Comments</h2>
        <Comments
          matchId={id}
          userId={user.id}
          comments={comments.map((c) => ({ id: c.id, body: c.body, username: c.username, userId: c.userId, ago: timeAgo(c.createdAt, now) }))}
        />
      </section>
    </div>
  );
}
