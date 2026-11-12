import { AWARDS, awardValue, computeAwards, type AwardKey, type MonthAwards } from "@/lib/domain/awards";
import { monthStats } from "@/lib/domain/month";
import { currentMonthKey, shiftMonth } from "@/lib/domain/time";
import type { RatedMatch } from "@/lib/domain/types";
import { fairOdds } from "./pricing";
import { FUTURES_BASE, MIN_PROB } from "./rules";
import type { FuturesPayout } from "./types";

export type FuturesKey = AwardKey | "potm";

export const FUTURES_QUESTIONS: { key: FuturesKey; label: string; emoji: string; sub?: string }[] = [
  { key: "potm", label: "Player of the Month", emoji: "👑" },
  ...AWARDS.map((a) => ({
    key: a.key as FuturesKey,
    label: a.label,
    emoji: a.emoji,
    ...(a.key === "winRate" ? { sub: "5+ games" } : {}),
  })),
];

export type FuturesOdds = Partial<Record<FuturesKey, Record<string, number>>>; // userId -> odds
export type FuturesPick = { userId: string; question: FuturesKey; pickUserId: string };

const WEIGHTS = [1, 0.5, 0.25];

export function futuresOdds(target: string, matches: RatedMatch[], userIds: string[]): FuturesOdds | null {
  const sources = WEIGHTS.map((weight, i) => {
    const month = shiftMonth(target, -(i + 2));
    const stats = monthStats(matches, month, userIds);
    return { weight, stats, awards: computeAwards(month, stats) };
  });

  const active = userIds.filter((id) => sources.some((s) => (s.stats.find((x) => x.userId === id)?.games ?? 0) > 0));
  if (active.length < 2) return null;

  const out: FuturesOdds = {};
  for (const q of FUTURES_QUESTIONS) {
    const minGames = AWARDS.find((a) => a.key === q.key)?.minGames ?? 0;
    const score = active.map((id) => {
      let s = 0;
      for (const src of sources) {
        const st = src.stats.find((x) => x.userId === id);
        if (!st) continue;
        let v: number;
        if (q.key === "potm") {
          v = Object.values(src.awards.awards).filter((w) => w?.userId === id).length;
        } else {
          v = st.games >= minGames ? Math.max(0, awardValue(st, q.key)) : 0;
        }
        s += src.weight * v;
      }
      return s * s;
    });
    const total = score.reduce((a, b) => a + b, 0);
    const raw = score.map((s) => (total > 0 ? s / total : 1 / active.length));
    const floored = raw.map((p) => Math.max(p, MIN_PROB));
    const norm = floored.reduce((a, b) => a + b, 0);
    out[q.key] = Object.fromEntries(active.map((id, i) => [id, fairOdds(floored[i] / norm)]));
  }
  return out;
}

export function picksOpen(target: string, now: Date): boolean {
  return currentMonthKey(now) === shiftMonth(target, -1);
}

export function futuresPayouts(
  target: string,
  odds: FuturesOdds,
  picks: FuturesPick[],
  result: Pick<MonthAwards, "awards" | "playerOfMonth">,
): FuturesPayout[] {
  const out: FuturesPayout[] = [];
  for (const p of picks) {
    const winner = p.question === "potm" ? result.playerOfMonth?.userId : result.awards[p.question]?.userId;
    if (!winner || winner !== p.pickUserId) continue;
    const o = odds[p.question]?.[p.pickUserId];
    if (o === undefined) continue;
    out.push({ userId: p.userId, month: target, amount: Math.round(FUTURES_BASE * o) });
  }
  return out;
}
