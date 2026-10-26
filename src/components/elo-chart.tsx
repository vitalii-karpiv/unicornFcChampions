"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { n: number; elo: number; label: string };

export function EloChart({ data, color = "var(--foreground)" }: { data: Point[]; color?: string }) {
  if (data.length < 2) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Play a match to start the chart.</div>;
  }
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis dataKey="n" hide />
          <YAxis
            domain={["dataMin - 10", "dataMax + 10"]}
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
            labelFormatter={(_, payload) => payload?.[0]?.payload.label ?? ""}
            formatter={(v) => [v, "Elo"]}
          />
          <Line type="monotone" dataKey="elo" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
