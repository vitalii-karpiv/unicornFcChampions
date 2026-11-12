import { dayKey, nextDayStart } from "@/lib/domain/time";
import type { MatchRow } from "@/lib/domain/types";
import { BET_DELAY_MS, BET_TTL_MS, BIG_WIN, CANCEL_FEE, HIGH_SCORE } from "./rules";
import type { BetRecord, BetSpec, BetStatus, Settlement } from "./types";

const goalsOf = (m: MatchRow, u: string) => (m.playerAId === u ? m.goalsA : m.goalsB);
const otherGoals = (m: MatchRow, u: string) => (m.playerAId === u ? m.goalsB : m.goalsA);

const decided = (status: BetStatus, ms: MatchRow[]): Settlement => ({
  status,
  matchIds: ms.map((m) => m.id),
  at: ms[ms.length - 1].playedAt,
});

function settlePair(
  spec: Exclude<BetSpec, { type: "group" }>,
  placedAt: Date,
  matches: MatchRow[],
  now: Date,
): Settlement {
  const start = placedAt.getTime() + BET_DELAY_MS;
  const expiry = placedAt.getTime() + BET_TTL_MS;
  const cands = matches.filter((m) => {
    const t = m.playedAt.getTime();
    const pair =
      (m.playerAId === spec.a && m.playerBId === spec.b) ||
      (m.playerAId === spec.b && m.playerBId === spec.a);
    return pair && t >= start && t < expiry;
  });

  if (spec.type === "streak3") {
    const wins: MatchRow[] = [];
    for (const m of cands) {
      if (goalsOf(m, spec.player) > otherGoals(m, spec.player)) {
        wins.push(m);
        if (wins.length === 3) return decided("won", wins);
      } else {
        return decided("lost", [m]);
      }
    }
  } else if (cands.length > 0) {
    const m = cands[0];
    let win: boolean;
    switch (spec.type) {
      case "winner": {
        const ga = goalsOf(m, spec.a);
        const gb = goalsOf(m, spec.b);
        const result = ga === gb ? "draw" : ga > gb ? spec.a : spec.b;
        win = result === spec.pick;
        break;
      }
      case "total": {
        const over = m.goalsA + m.goalsB > spec.line;
        win = spec.side === "over" ? over : !over;
        break;
      }
      case "margin": {
        const loser = spec.winner === spec.a ? spec.b : spec.a;
        const d = goalsOf(m, spec.winner) - goalsOf(m, loser);
        win = d >= spec.min && d <= (spec.max ?? Infinity);
        break;
      }
      case "score":
        win = goalsOf(m, spec.a) === spec.goalsA && goalsOf(m, spec.b) === spec.goalsB;
        break;
      case "playerGoals": {
        const over = goalsOf(m, spec.player) > spec.line;
        win = spec.side === "over" ? over : !over;
        break;
      }
    }
    return decided(win ? "won" : "lost", [m]);
  }

  if (now.getTime() >= expiry) return { status: "void", matchIds: [], at: new Date(expiry) };
  return { status: "open", matchIds: [], at: null };
}

function settleGroup(
  spec: Extract<BetSpec, { type: "group" }>,
  placedAt: Date,
  matches: MatchRow[],
  now: Date,
): Settlement {
  const start = placedAt.getTime() + BET_DELAY_MS;
  const end = nextDayStart(dayKey(placedAt));
  if (start >= end.getTime()) return { status: "void", matchIds: [], at: end };

  const qualifies = (m: MatchRow) => {
    switch (spec.cond) {
      case "bigWin":
        return Math.abs(m.goalsA - m.goalsB) >= BIG_WIN;
      case "highScore":
        return Math.max(m.goalsA, m.goalsB) >= HIGH_SCORE;
      case "draw":
        return m.goalsA === m.goalsB;
      case "playerWin": {
        const p = spec.player;
        if (!p || (m.playerAId !== p && m.playerBId !== p)) return false;
        return goalsOf(m, p) > otherGoals(m, p);
      }
    }
  };
  const hit = matches.find((m) => {
    const t = m.playedAt.getTime();
    return t >= start && t < end.getTime() && qualifies(m);
  });

  if (hit) return decided(spec.side === "yes" ? "won" : "lost", [hit]);
  if (now.getTime() >= end.getTime()) {
    return { status: spec.side === "yes" ? "lost" : "won", matchIds: [], at: end };
  }
  return { status: "open", matchIds: [], at: null };
}

/** `matches` must be in replay order (sortMatches). */
export function settleBet(
  bet: Pick<BetRecord, "spec" | "placedAt" | "cancelledAt">,
  matches: MatchRow[],
  now: Date,
): Settlement {
  const { spec, placedAt, cancelledAt } = bet;
  // A cancellation is final: matches logged later never settle the bet.
  if (cancelledAt) return { status: "cancelled", matchIds: [], at: cancelledAt };
  return spec.type === "group"
    ? settleGroup(spec, placedAt, matches, now)
    : settlePair(spec, placedAt, matches, now);
}

/** Coins kept when an open bet is cancelled; rounded up, so every cancellation costs at least 1. */
export function cancelFee(stake: number): number {
  return Math.ceil(stake * CANCEL_FEE - 1e-9);
}

export function betReturn(bet: Pick<BetRecord, "stake" | "odds">, status: BetStatus): number {
  if (status === "won") return Math.round(bet.stake * bet.odds);
  if (status === "void") return bet.stake;
  if (status === "cancelled") return bet.stake - cancelFee(bet.stake);
  return 0;
}

export function isParticipant(spec: BetSpec, userId: string): boolean {
  return spec.type !== "group" && (spec.a === userId || spec.b === userId);
}
