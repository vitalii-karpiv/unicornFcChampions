import { handicappedExpected } from "@/lib/domain/elo";
import { currentElo } from "@/lib/domain/results";
import { dayKey, dayStart } from "@/lib/domain/time";
import type { RatedMatch } from "@/lib/domain/types";
import { nameOf, userMap, type UserSummary } from "@/lib/users";
import { gridProb, priceOdds, scoreGrid, splitLambdas } from "./pricing";
import { BIG_WIN, GROUP_HISTORY_DAYS, HIGH_SCORE, PAIR_WINDOW_DAYS } from "./rules";
import type { BetSpec, GroupCond } from "./types";

export type Selection = { key: string; label: string; odds: number; spec: BetSpec };
export type Market = { key: string; title: string; cols: 1 | 2 | 3 | 4; selections: Selection[] };
export type PairMarkets = {
  key: string;
  /** "{A} vs {B}" display name, used as the bet scope. */
  scope: string;
  a: string;
  b: string;
  recent: { aWins: number; bWins: number };
  markets: Market[];
};
export type DayMarkets = { day: string; pairs: PairMarkets[]; group: Market[] };

type Candidate = { label: string; p: number; spec: BetSpec };

/** Builds a market from candidates; keys use the candidate's original index so they stay stable when others are dropped. */
function build(key: string, title: string, cols: Market["cols"], cands: Candidate[]): Market | null {
  const selections: Selection[] = [];
  cands.forEach((c, n) => {
    const odds = priceOdds(c.p);
    if (odds !== null) selections.push({ key: `${key}:${n}`, label: c.label, odds, spec: c.spec });
  });
  return selections.length ? { key, title, cols, selections } : null;
}

function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

const isPair = (m: RatedMatch, a: string, b: string) =>
  (m.playerAId === a && m.playerBId === b) || (m.playerAId === b && m.playerBId === a);

function pairMarkets(
  a: string,
  b: string,
  past: RatedMatch[],
  names: Map<string, string>,
  recent: { aWins: number; bWins: number },
): PairMarkets {
  const key = `${a}:${b}`;
  const A = nameOf(names, a);
  const B = nameOf(names, b);

  const pairMatches = past.filter((m) => isPair(m, a, b)).slice(-20);
  const sum = pairMatches.reduce((s, m) => s + m.goalsA + m.goalsB, 0);
  const last100 = past.slice(-100);
  const globalAvg = last100.reduce((s, m) => s + m.goalsA + m.goalsB, 0) / last100.length;
  const total = (sum + 5 * globalAvg) / (pairMatches.length + 5);
  const { la, lb } = splitLambdas(total, handicappedExpected(currentElo(past, a), currentElo(past, b)));
  const grid = scoreGrid(la, lb);

  const pA = gridProb(grid, (i, j) => i > j);
  const pB = gridProb(grid, (i, j) => i < j);
  const pD = gridProb(grid, (i, j) => i === j);
  const base = { a, b };
  const markets: (Market | null)[] = [];

  markets.push(
    build(`${key}:winner`, "Winner", 3, [
      { label: A, p: pA, spec: { type: "winner", ...base, pick: a } },
      { label: "Draw", p: pD, spec: { type: "winner", ...base, pick: "draw" } },
      { label: B, p: pB, spec: { type: "winner", ...base, pick: b } },
    ]),
  );

  const line = Math.floor(la + lb) + 0.5;
  markets.push(
    build(`${key}:total`, "Total goals", 2, [
      { label: `Under ${line}`, p: gridProb(grid, (i, j) => i + j < line), spec: { type: "total", ...base, line, side: "under" } },
      { label: `Over ${line}`, p: gridProb(grid, (i, j) => i + j > line), spec: { type: "total", ...base, line, side: "over" } },
    ]),
  );

  const scores: { i: number; j: number; p: number }[] = [];
  grid.forEach((row, i) => row.forEach((p, j) => scores.push({ i, j, p })));
  scores.sort((x, y) => y.p - x.p || x.i - y.i || x.j - y.j);
  markets.push(
    build(
      `${key}:score`,
      "Correct score",
      4,
      scores.slice(0, 4).map(({ i, j, p }) => ({
        label: `${i}–${j}`,
        p,
        spec: { type: "score", ...base, goalsA: i, goalsB: j },
      })),
    ),
  );

  const ranges: [string, number, number | null][] = [
    ["1–2", 1, 2],
    ["3–5", 3, 5],
    ["6+", 6, null],
  ];
  const margins: Candidate[] = [];
  for (const [side, name, sign] of [[a, A, 1], [b, B, -1]] as const) {
    for (const [text, min, max] of ranges) {
      margins.push({
        label: `${name} ${text}`,
        p: gridProb(grid, (i, j) => sign * (i - j) >= min && sign * (i - j) <= (max ?? Infinity)),
        spec: { type: "margin", ...base, winner: side, min, max },
      });
    }
  }
  markets.push(build(`${key}:margin`, "Winning margin", 3, margins));

  for (const [slug, id, name, lambda, goals] of [
    ["goalsA", a, A, la, (i: number) => i],
    ["goalsB", b, B, lb, (_: number, j: number) => j],
  ] as const) {
    const l = Math.floor(lambda) + 0.5;
    markets.push(
      build(`${key}:${slug}`, `${name} goals`, 2, [
        { label: `Under ${l}`, p: gridProb(grid, (i, j) => goals(i, j) < l), spec: { type: "playerGoals", ...base, player: id, line: l, side: "under" } },
        { label: `Over ${l}`, p: gridProb(grid, (i, j) => goals(i, j) > l), spec: { type: "playerGoals", ...base, player: id, line: l, side: "over" } },
      ]),
    );
  }

  markets.push(
    build(`${key}:specials`, "Specials", 1, [
      { label: `${A} wins the next 3 in a row`, p: pA ** 3, spec: { type: "streak3", ...base, player: a } },
      { label: `${B} wins the next 3 in a row`, p: pB ** 3, spec: { type: "streak3", ...base, player: b } },
    ]),
  );

  return { key, scope: `${A} vs ${B}`, a, b, recent, markets: markets.filter((m): m is Market => m !== null) };
}

function groupMarkets(day: string, past: RatedMatch[], names: Map<string, string>): Market[] {
  const from = dayStart(shiftDay(day, -GROUP_HISTORY_DAYS)).getTime();
  const window = past.filter((m) => m.playedAt.getTime() >= from);
  const days = new Map<string, RatedMatch[]>();
  for (const m of window) {
    const k = dayKey(m.playedAt);
    days.set(k, [...(days.get(k) ?? []), m]);
  }
  if (days.size === 0) return [];

  const pairFrom = dayStart(shiftDay(day, -PAIR_WINDOW_DAYS)).getTime();
  const recentUsers = new Set<string>();
  for (const m of past) {
    if (m.playedAt.getTime() >= pairFrom) {
      recentUsers.add(m.playerAId);
      recentUsers.add(m.playerBId);
    }
  }

  const conds: { cond: GroupCond; title: string; player?: string; holds: (m: RatedMatch) => boolean }[] = [
    { cond: "bigWin", title: `A match is won by ${BIG_WIN}+`, holds: (m) => Math.abs(m.goalsA - m.goalsB) >= BIG_WIN },
    { cond: "highScore", title: `Someone scores ${HIGH_SCORE}+ in a match`, holds: (m) => Math.max(m.goalsA, m.goalsB) >= HIGH_SCORE },
    { cond: "draw", title: "A match ends in a draw", holds: (m) => m.goalsA === m.goalsB },
  ];
  if (recentUsers.size >= 3) {
    const lowest = [...recentUsers]
      .map((id) => ({ id, elo: currentElo(past, id) }))
      .sort((x, y) => x.elo - y.elo || (x.id < y.id ? -1 : 1))[0].id;
    conds.push({
      cond: "playerWin",
      title: `${nameOf(names, lowest)} wins a match`,
      player: lowest,
      holds: (m) => (m.playerAId === lowest && m.goalsA > m.goalsB) || (m.playerBId === lowest && m.goalsB > m.goalsA),
    });
  }

  const out: Market[] = [];
  for (const c of conds) {
    const k = [...days.values()].filter((ms) => ms.some(c.holds)).length;
    const p = (k + 1) / (days.size + 2);
    const spec = (side: "yes" | "no"): BetSpec => ({ type: "group", cond: c.cond, ...(c.player ? { player: c.player } : {}), side });
    const m = build(`group:${c.cond}`, c.title, 2, [
      { label: "Yes", p, spec: spec("yes") },
      { label: "No", p: 1 - p, spec: spec("no") },
    ]);
    if (m) out.push(m);
  }
  return out;
}

/** `matches` must be in replay order. Only matches before the start of `day` (Kyiv) are used. */
export function dayMarkets(day: string, matches: RatedMatch[], users: UserSummary[]): DayMarkets {
  const start = dayStart(day).getTime();
  const past = matches.filter((m) => m.playedAt.getTime() < start);
  const names = userMap(users);
  const windowFrom = dayStart(shiftDay(day, -PAIR_WINDOW_DAYS)).getTime();

  const counts = new Map<string, { x: string; y: string; n: number; xWins: number; yWins: number }>();
  for (const m of past) {
    if (m.playedAt.getTime() < windowFrom) continue;
    const [x, y] = m.playerAId < m.playerBId ? [m.playerAId, m.playerBId] : [m.playerBId, m.playerAId];
    const e = counts.get(`${x}\0${y}`) ?? { x, y, n: 0, xWins: 0, yWins: 0 };
    e.n += 1;
    const gx = m.playerAId === x ? m.goalsA : m.goalsB;
    const gy = m.playerAId === x ? m.goalsB : m.goalsA;
    if (gx > gy) e.xWins += 1;
    else if (gy > gx) e.yWins += 1;
    counts.set(`${x}\0${y}`, e);
  }

  const pairs = [...counts.values()].map((e) => {
    const xFirst = currentElo(past, e.x) >= currentElo(past, e.y); // tie: smaller id (x < y)
    const [a, b] = xFirst ? [e.x, e.y] : [e.y, e.x];
    return { key: `${a}:${b}`, a, b, n: e.n, recent: xFirst ? { aWins: e.xWins, bWins: e.yWins } : { aWins: e.yWins, bWins: e.xWins } };
  });
  pairs.sort((p, q) => q.n - p.n || (p.key < q.key ? -1 : p.key > q.key ? 1 : 0));

  return {
    day,
    pairs: pairs.map((p) => pairMarkets(p.a, p.b, past, names, p.recent)),
    group: groupMarkets(day, past, names),
  };
}

export function findSelection(
  m: DayMarkets,
  selectionKey: string,
): { selection: Selection; market: Market; scope: string } | null {
  for (const p of m.pairs) {
    for (const market of p.markets) {
      const selection = market.selections.find((s) => s.key === selectionKey);
      if (selection) return { selection, market, scope: p.scope };
    }
  }
  for (const market of m.group) {
    const selection = market.selections.find((s) => s.key === selectionKey);
    if (selection) return { selection, market, scope: "Everyone" };
  }
  return null;
}
