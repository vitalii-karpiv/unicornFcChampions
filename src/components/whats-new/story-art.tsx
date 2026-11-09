"use client";

import { Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { Star } from "@/components/team-stars";
import type { ArtKey } from "@/lib/releases";
import { cn } from "@/lib/utils";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Run `steps` ([delay ms, fn]) while mounted; under reduced motion every step runs at once. */
function useTimeline(active: boolean, steps: [number, () => void][]) {
  useEffect(() => {
    if (!active) return;
    const instant = reducedMotion();
    const ids = steps.map(([ms, fn]) => setTimeout(fn, instant ? 0 : ms));
    return () => ids.forEach(clearTimeout);
    // Steps are built inline each render; the timeline restarts only when the card becomes active (it is re-keyed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

function IntroArt({ version }: { version: string }) {
  const short = version.split(".").slice(0, 2).join(".");
  return (
    <div
      className="relative grid size-full place-items-center"
      style={{ background: "radial-gradient(closest-side, color-mix(in oklch, var(--star) 18%, transparent), transparent)" }}
    >
      <div className="wn-orbit absolute left-1/2 top-1/2 -ml-[90px] -mt-[90px] size-[180px]">
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 -ml-2 -mt-2"
              style={{ transform: `translate(${Math.cos(a) * 82}px, ${Math.sin(a) * 70}px)`, opacity: i % 2 ? 0.5 : 1 }}
            >
              <Star fill={1} size={16} />
            </span>
          );
        })}
      </div>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const r = 74 + (i % 3) * 18;
        return (
          <i
            key={i}
            className="wn-burst-dot absolute left-1/2 top-1/2 size-1.5 rounded-full bg-star"
            style={{ "--x": `${Math.cos(a) * r}px`, "--y": `${Math.sin(a) * r * 0.75}px` } as React.CSSProperties}
          />
        );
      })}
      <div className="relative grid justify-items-center gap-1">
        <span className="wn-pop font-mono text-6xl font-semibold leading-none tracking-tighter">{short}</span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Unicorn FC</span>
      </div>
    </div>
  );
}

function TeamStarsArt({ active }: { active: boolean }) {
  const [half, setHalf] = useState(0);
  const [plus, setPlus] = useState(false);
  useTimeline(active, [
    ...[2, 4, 6, 8, 10].map((h, k): [number, () => void] => [300 + k * 300, () => setHalf(h)]),
    [1800, () => setPlus(true)],
  ]);
  return (
    <div className="grid justify-items-center gap-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} fill={Math.max(0, Math.min(1, half / 2 - i))} size={26} />
        ))}
        <span
          className={cn(
            "rounded-md border-[1.5px] border-star px-1.5 font-mono text-xs font-bold text-star transition-all duration-300 motion-reduce:transition-none",
            plus ? "scale-100 opacity-100 shadow-[0_0_0_4px_color-mix(in_oklch,var(--star)_18%,transparent)]" : "scale-90 opacity-20",
          )}
        >
          5+
        </span>
      </div>
      <span className="font-mono text-xs text-muted-foreground">0.5★ … 5★ · 5+</span>
    </div>
  );
}

function EloOddsArt({ active }: { active: boolean }) {
  const [shifted, setShifted] = useState(false);
  const [gain, setGain] = useState(false);
  useTimeline(active, [
    [400, () => setShifted(true)],
    [1300, () => setGain(true)],
  ]);
  const a = shifted ? 24 : 50;
  return (
    <div className="grid w-[78%] gap-2">
      <div className="flex justify-between font-mono text-xs font-semibold tabular">
        <span>
          <span className="text-star">★3</span> {a}%
        </span>
        <span>
          {100 - a}% <span className="text-star">★5</span>
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-md bg-foreground">
        <span
          className="block h-full bg-muted-foreground/60 transition-[width] duration-[900ms] ease-[cubic-bezier(.3,.8,.3,1)] motion-reduce:transition-none"
          style={{ width: `${a}%` }}
        />
      </div>
      <div className="text-center text-[11px] text-muted-foreground">win chance at equal Elo</div>
      <div className={cn("flex justify-between font-mono text-xs font-semibold transition-opacity duration-500 motion-reduce:transition-none", gain ? "opacity-100" : "opacity-0")}>
        <span>
          win: <span className="text-win">+24</span>
        </span>
        <span>
          win: <span className="text-win">+8</span>
        </span>
      </div>
    </div>
  );
}

function GiantKillingArt() {
  return (
    <>
      <Swords className="wn-slash size-16" strokeWidth={1.4} />
      <span className="wn-rise absolute bottom-4 rounded-full border bg-card px-2.5 py-1 font-mono text-[11.5px] font-semibold">
        <span className="text-star">★3</span> beat <span className="text-star">★5</span> · 2–0
      </span>
    </>
  );
}

const BARS = [
  { label: "Underdog", wdl: "6-1-2", h: 80, color: "bg-win" },
  { label: "Even", wdl: "9-3-7", h: 54, color: "bg-muted-foreground" },
  { label: "Favourite", wdl: "11-2-4", h: 68, color: "bg-foreground" },
];

function StrengthArt({ active }: { active: boolean }) {
  const [grown, setGrown] = useState(false);
  useTimeline(active, [[250, () => setGrown(true)]]);
  return (
    <div className="flex h-[118px] items-end gap-3.5">
      {BARS.map((b) => (
        <div key={b.label} className="grid justify-items-center gap-1.5">
          <span className="font-mono text-[10px] font-semibold">{b.wdl}</span>
          <span
            className={cn("block w-9 rounded-t-md rounded-b-sm transition-[height] duration-[800ms] ease-[cubic-bezier(.3,1.2,.4,1)] motion-reduce:transition-none", b.color)}
            style={{ height: grown ? b.h : 8 }}
          />
          <span className="text-[10px] text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Picture for one story card. Re-key it when its card becomes current so its animation replays. */
export function StoryArt({ art, version, active }: { art: ArtKey; version?: string; active: boolean }) {
  switch (art) {
    case "intro":
      return <IntroArt version={version ?? ""} />;
    case "team-stars":
      return <TeamStarsArt active={active} />;
    case "elo-odds":
      return <EloOddsArt active={active} />;
    case "giant-killing":
      return <GiantKillingArt />;
    case "strength-split":
      return <StrengthArt active={active} />;
  }
}
