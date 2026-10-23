import type { Metadata } from "next";
import Link from "next/link";
import { getActivity, getRatedMatches, getUsers } from "@/lib/data/queries";
import { formatDateTime, timeAgo } from "@/lib/format";
import { nameOf, type UserMap, userMap } from "@/lib/users";

export const metadata: Metadata = { title: "Activity" };

type Snapshot = { playerAId: string; playerBId: string; goalsA: number; goalsB: number; playedAt: string };

const VERB = { create: "logged", update: "edited", delete: "deleted" } as const;

function describe(s: Snapshot, names: UserMap) {
  return `${nameOf(names, s.playerAId)} ${s.goalsA}–${s.goalsB} ${nameOf(names, s.playerBId)}`;
}

function change(before: Snapshot, after: Snapshot, names: UserMap): string {
  const parts: string[] = [];
  if (before.playerAId !== after.playerAId || before.playerBId !== after.playerBId || before.goalsA !== after.goalsA || before.goalsB !== after.goalsB) {
    parts.push(`${describe(before, names)} → ${describe(after, names)}`);
  }
  if (before.playedAt !== after.playedAt) {
    parts.push(`time ${formatDateTime(new Date(before.playedAt))} → ${formatDateTime(new Date(after.playedAt))}`);
  }
  return parts.join(" · ") || "no visible changes";
}

export default async function ActivityPage() {
  const [rows, users, matches] = await Promise.all([getActivity(100), getUsers(), getRatedMatches()]);
  const names = userMap(users);
  const existing = new Set(matches.map((m) => m.id));
  const now = new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Activity log</h1>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
      <ul className="overflow-hidden rounded-xl border">
        {rows.map((r) => {
          const before = r.before as Snapshot | null;
          const after = r.after as Snapshot | null;
          const detail =
            r.action === "update" && before && after
              ? change(before, after, names)
              : describe((after ?? before)!, names);
          const body = (
            <>
              <div className="text-sm">
                <span className="font-medium">{r.actor}</span> {VERB[r.action]} <span className="text-muted-foreground">{detail}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{timeAgo(r.createdAt, now)}</div>
            </>
          );
          return (
            <li key={r.id} className="border-b last:border-b-0">
              {existing.has(r.matchId) ? (
                <Link href={`/matches/${r.matchId}`} className="block px-4 py-3 hover:bg-muted/40">
                  {body}
                </Link>
              ) : (
                <div className="px-4 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
