import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { getRatedMatches, getUsers } from "@/lib/data/queries";
import { computeRecords, type RecordEntry } from "@/lib/domain/records";
import { elo, formatDate } from "@/lib/format";
import { nameOf, userMap } from "@/lib/users";

export const metadata: Metadata = { title: "Records" };

export default async function RecordsPage() {
  const [users, matches] = await Promise.all([getUsers(), getRatedMatches()]);
  const names = userMap(users);
  const r = computeRecords(matches, users.map((u) => u.id));
  const byId = new Map(matches.map((m) => [m.id, m]));
  const score = (e: RecordEntry) => {
    const m = e && byId.get(e.matchId);
    return m ? `${Math.max(m.goalsA, m.goalsB)}–${Math.min(m.goalsA, m.goalsB)}` : "";
  };

  const rows: { emoji: string; label: string; entry: RecordEntry; value: (e: NonNullable<RecordEntry>) => string }[] = [
    { emoji: "🔥", label: "Longest win streak", entry: r.longestWinStreak, value: (e) => `${e.value} wins` },
    { emoji: "💥", label: "Biggest win", entry: r.biggestWin, value: (e) => score(e) },
    { emoji: "🚀", label: "Highest Elo ever", entry: r.highestElo, value: (e) => elo(e.value) },
    { emoji: "⚽", label: "Most goals in a match", entry: r.mostGoalsInMatch, value: (e) => `${e.value} goals` },
    { emoji: "🥶", label: "Longest losing streak", entry: r.longestLossStreak, value: (e) => `${e.value} losses` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">All-time records</h1>
      <div className="overflow-hidden rounded-xl border">
        {rows.map(({ emoji, label, entry, value }) => {
          const name = entry ? nameOf(names, entry.userId) : null;
          return (
            <div key={label} className="flex items-center gap-4 border-b p-4 last:border-b-0">
              <span className="text-2xl">{emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{label}</div>
                {entry && name ? (
                  <div className="mt-0.5 flex items-center gap-2">
                    <Avatar username={name} size={20} />
                    <Link href={`/players/${name}`} className="truncate text-sm font-medium">
                      {name}
                    </Link>
                  </div>
                ) : (
                  <div className="mt-0.5 text-sm text-muted-foreground">Nobody yet</div>
                )}
              </div>
              {entry && (
                <Link href={`/matches/${entry.matchId}`} className="text-right">
                  <div className="tabular font-mono text-lg font-semibold">{value(entry)}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(entry.playedAt)}</div>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
