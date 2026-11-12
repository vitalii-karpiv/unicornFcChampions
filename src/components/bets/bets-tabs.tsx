import Link from "next/link";
import { cn } from "@/lib/utils";

export type BetsTab = "today" | "futures" | "mine";

const TABS: { key: BetsTab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "futures", label: "Futures" },
  { key: "mine", label: "My bets" },
];

/** Segmented control (looks like the shadcn Tabs list) whose tabs are links to `/bets?tab=…`. */
export function BetsTabs({ active }: { active: BetsTab }) {
  return (
    <nav aria-label="Bets sections" className="flex h-9 rounded-lg bg-muted p-[3px]">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "today" ? "/bets" : `/bets?tab=${t.key}`}
          scroll={false}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "flex flex-1 items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            t.key === active && "bg-background text-foreground shadow-sm dark:border dark:border-input dark:bg-input/30",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
