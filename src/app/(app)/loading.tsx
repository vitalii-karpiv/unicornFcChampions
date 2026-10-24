import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
