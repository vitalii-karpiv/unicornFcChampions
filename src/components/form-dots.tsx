import { cn } from "@/lib/utils";
import type { Outcome } from "@/lib/domain/types";

const COLOR: Record<Outcome, string> = { W: "bg-win", D: "bg-muted-foreground/50", L: "bg-loss" };
const LABEL: Record<Outcome, string> = { W: "win", D: "draw", L: "loss" };

/** Last results, oldest → newest (newest on the right). */
export function FormDots({ outcomes }: { outcomes: Outcome[] }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Form: ${outcomes.map((o) => LABEL[o]).join(", ") || "no games"}`}>
      {outcomes.map((o, i) => (
        <span key={i} title={LABEL[o]} className={cn("size-2 rounded-full", COLOR[o])} />
      ))}
    </span>
  );
}
