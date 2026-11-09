"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Pause, Play, X } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { markReleasesSeen } from "@/app/(app)/whats-new-actions";
import type { Card } from "@/lib/releases";
import { cn } from "@/lib/utils";
import { frameDelta, initStory, isLast, SLIDE_MS, type StoryAction, storyKeyAction, storyReducer } from "@/lib/whats-new/story";
import { StoryArt } from "./story-art";

/** "Update" on an intro card, otherwise "n of N" within its release. */
function eyebrows(cards: Card[]): string[] {
  const out: string[] = [];
  let start = 0;
  cards.forEach((c, i) => {
    if (c.art === "intro") {
      start = i;
      out.push("Update");
      return;
    }
    let end = i;
    while (end + 1 < cards.length && cards[end + 1].art !== "intro") end++;
    out.push(`${i - start} of ${end - start}`);
  });
  return out;
}

/** The story itself. Mounted only while the dialog is open, so every opening starts fresh on the first card. */
function Story({ cards, onClose, primaryRef, keysRef }: {
  cards: Card[];
  onClose: () => void;
  primaryRef: React.RefObject<HTMLButtonElement | null>;
  /** The popup forwards its key presses here, so shortcuts work wherever focus is inside it. */
  keysRef: React.RefObject<((a: StoryAction) => void) | null>;
}) {
  const [s, dispatch] = useReducer(storyReducer, cards.length, initStory);
  useEffect(() => {
    keysRef.current = dispatch;
    return () => {
      keysRef.current = null;
    };
  }, [keysRef]);
  const labels = eyebrows(cards);
  const last = isLast(s);
  const current = cards[s.idx];

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const loop = (t: number) => {
      dispatch({ type: "tick", dt: frameDelta(prev, t) });
      prev = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const release = () => dispatch({ type: "held", on: false });
  const primary = last ? "Got it" : current.art === "intro" ? "Show me" : "Next";

  return (
    <div
      className="grid h-full grid-rows-[auto_1fr_auto]"
      onPointerEnter={(e) => e.pointerType === "mouse" && dispatch({ type: "hover", on: true })}
      onPointerLeave={(e) => e.pointerType === "mouse" && dispatch({ type: "hover", on: false })}
    >
      <div className="flex items-center gap-2.5 pl-4 pr-3.5 pt-3.5">
        <div className={cn("flex flex-1 gap-1 transition-opacity", s.held && "opacity-50")}>
          {cards.map((c, j) => (
            <button
              key={j}
              type="button"
              aria-label={`Go to card ${j + 1}: ${c.title}`}
              onClick={() => dispatch({ type: "go", idx: j })}
              className="flex h-3 flex-1 items-center"
            >
              <span className="block h-[3px] w-full overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full bg-foreground"
                  style={{ width: j < s.idx ? "100%" : j > s.idx ? "0%" : `${(s.elapsed / SLIDE_MS) * 100}%` }}
                />
              </span>
            </button>
          ))}
        </div>
        {!last && (
          <button
            type="button"
            aria-label={s.manual ? "Resume" : "Pause"}
            aria-pressed={s.manual}
            onClick={() => dispatch({ type: "toggle" })}
            className={cn(
              "grid size-[26px] place-items-center rounded-full",
              s.manual ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
            )}
          >
            {s.manual ? <Play className="size-3 fill-current" /> : <Pause className="size-3 fill-current" />}
          </button>
        )}
        <Dialog.Close aria-label="Close" className="grid size-[26px] place-items-center rounded-full bg-muted text-muted-foreground">
          <X className="size-3.5" strokeWidth={2.6} />
        </Dialog.Close>
      </div>

      <div
        className="min-h-0 touch-pan-y select-none overflow-hidden"
        onPointerDown={() => dispatch({ type: "held", on: true })}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="flex h-full transition-transform duration-[460ms] ease-[cubic-bezier(.3,.8,.25,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${-s.idx * 100}%)` }}
        >
          {cards.map((c, i) => {
            const active = i === s.idx;
            return (
              <section
                key={i}
                aria-hidden={!active}
                className="grid min-w-0 flex-[0_0_100%] content-start gap-3.5 px-4 pt-3.5 md:grid-cols-[300px_1fr] md:content-stretch md:gap-7 md:pl-4 md:pr-7 md:pt-4"
              >
                <div className="relative grid h-[170px] place-items-center overflow-hidden rounded-2xl bg-muted md:h-full">
                  <StoryArt key={s.visits[i]} art={c.art} version={c.version} active={active} />
                </div>
                <div className="grid content-start gap-2 md:content-center md:pb-3">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{labels[i]}</div>
                  <h3 className="text-balance text-xl font-semibold leading-tight tracking-tight md:text-[26px]">{c.title}</h3>
                  <p className="max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground md:text-[14.5px]">{c.body}</p>
                  {c.toc && (
                    <ol className="mt-1 hidden gap-1.5 md:grid">
                      {c.toc.map((t, k) => (
                        <li key={t} className="flex items-center gap-2 text-[13px]">
                          <span className="grid size-[18px] place-items-center rounded-[5px] bg-muted font-mono text-[10px] font-semibold text-muted-foreground">
                            {k + 1}
                          </span>
                          {t}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4 pt-2.5 md:pb-[18px] md:pl-4 md:pr-5 md:pt-3.5">
        <span className="mr-auto hidden font-mono text-[11px] text-muted-foreground md:block">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd> browse · <Kbd>Space</Kbd> pause
        </span>
        {s.idx > 0 && (
          <button type="button" onClick={() => dispatch({ type: "back" })} className="h-[42px] px-2.5 text-sm font-medium text-muted-foreground">
            Back
          </button>
        )}
        <button
          ref={primaryRef}
          type="button"
          onClick={() => (last ? onClose() : dispatch({ type: "next" }))}
          className="ml-auto h-[42px] rounded-[11px] bg-primary px-[22px] text-sm font-semibold text-primary-foreground md:ml-0"
        >
          {primary}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {s.manual ? "Paused" : ""}
      </span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-px inline-block rounded border border-b-2 bg-background px-1 text-foreground">{children}</span>
  );
}

export function WhatsNewDialog({ cards, open, onOpenChange }: {
  cards: Card[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const version = cards.find((c) => c.version)?.version;
  // Start keyboard focus on Next / Show me rather than the first progress segment.
  const primaryRef = useRef<HTMLButtonElement>(null);
  const keysRef = useRef<((a: StoryAction) => void) | null>(null);
  // Handled on the popup (not inside the story) so arrows keep working when focus falls back to the popup,
  // and Space pauses instead of pressing whichever button has focus (buttons activate Space on keyup).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const action = storyKeyAction(e.key);
    if (!action || !keysRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat || action.type !== "toggle") keysRef.current(action);
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === " ") e.preventDefault();
  };
  return (
    <Dialog.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          initialFocus={primaryRef}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className="fixed left-1/2 top-1/2 z-50 h-[min(480px,calc(100dvh-32px))] w-[calc(100vw-24px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border bg-card text-card-foreground shadow-2xl outline-none transition-[opacity,scale] duration-300 ease-[cubic-bezier(.2,.9,.25,1.15)] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 md:h-[390px] md:w-[700px] md:max-w-[700px] md:rounded-[20px]">
          <Dialog.Title className="sr-only">What&apos;s new{version ? ` in ${version}` : ""}</Dialog.Title>
          <Story cards={cards} onClose={() => onOpenChange(false)} primaryRef={primaryRef} keysRef={keysRef} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Opens once on mount for releases the player hasn't seen; closing it in any way marks them seen. */
export function WhatsNew({ cards }: { cards: Card[] }) {
  const [open, setOpen] = useState(true);
  const marked = useRef(false);
  return (
    <WhatsNewDialog
      cards={cards}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o && !marked.current) {
          marked.current = true;
          void markReleasesSeen();
        }
      }}
    />
  );
}
