import { starsLabel } from "@/lib/domain/stars";
import { cn } from "@/lib/utils";

const STAR_PATH = "M12 2.6l2.85 5.98 6.55.78-4.84 4.5 1.28 6.48L12 17.1l-5.84 3.24 1.28-6.48-4.84-4.5 6.55-.78z";

/** A vector star filled from the left by `fill` (0–1): gold over an empty outline. */
export function Star({ fill = 1, size = 14, className }: { fill?: number; size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full fill-muted stroke-muted-foreground/40" strokeWidth={1.2}>
        <path d={STAR_PATH} />
      </svg>
      <span
        className="absolute inset-0 overflow-hidden transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }}
      >
        <svg viewBox="0 0 24 24" className="fill-star stroke-star" strokeWidth={1.2} style={{ width: size, height: size }}>
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  );
}

/** Five stars like the in-game rating (half stars included); 5+ adds a gold "+" badge. */
export function StarRow({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  const whole = Math.min(value, 10) / 2;
  return (
    <span
      role="img"
      aria-label={`Team rating ${starsLabel(value)} stars`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} fill={whole - i} size={size} />
      ))}
      {value === 12 && (
        <span className="ml-0.5 rounded-[4px] border border-star px-1 font-mono text-[10px] font-bold leading-[14px] text-star">
          +
        </span>
      )}
    </span>
  );
}

/** Compact form for tight spots (match cards, records): one gold star and the number. */
export function TeamStars({ value, size = 12, className }: { value: number; size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Team rating ${starsLabel(value)} stars`}
      className={cn("inline-flex items-center gap-0.5 font-mono tabular", className)}
    >
      <Star size={size} />
      {starsLabel(value)}
    </span>
  );
}
