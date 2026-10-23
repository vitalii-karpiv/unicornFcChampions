import { cn } from "@/lib/utils";

export function EloDelta({ value, className }: { value: number; className?: string }) {
  const n = Math.round(value);
  return (
    <span
      className={cn(
        "tabular font-mono text-xs",
        n > 0 ? "text-win" : n < 0 ? "text-loss" : "text-muted-foreground",
        className,
      )}
    >
      {n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0"}
    </span>
  );
}
