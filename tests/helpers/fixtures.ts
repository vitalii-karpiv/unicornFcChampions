import type { MatchRow } from "@/lib/domain/types";

let seq = 0;

/** Build a match row; createdAt defaults to playedAt, id is sequential. */
export function mk(
  a: string,
  b: string,
  goalsA: number,
  goalsB: number,
  iso: string,
  extra: Partial<MatchRow> = {},
): MatchRow {
  seq += 1;
  const playedAt = new Date(iso);
  return {
    id: `m${String(seq).padStart(4, "0")}`,
    playerAId: a,
    playerBId: b,
    goalsA,
    goalsB,
    playedAt,
    createdAt: playedAt,
    ...extra,
  };
}
