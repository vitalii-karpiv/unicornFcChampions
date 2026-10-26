"use client";

import { Minus, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { saveMatch } from "@/app/(app)/matches/actions";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { matchOdds, type PlayerRating } from "@/lib/domain/odds";
import { cn } from "@/lib/utils";

type Player = { id: string; username: string };

type Props = {
  players: Player[];
  /** Current rating by user id; omit to hide the odds (e.g. when editing a past match). */
  ratings?: Record<string, PlayerRating>;
  initial: { id?: string; playerAId: string; playerBId: string; goalsA: number; goalsB: number; playedAt: string };
};

function Stepper({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label={`Decrease ${name}`}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-11 items-center justify-center rounded-full border text-muted-foreground active:bg-muted"
      >
        <Minus className="size-4" />
      </button>
      <span className="tabular w-12 text-center font-mono text-5xl font-semibold">{value}</span>
      <button
        type="button"
        aria-label={`Increase ${name}`}
        onClick={() => onChange(Math.min(99, value + 1))}
        className="flex size-11 items-center justify-center rounded-full border text-muted-foreground active:bg-muted"
      >
        <Plus className="size-4" />
      </button>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function PlayerSelect({ name, value, onChange, players }: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  players: Player[];
}) {
  const current = players.find((p) => p.id === value);
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar username={current?.username ?? "?"} size={48} />
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full max-w-40 rounded-md border bg-background px-2 text-center text-sm font-medium"
        required
      >
        <option value="" disabled>
          Pick player
        </option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.username}
          </option>
        ))}
      </select>
    </div>
  );
}

const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(Math.round(n))}`;

function OddsSide({ odds, stakes, align }: { odds: number; stakes: { win: number; loss: number }; align: "left" | "right" }) {
  return (
    <div className={cn("space-y-0.5", align === "right" && "text-right")}>
      <div className="tabular font-mono text-lg font-semibold">{Math.round(odds * 100)}%</div>
      <div className="tabular text-xs text-muted-foreground">
        win {signed(stakes.win)} · lose {signed(stakes.loss)}
      </div>
    </div>
  );
}

/** Elo-based expectation for the picked pair, shown before the score is entered. */
function Odds({ a, b }: { a: PlayerRating; b: PlayerRating }) {
  const odds = matchOdds(a, b);
  const pctA = Math.round(odds.expectedA * 100);
  return (
    <div className="space-y-2" aria-label="Elo odds">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted-foreground/30">
        <span className="bg-foreground" style={{ width: `${pctA}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <OddsSide odds={odds.expectedA} stakes={odds.a} align="left" />
        <OddsSide odds={odds.expectedB} stakes={odds.b} align="right" />
      </div>
    </div>
  );
}

export function MatchForm({ players, initial, ratings }: Props) {
  const [state, action, pending] = useActionState(saveMatch, undefined);
  const [a, setA] = useState(initial.playerAId);
  const [b, setB] = useState(initial.playerBId);
  const [goalsA, setGoalsA] = useState(initial.goalsA);
  const [goalsB, setGoalsB] = useState(initial.goalsB);
  const ratingA = ratings?.[a];
  const ratingB = ratings?.[b];

  return (
    <form action={action} className="space-y-8">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <PlayerSelect name="playerAId" value={a} onChange={setA} players={players} />
        <span className="pt-4 text-sm text-muted-foreground">vs</span>
        <PlayerSelect name="playerBId" value={b} onChange={setB} players={players} />
      </div>
      {a !== b && ratingA && ratingB && <Odds a={ratingA} b={ratingB} />}
      <div className="grid grid-cols-2 gap-2">
        <Stepper name="goalsA" value={goalsA} onChange={setGoalsA} />
        <Stepper name="goalsB" value={goalsB} onChange={setGoalsB} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="playedAt">Played at</Label>
        <input
          id="playedAt"
          name="playedAt"
          type="datetime-local"
          defaultValue={initial.playedAt}
          required
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-loss">
          {state.error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-base" disabled={pending || !a || !b || a === b}>
        {pending ? "Saving…" : initial.id ? "Save changes" : "Save match"}
      </Button>
    </form>
  );
}
