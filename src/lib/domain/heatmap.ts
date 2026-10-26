import { dayKey } from "./time";

const DAY_MS = 86_400_000;

export type HeatmapDay = { day: string; count: number };

/** Cell size and gap in px; must match the classes in `components/heatmap.tsx`. */
export const CELL = 11;
export const GAP = 3;
/** A 365-day range spans at most 53 Monday-first week columns. */
export const MAX_COLUMNS = 53;

/** Matches per Kyiv day for the `days` days ending today, oldest → newest. */
export function activityByDay(dates: Date[], now: Date, days = 365): HeatmapDay[] {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);

  const [y, m, d] = dayKey(now).split("-").map(Number);
  const today = Date.UTC(y, m - 1, d);
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(today - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    return { day, count: counts.get(day) ?? 0 };
  });
}

/** Monday = 0 … Sunday = 6 for a "YYYY-MM-DD" key. */
export const weekday = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/** How many week columns fit in `width` px, between 1 and a full year. */
export function visibleColumns(width: number): number {
  return Math.min(MAX_COLUMNS, Math.max(1, Math.floor((width + GAP) / (CELL + GAP))));
}

/** Keeps the most recent `columns` week columns (the last one is partial, ending today). */
export function trimToColumns(days: HeatmapDay[], columns: number): HeatmapDay[] {
  if (!days.length) return days;
  const keep = weekday(days[days.length - 1].day) + 1 + 7 * (columns - 1);
  return keep >= days.length ? days : days.slice(-keep);
}

/** Left offset that centres a tooltip on `center` while keeping it inside the container. */
export function clampLeft(center: number, tipWidth: number, containerWidth: number): number {
  return Math.min(Math.max(center - tipWidth / 2, 0), Math.max(0, containerWidth - tipWidth));
}
