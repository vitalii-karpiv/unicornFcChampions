import { describe, expect, test } from "vitest";
import { dayMarkets, findSelection } from "@/lib/domain/bets/markets";
import { splitLambdas } from "@/lib/domain/bets/pricing";
import { handicappedExpected } from "@/lib/domain/elo";
import { currentElo } from "@/lib/domain/results";
import { replayElo } from "@/lib/domain/replay";
import { mk } from "../../helpers/fixtures";

const users = [
  { id: "L", username: "Lena" },
  { id: "M", username: "Max" },
  { id: "N", username: "Nina" },
];

function history() {
  const ms = [mk("N", "M", 3, 2, "2026-10-02T12:00:00Z")];
  for (let d = 20; d >= 1; d--) {
    const t = new Date(Date.UTC(2026, 10, 11) - d * 864e5 + 12 * 3600e3).toISOString();
    ms.push(d % 5 === 0 ? mk("M", "L", 4, 3, t) : mk("L", "M", 5, 3, t));
  }
  return ms;
}

describe("dayMarkets", () => {
  const h = history();
  const rated = replayElo(h);
  const dm = dayMarkets("2026-11-11", rated, users);

  test("pairs: only the pair active in the last 30 days, higher Elo first", () => {
    expect(dm.pairs.map((p) => p.key)).toEqual(["L:M"]);
    expect(dm.pairs[0].recent).toEqual({ aWins: 16, bWins: 4 });
  });

  test("winner market prices favourite lower with a sane margin", () => {
    const w = dm.pairs[0].markets.find((m) => m.title === "Winner")!;
    expect(w.cols).toBe(3);
    expect(w.selections.map((s) => s.label)).toEqual(["Lena", "Draw", "Max"]);
    expect(w.selections[0].odds).toBeLessThan(w.selections[2].odds);
    const inv = w.selections.reduce((a, s) => a + 1 / s.odds, 0);
    expect(inv).toBeGreaterThanOrEqual(1.03);
    expect(inv).toBeLessThanOrEqual(1.08);
  });

  test("total line is floor(la+lb)+0.5", () => {
    const past = rated.filter((m) => m.playedAt < new Date("2026-11-10T22:00:00Z"));
    const pair = past.filter((m) => (m.playerAId === "L" && m.playerBId === "M") || (m.playerAId === "M" && m.playerBId === "L"));
    const last = pair.slice(-20);
    const sum = last.reduce((a, m) => a + m.goalsA + m.goalsB, 0);
    const glob = past.slice(-100).reduce((a, m) => a + m.goalsA + m.goalsB, 0) / Math.min(100, past.length);
    const T = (sum + 5 * glob) / (last.length + 5);
    const { la, lb } = splitLambdas(T, handicappedExpected(currentElo(past, "L"), currentElo(past, "M")));
    const line = Math.floor(la + lb) + 0.5;
    const m = dm.pairs[0].markets.find((x) => x.title === "Total goals")!;
    expect(m.selections.map((s) => s.label)).toEqual([`Under ${line}`, `Over ${line}`]);
    const lm = dm.pairs[0].markets.find((x) => x.title === "Lena goals")!;
    expect(lm.selections[0].label).toBe(`Under ${Math.floor(la) + 0.5}`);
  });

  test("market structure and spec semantics", () => {
    const titles = dm.pairs[0].markets.map((m) => m.title);
    expect(titles).toEqual(["Winner", "Total goals", "Correct score", "Winning margin", "Lena goals", "Max goals", "Specials"]);
    const cs = dm.pairs[0].markets.find((m) => m.title === "Correct score")!;
    expect(cs.selections).toHaveLength(4);
    expect(cs.selections[0].label).toMatch(/^\d+–\d+$/);
    const wm = dm.pairs[0].markets.find((m) => m.title === "Winning margin")!;
    expect(wm.selections.find((s) => s.label === "Lena 6+")?.spec).toMatchObject({ type: "margin", winner: "L", min: 6, max: null });
    expect(wm.selections.find((s) => s.label === "Max 3–5")?.spec).toMatchObject({ winner: "M", min: 3, max: 5 });
  });

  test("selection keys are unique", () => {
    const keys = [...dm.pairs.flatMap((p) => p.markets.flatMap((m) => m.selections)), ...dm.group.flatMap((m) => m.selections)].map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(10);
  });

  test("group markets", () => {
    expect(dm.group.map((m) => m.title)).toEqual(["A match is won by 8+", "Someone scores 15+ in a match", "A match ends in a draw"]);
    expect(dm.group[0].cols).toBe(2);
    expect(dm.group[0].selections.map((s) => s.label)).toEqual(["Yes", "No"]);
    const s = dm.group[0].selections[0];
    expect(findSelection(dm, s.key)?.scope).toBe("Everyone");
    expect(findSelection(dm, dm.pairs[0].markets[0].selections[0].key)?.scope).toBe("Lena vs Max");
    expect(findSelection(dm, "nope")).toBeNull();
  });

  test("playerWin group market needs 3 recent users", () => {
    const ms = replayElo([...h, mk("N", "L", 1, 6, "2026-11-05T12:00:00Z")]);
    const g = dayMarkets("2026-11-11", ms, users).group;
    expect(g[g.length - 1].title).toBe("Max wins a match");
    expect(g[g.length - 1].selections[0].spec).toEqual({ type: "group", cond: "playerWin", player: "M", side: "yes" });
  });

  test("deterministic: matches on the day itself are ignored", () => {
    const more = replayElo([...h, mk("L", "M", 9, 0, "2026-11-11T10:00:00Z")]);
    expect(dayMarkets("2026-11-11", more, users)).toEqual(dm);
  });

  test("empty history", () => {
    expect(dayMarkets("2026-11-11", [], users)).toEqual({ day: "2026-11-11", pairs: [], group: [] });
  });
});
