"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelBetAction } from "@/app/(app)/bets/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CANCEL_FEE } from "@/lib/domain/bets/rules";
import { cancelFee } from "@/lib/domain/bets/settle";
import { coins } from "@/lib/format";

/** "Cancel" link on an open bet, with a confirm dialog that spells out the fee. */
export function CancelBet({ betId, label, stake }: { betId: string; label: string; stake: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const fee = cancelFee(stake);
  const refund = stake - fee;

  function confirm() {
    startTransition(async () => {
      const res = await cancelBetAction(betId);
      if (res.error) {
        setError(res.error);
        router.refresh(); // the bet may have just settled
        return;
      }
      setOpen(false);
      toast(`Bet cancelled · ${coins(res.refund ?? refund)} back`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setError(null);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        Cancel
      </button>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Cancel this bet?</DialogTitle>
          <DialogDescription>
            {label} · stake {coins(stake)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee ({Math.round(CANCEL_FEE * 100)}%)</span>
            <span className="tabular font-mono">−{coins(fee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">You get back</span>
            <span className="tabular font-mono font-semibold">{coins(refund)}</span>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep bet</DialogClose>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            Cancel bet · {coins(refund)} back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
