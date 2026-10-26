"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { CELL, type HeatmapDay, clampLeft, trimToColumns, visibleColumns, weekday } from "@/lib/domain/heatmap";
import { matchesOnDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const LEVELS = ["bg-muted", "bg-foreground/25", "bg-foreground/45", "bg-foreground/70", "bg-foreground"];

const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);

/** Hovered/tapped cell: index into the shown days, cell centre x and top y relative to the wrapper. */
type Tip = { i: number; x: number; y: number };

export function Heatmap({ days }: { days: HeatmapDay[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const tipEl = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<number | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  // Fit as many recent week columns as the card is wide, so the grid never scrolls.
  useLayoutEffect(() => {
    const box = wrap.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setColumns(visibleColumns(entry.contentRect.width));
      setTip(null);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const shown = columns === null ? days : trimToColumns(days, columns);
  const current = tip && shown[tip.i];

  // Place the shared tooltip above the cell (below it when there is no room), kept inside the wrapper.
  useLayoutEffect(() => {
    const el = tipEl.current;
    const box = wrap.current;
    if (!tip || !el || !box) return;
    el.style.left = `${clampLeft(tip.x, el.offsetWidth, box.clientWidth)}px`;
    const above = tip.y - el.offsetHeight - 6;
    el.style.top = `${above >= 0 ? above : tip.y + CELL + 6}px`;
  }, [tip]);

  // Tapping anywhere but a cell dismisses the tooltip (touch has no hover-out).
  const open = tip !== null;
  useEffect(() => {
    if (!open) return;
    const close = (e: globalThis.PointerEvent) => {
      if (!(e.target as Element).closest("[data-i]")) setTip(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const cellAt = (e: PointerEvent): Tip | null => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
    const box = wrap.current;
    if (!cell || !box) return null;
    const c = cell.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    return { i: Number(cell.dataset.i), x: c.left + c.width / 2 - b.left, y: c.top - b.top };
  };

  const pad = shown.length ? weekday(shown[0].day) : 0;
  const total = shown.reduce((n, d) => n + d.count, 0);
  const range = shown.length === days.length ? "year" : `${columns} weeks`;
  return (
    <div className="space-y-2">
      <div ref={wrap} className="relative">
        <div className="overflow-hidden">
          <div
            className={cn("grid w-max grid-flow-col grid-rows-7 gap-[3px]", columns === null && "invisible")}
            onPointerOver={(e) => e.pointerType !== "touch" && setTip(cellAt(e))}
            onPointerLeave={(e) => e.pointerType !== "touch" && setTip(null)}
            onPointerDown={(e) => {
              if (e.pointerType !== "touch") return;
              const next = cellAt(e);
              setTip((prev) => (next && prev?.i === next.i ? null : next));
            }}
          >
            {Array.from({ length: pad }, (_, i) => (
              <span key={`pad-${i}`} className="size-[11px]" />
            ))}
            {shown.map((d, i) => (
              <span key={d.day} data-i={i} className={cn("size-[11px] rounded-[2px]", LEVELS[level(d.count)])} />
            ))}
          </div>
        </div>
        {current && (
          <div
            ref={tipEl}
            className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm"
          >
            {matchesOnDay(current.day, current.count)}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={cn(columns === null && "invisible")}>
          {total} match{total === 1 ? "" : "es"} in the last {range}
        </span>
        <span className="flex items-center gap-1">
          Less
          {LEVELS.map((c) => (
            <span key={c} className={cn("size-[10px] rounded-[2px]", c)} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
