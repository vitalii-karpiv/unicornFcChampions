"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

type Row = { t: number; [userId: string]: number };
type Series = { key: string; name: string; color: string; dashed: boolean };

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: null },
] as const;

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Kyiv" });
const fullDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Kyiv",
});

/** Rows inside the window, with ratings carried to its edges so every line spans the whole range. */
function windowed(data: Row[], days: number | null, now: number): Row[] {
  if (data.length === 0) return [];
  const start = days === null ? data[0].t : now - days * DAY_MS;
  const before = data.filter((r) => r.t < start).at(-1);
  const rows = [...(before && days !== null ? [{ ...before, t: start }] : []), ...data.filter((r) => r.t >= start)];
  const last = rows.at(-1);
  if (last && last.t < now) rows.push({ ...last, t: now });
  return rows;
}

export function EloHistoryChart({ data, series, now }: { data: Row[]; series: Series[]; now: number }) {
  const [days, setDays] = useState<number | null>(30);
  const [focus, setFocus] = useState<string | null>(null);
  const rows = useMemo(() => windowed(data, days, now), [data, days, now]);

  if (data.length < 2) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">Play a match to start the chart.</div>;
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1" role="group" aria-label="Range">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setDays(r.days)}
            aria-pressed={days === r.days}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors",
              days === r.days ? "bg-muted font-medium text-foreground" : "hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickCount={4}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(t: number) => dateFormat.format(t)}
              padding={{ left: 4, right: 4 }}
            />
            <YAxis
              domain={["dataMin - 15", "dataMax + 15"]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => String(Math.round(v))}
              width={48}
            />
            <ReferenceLine y={1000} stroke="var(--border)" strokeDasharray="3 3" />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              itemSorter={(item) => -Number(item.value)}
              labelFormatter={(t) => fullDateFormat.format(Number(t))}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                type="monotone"
                stroke={s.color}
                strokeWidth={focus === s.key ? 2.5 : 1.75}
                strokeOpacity={focus && focus !== s.key ? 0.15 : 1}
                strokeDasharray={s.dashed ? "4 3" : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {series.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFocus(focus === s.key ? null : s.key)}
            aria-pressed={focus === s.key}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors",
              focus === s.key ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground",
              focus && focus !== s.key && "opacity-50",
            )}
          >
            <Avatar username={s.name} size={16} />
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
