import { TZDate } from "@date-fns/tz";
import { format, formatDistanceStrict } from "date-fns";
import { TZ } from "@/lib/domain/time";

export const formatDateTime = (d: Date) => format(new TZDate(d.getTime(), TZ), "d MMM yyyy, HH:mm");
export const formatDate = (d: Date) => format(new TZDate(d.getTime(), TZ), "d MMM yyyy");
/** Heatmap tooltip text for a "YYYY-MM-DD" Kyiv day key. */
export const matchesOnDay = (day: string, count: number) =>
  `${count === 0 ? "No matches" : `${count} match${count === 1 ? "" : "es"}`} · ${formatDate(new Date(`${day}T12:00:00Z`))}`;
export const formatMonth = (key: string) => format(new TZDate(`${key}-15T12:00:00`, TZ), "MMMM yyyy");
export const timeAgo = (d: Date, now = new Date()) => `${formatDistanceStrict(d, now)} ago`;
export const elo = (n: number) => Math.round(n).toString();
export const pct = (n: number) => `${Math.round(n * 100)}%`;
/** Delta consistent with the rounded before → after numbers shown next to it. */
export const displayDelta = (before: number, after: number) => Math.round(after) - Math.round(before);
