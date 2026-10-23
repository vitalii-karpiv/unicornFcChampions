import { cn } from "@/lib/utils";

const LEVELS = ["bg-muted", "bg-foreground/25", "bg-foreground/45", "bg-foreground/70", "bg-foreground"];

const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);

/** Monday = 0 … Sunday = 6 for a "YYYY-MM-DD" key. */
const weekday = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

export function Heatmap({ days }: { days: { day: string; count: number }[] }) {
  const pad = days.length ? weekday(days[0].day) : 0;
  const total = days.reduce((n, d) => n + d.count, 0);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto pb-1">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
          {Array.from({ length: pad }, (_, i) => (
            <span key={`pad-${i}`} className="size-[11px]" />
          ))}
          {days.map((d) => (
            <span
              key={d.day}
              title={`${d.count} match${d.count === 1 ? "" : "es"} on ${d.day}`}
              className={cn("size-[11px] rounded-[2px]", LEVELS[level(d.count)])}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total} match{total === 1 ? "" : "es"} in the last year
        </span>
        <span className="flex items-center gap-1">
          Less
          {LEVELS.map((c) => (
            <span key={c} className={cn("size-[10px] rounded-[2px]", c)} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
