import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { EloDelta } from "@/components/elo-delta";
import type { RatedMatch } from "@/lib/domain/types";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { nameOf, type UserMap } from "@/lib/users";

type Props = {
  match: RatedMatch;
  users: UserMap;
  reactions?: Record<string, number>;
  comments?: number;
  now: Date;
};

function Side({ username, goals, delta, won, align }: {
  username: string;
  goals: number;
  delta: number;
  won: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <Avatar username={username} size={32} />
      <div className="min-w-0">
        <div className={cn("truncate text-sm", won ? "font-semibold" : "text-muted-foreground")}>{username}</div>
        <EloDelta value={delta} />
      </div>
      <span className={cn("tabular ml-auto font-mono text-2xl font-semibold", align === "right" && "ml-0 mr-auto", !won && "text-muted-foreground")}>
        {goals}
      </span>
    </div>
  );
}

export function MatchCard({ match: m, users, reactions = {}, comments = 0, now }: Props) {
  const reactionList = Object.entries(reactions).filter(([, n]) => n > 0);
  return (
    <Link
      href={`/matches/${m.id}`}
      className="block rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Side username={nameOf(users, m.playerAId)} goals={m.goalsA} delta={m.aEloAfter - m.aEloBefore} won={m.goalsA > m.goalsB} align="left" />
        <span className="text-muted-foreground">:</span>
        <Side username={nameOf(users, m.playerBId)} goals={m.goalsB} delta={m.bEloAfter - m.bEloBefore} won={m.goalsB > m.goalsA} align="right" />
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{timeAgo(m.playedAt, now)}</span>
        <span className="ml-auto flex items-center gap-2">
          {reactionList.map(([emoji, n]) => (
            <span key={emoji}>
              {emoji}
              {n > 1 && <span className="tabular ml-0.5">{n}</span>}
            </span>
          ))}
          {comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3.5" />
              {comments}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
