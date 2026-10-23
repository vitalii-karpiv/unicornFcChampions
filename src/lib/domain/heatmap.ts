import { dayKey } from "./time";

const DAY_MS = 86_400_000;

/** Matches per Kyiv day for the `days` days ending today, oldest → newest. */
export function activityByDay(dates: Date[], now: Date, days = 365): { day: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);

  const [y, m, d] = dayKey(now).split("-").map(Number);
  const today = Date.UTC(y, m - 1, d);
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(today - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    return { day, count: counts.get(day) ?? 0 };
  });
}
