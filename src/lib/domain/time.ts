import { TZDate } from "@date-fns/tz";

export const TZ = "Europe/Kyiv";

const pad = (n: number) => String(n).padStart(2, "0");

function parseKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

/** "YYYY-MM" of the given instant in Kyiv time. */
export function monthKey(d: Date): string {
  const k = new TZDate(d.getTime(), TZ);
  return `${k.getFullYear()}-${pad(k.getMonth() + 1)}`;
}

/** "YYYY-MM-DD" of the given instant in Kyiv time. */
export function dayKey(d: Date): string {
  const k = new TZDate(d.getTime(), TZ);
  return `${k.getFullYear()}-${pad(k.getMonth() + 1)}-${pad(k.getDate())}`;
}

/** UTC instant of Kyiv midnight on the 1st of the month. */
export function monthStart(key: string): Date {
  const { year, month } = parseKey(key);
  return new Date(new TZDate(year, month - 1, 1, TZ).getTime());
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseKey(key);
  const total = year * 12 + (month - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

export function nextMonthStart(key: string): Date {
  return monthStart(shiftMonth(key, 1));
}

export function currentMonthKey(now: Date = new Date()): string {
  return monthKey(now);
}

/** Matches played before the current Kyiv month belong to an ended (locked) month. */
export function isLockedDate(playedAt: Date, now: Date): boolean {
  return playedAt.getTime() < monthStart(currentMonthKey(now)).getTime();
}

/** Parse a `datetime-local` value ("YYYY-MM-DDTHH:mm") as Kyiv wall-clock time. Invalid → Invalid Date. */
export function fromKyivLocal(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return new Date(Number.NaN);
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(new TZDate(y, mo - 1, d, h, mi, TZ).getTime());
}

/** Format an instant as a Kyiv `datetime-local` value. */
export function toKyivLocal(d: Date): string {
  const k = new TZDate(d.getTime(), TZ);
  return `${dayKey(d)}T${pad(k.getHours())}:${pad(k.getMinutes())}`;
}
