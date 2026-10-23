import { START_ELO } from "./elo";
import type { Outcome, PlayerResult, RatedMatch } from "./types";

function outcomeOf(goalsFor: number, goalsAgainst: number): Outcome {
  return goalsFor > goalsAgainst ? "W" : goalsFor === goalsAgainst ? "D" : "L";
}

/** The user's matches from their own perspective, in the order given (expects replay order). */
export function playerResults(ms: RatedMatch[], userId: string): PlayerResult[] {
  const out: PlayerResult[] = [];
  for (const m of ms) {
    const isA = m.playerAId === userId;
    if (!isA && m.playerBId !== userId) continue;
    const goalsFor = isA ? m.goalsA : m.goalsB;
    const goalsAgainst = isA ? m.goalsB : m.goalsA;
    const eloBefore = isA ? m.aEloBefore : m.bEloBefore;
    const eloAfter = isA ? m.aEloAfter : m.bEloAfter;
    out.push({
      matchId: m.id,
      playedAt: m.playedAt,
      opponentId: isA ? m.playerBId : m.playerAId,
      goalsFor,
      goalsAgainst,
      outcome: outcomeOf(goalsFor, goalsAgainst),
      eloBefore,
      eloAfter,
      eloDelta: eloAfter - eloBefore,
    });
  }
  return out;
}

export function currentElo(ms: RatedMatch[], userId: string): number {
  const rs = playerResults(ms, userId);
  return rs.length ? rs[rs.length - 1].eloAfter : START_ELO;
}

export function peakElo(ms: RatedMatch[], userId: string): number {
  return playerResults(ms, userId).reduce((max, r) => Math.max(max, r.eloAfter), START_ELO);
}
