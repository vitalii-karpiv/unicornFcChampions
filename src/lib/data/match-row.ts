import { snapshotStars } from "@/lib/domain/stars";

type RawRow = {
  playedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  starsA?: number | null;
  starsB?: number | null;
};

/**
 * Normalise a cached `matches` row: the data cache stores JSON (dates come back as strings), and rows cached
 * before the team-stars migration have no stars, which count as 5★ v 5★.
 */
export function toMatchRow<T extends RawRow>(
  r: T,
): Omit<T, "playedAt" | "createdAt" | "updatedAt" | "starsA" | "starsB"> & {
  playedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  starsA: number;
  starsB: number;
} {
  return {
    ...r,
    playedAt: new Date(r.playedAt),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    ...snapshotStars({ starsA: r.starsA ?? undefined, starsB: r.starsB ?? undefined }),
  };
}
