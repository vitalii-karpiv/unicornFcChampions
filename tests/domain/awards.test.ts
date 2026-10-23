import { describe, expect, test } from "vitest";
import { AWARDS, computeAwards } from "@/lib/domain/awards";
import type { PlayerMonthStats } from "@/lib/domain/month";

const t = (day: number) => new Date(`2026-10-${String(day).padStart(2, "0")}T18:00:00Z`);

function s(userId: string, o: Partial<PlayerMonthStats> = {}): PlayerMonthStats {
  const games = o.games ?? 0;
  const wins = o.wins ?? 0;
  return {
    userId,
    games,
    wins,
    draws: 0,
    losses: games - wins,
    goalsFor: 0,
    goalsAgainst: 0,
    eloGain: 0,
    longestWinStreak: 0,
    winRate: games ? wins / games : 0,
    reachedAt: { eloGain: t(1), winStreak: t(1), games: t(1), wins: t(1), winRate: t(1), goals: t(1) },
    ...o,
  };
}

describe("AWARDS", () => {
  test("six awards, only win rate needs 5 games", () => {
    expect(AWARDS.map((a) => a.key)).toEqual(["eloGain", "winStreak", "games", "wins", "winRate", "goals"]);
    expect(AWARDS.find((a) => a.key === "winRate")!.minGames).toBe(5);
    expect(AWARDS.filter((a) => a.minGames > 1)).toHaveLength(1);
  });
});

describe("computeAwards", () => {
  test("win rate skips a 4-game 100% player", () => {
    const r = computeAwards("2026-10", [s("a", { games: 4, wins: 4 }), s("b", { games: 5, wins: 3 })]);
    expect(r.awards.winRate).toEqual({ userId: "b", value: 0.6 });
  });

  test("an award whose best stat is 0 has no winner", () => {
    const r = computeAwards("2026-10", [s("a", { games: 2 }), s("b", { games: 3 })]);
    expect(r.awards.goals).toBeNull();
    expect(r.awards.wins).toBeNull();
    expect(r.awards.eloGain).toBeNull();
  });

  test("tie on wins → higher Elo gain", () => {
    const r = computeAwards("2026-10", [
      s("a", { games: 6, wins: 4, eloGain: 10 }),
      s("b", { games: 6, wins: 4, eloGain: 25 }),
    ]);
    expect(r.awards.wins).toEqual({ userId: "b", value: 4 });
  });

  test("tie on wins and Elo gain → fewer games", () => {
    const r = computeAwards("2026-10", [
      s("a", { games: 7, wins: 4, eloGain: 10 }),
      s("b", { games: 6, wins: 4, eloGain: 10 }),
    ]);
    expect(r.awards.wins!.userId).toBe("b");
  });

  test("full tie → earliest to reach the value", () => {
    const base = { games: 6, wins: 4, eloGain: 10 };
    const r = computeAwards("2026-10", [
      s("a", { ...base, reachedAt: { ...s("a").reachedAt, wins: t(9) } }),
      s("b", { ...base, reachedAt: { ...s("b").reachedAt, wins: t(5) } }),
    ]);
    expect(r.awards.wins!.userId).toBe("b");
  });

  test("Elo gain award tie skips the Elo-gain tiebreak and goes to wins", () => {
    const r = computeAwards("2026-10", [
      s("a", { games: 6, wins: 2, eloGain: 30 }),
      s("b", { games: 6, wins: 3, eloGain: 30 }),
    ]);
    expect(r.awards.eloGain).toEqual({ userId: "b", value: 30 });
  });

  test("no player of the month when nobody has 5 games", () => {
    const r = computeAwards("2026-10", [s("a", { games: 4, wins: 4, goalsFor: 9 }), s("b", { games: 3, wins: 1 })]);
    expect(r.playerOfMonth).toBeNull();
    expect(r.awards.wins!.userId).toBe("a");
  });

  test("player of the month = most awards among players with 5+ games", () => {
    const r = computeAwards("2026-10", [
      s("a", { games: 4, wins: 4, goalsFor: 12, eloGain: 50, longestWinStreak: 4 }),
      s("b", { games: 8, wins: 3, goalsFor: 10, eloGain: 5, longestWinStreak: 2 }),
      s("c", { games: 5, wins: 3, goalsFor: 6, eloGain: 2, longestWinStreak: 1 }),
    ]);
    // a: eloGain, winStreak, wins, goals (not eligible for POTM); b: games, winRate? (3/8 < 3/5 → c)
    expect(r.awards.games!.userId).toBe("b");
    expect(r.awards.winRate!.userId).toBe("c");
    expect(r.playerOfMonth).toEqual({ userId: "b", awardsWon: 1 });
  });

  test("equal award counts → higher Elo gain wins player of the month", () => {
    const r = computeAwards("2026-10", [
      s("a", { games: 6, wins: 3, eloGain: 40, goalsFor: 5 }),
      s("b", { games: 9, wins: 3, eloGain: 5, goalsFor: 15 }),
    ]);
    // a: eloGain, wins (tie on 3 → eloGain), winRate; b: games, goals
    expect(r.playerOfMonth).toEqual({ userId: "a", awardsWon: 3 });
  });

  test("empty month", () => {
    const r = computeAwards("2026-10", []);
    expect(r.playerOfMonth).toBeNull();
    expect(Object.values(r.awards).every((x) => x === null)).toBe(true);
    expect(r.month).toBe("2026-10");
  });
});
