"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RELEASES, storyCards } from "@/lib/releases";
import { WhatsNewDialog } from "./whats-new-dialog";

/** Settings entry that replays the latest release's story without touching the seen state. */
export function WhatsNewButton() {
  const [open, setOpen] = useState(false);
  const latest = RELEASES[0];
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        See what&apos;s new in {latest.version}
      </Button>
      <WhatsNewDialog cards={storyCards([latest])} open={open} onOpenChange={setOpen} />
    </>
  );
}
