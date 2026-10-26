import { START_ELO } from "./elo";
import { dayKey } from "./time";
import type { RatedMatch } from "./types";

export type EloDayRow = {
  /** Kyiv day, "YYYY-MM-DD". */
  day: string;
  /** Rounded Elo by user id at the end of that day; players keep their rating on days they don't play. */
  elo: Record<string, number>;
};

const DAY_MS = 86_400_000;

function dayBefore(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

/** End-of-day ratings on every day with a match, preceded by a shared starting row. Expects replay order. */
export function eloHistoryByDay(ms: RatedMatch[], userIds: string[]): EloDayRow[] {
  if (ms.length === 0) return [];
  const wanted = new Set(userIds);
  const current: Record<string, number> = Object.fromEntries(userIds.map((id) => [id, START_ELO]));
  const rows: EloDayRow[] = [{ day: dayBefore(dayKey(ms[0].playedAt)), elo: { ...current } }];

  for (const m of ms) {
    if (wanted.has(m.playerAId)) current[m.playerAId] = Math.round(m.aEloAfter);
    if (wanted.has(m.playerBId)) current[m.playerBId] = Math.round(m.bEloAfter);
    const day = dayKey(m.playedAt);
    const last = rows[rows.length - 1];
    if (last.day === day) last.elo = { ...current };
    else rows.push({ day, elo: { ...current } });
  }
  return rows;
}
