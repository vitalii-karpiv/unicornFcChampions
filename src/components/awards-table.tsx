import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { AWARDS, type AwardKey, type AwardWinner, POTM_MIN_GAMES } from "@/lib/domain/awards";
import { pct } from "@/lib/format";
import { nameOf, type UserMap } from "@/lib/users";

export function formatAwardValue(key: AwardKey, value: number): string {
  if (key === "eloGain") return `+${Math.round(value)}`;
  if (key === "winRate") return pct(value);
  if (key === "winStreak") return `${value} in a row`;
  return String(value);
}

type Props = {
  awards: Record<AwardKey, AwardWinner | null>;
  playerOfMonth: { userId: string; awardsWon: number } | null;
  users: UserMap;
  live: boolean;
};

export function PlayerOfMonth({ playerOfMonth, users, live }: Omit<Props, "awards">) {
  if (!playerOfMonth) {
    return (
      <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        👑 No Player of the Month {live ? "yet" : ""} — needs at least {POTM_MIN_GAMES} games.
      </div>
    );
  }
  const name = nameOf(users, playerOfMonth.userId);
  return (
    <Link href={`/players/${name}`} className="flex items-center gap-4 rounded-xl border bg-card p-5">
      <Avatar username={name} size={48} />
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          👑 Player of the Month{live && " · leading"}
        </div>
        <div className="text-lg font-semibold">{name}</div>
        <div className="text-xs text-muted-foreground">
          {playerOfMonth.awardsWon} award{playerOfMonth.awardsWon === 1 ? "" : "s"}
        </div>
      </div>
    </Link>
  );
}

export function AwardsTable({ awards, playerOfMonth, users, live }: Props) {
  return (
    <div className="space-y-4">
      <PlayerOfMonth playerOfMonth={playerOfMonth} users={users} live={live} />
      <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
        {AWARDS.map((a) => {
          const w = awards[a.key];
          const name = w ? nameOf(users, w.userId) : null;
          return (
            <div key={a.key} className="flex items-center gap-3 bg-background p-4">
              <span className="text-xl">{a.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">
                  {a.label}
                  {a.minGames > 1 && ` (${a.minGames}+ games)`}
                </div>
                {w && name ? (
                  <div className="flex items-baseline gap-2">
                    <Link href={`/players/${name}`} className="truncate text-sm font-medium">
                      {name}
                    </Link>
                    <span className="tabular font-mono text-xs text-muted-foreground">{formatAwardValue(a.key, w.value)}</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
