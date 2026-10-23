"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMatch } from "@/app/(app)/matches/actions";
import { Button } from "@/components/ui/button";

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await removeMatch(matchId);
            if (res?.error) toast.error(res.error);
          })
        }
      >
        {pending ? "Deleting…" : "Confirm delete"}
      </Button>
    </div>
  );
}
