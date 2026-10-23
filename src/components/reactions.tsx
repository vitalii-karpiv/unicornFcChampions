import { toggleReaction } from "@/app/(app)/matches/actions";
import { REACTIONS } from "@/lib/domain/validation";
import { cn } from "@/lib/utils";

export function Reactions({ matchId, rows, userId }: {
  matchId: string;
  rows: { emoji: string; userId: string }[];
  userId: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map((emoji) => {
        const count = rows.filter((r) => r.emoji === emoji).length;
        const mine = rows.some((r) => r.emoji === emoji && r.userId === userId);
        return (
          <form key={emoji} action={toggleReaction.bind(null, matchId, emoji)}>
            <button
              type="submit"
              aria-pressed={mine}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors hover:bg-muted",
                mine && "border-foreground/40 bg-muted",
              )}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="tabular text-xs text-muted-foreground">{count}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}
