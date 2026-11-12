import { describe, expect, test } from "vitest";
import { FUTURES_QUESTIONS, futuresOdds, futuresPayouts, picksOpen, type FuturesOdds } from "@/lib/domain/bets/futures";
import { fairOdds } from "@/lib/domain/bets/pricing";
import { MIN_PROB } from "@/lib/domain/bets/rules";
import { replayElo } from "@/lib/domain/replay";
import type { MonthAwards } from "@/lib/domain/awards";
import { mk } from "../../helpers/fixtures";

const users = ["L", "M", "N", "Z"];

function history(withNov = true) {
  const ms = [
    mk("N", "L", 1, 0, "2026-09-10T12:00:00Z"),
    mk("M", "L", 6, 1, "2026-10-02T12:00:00Z"),
    mk("L", "M", 2, 1, "2026-10-03T12:00:00Z"),
    mk("L", "M", 2, 1, "2026-10-04T12:00:00Z"),
    mk("L", "M", 2, 1, "2026-10-05T12:00:00Z"),
  ];
  if (withNov) ms.push(mk("L", "Z", 9, 0, "2026-11-03T12:00:00Z"), mk("Z", "M", 9, 0, "2026-11-04T12:00:00Z"));
  return replayElo(ms);
}

describe("FUTURES_QUESTIONS", () => {
  test("potm first, then awards", () => {
    expect(FUTURES_QUESTIONS.map((q) => q.key)).toEqual(["potm", "eloGain", "winStreak", "games", "wins", "winRate", "goals"]);
    expect(FUTURES_QUESTIONS[0]).toMatchObject({ label: "Player of the Month", emoji: "👑" });
    expect(FUTURES_QUESTIONS.find((q) => q.key === "winRate")!.sub).toBe("5+ games");
  });
});

describe("futuresOdds", () => {
  const odds = futuresOdds("2026-12", history(), users)!;

  test("top scorer has the lowest goals odds", () => {
    const g = odds.goals!;
    expect(g.M).toBe(Math.min(...Object.values(g)));
  });

  test("probabilities sum to about 1 per question", () => {
    for (const q of FUTURES_QUESTIONS) {
      const sum = Object.values(odds[q.key]!).reduce((a, o) => a + 1 / o, 0);
      expect(sum).toBeGreaterThanOrEqual(0.98);
      expect(sum).toBeLessThanOrEqual(1.02);
    }
  });

  test("users with no games in the window are absent", () => {
    expect(Object.keys(odds.goals!).sort()).toEqual(["L", "M", "N"]);
  });

  test("target-month-adjacent matches do not change the result", () => {
    expect(futuresOdds("2026-12", history(false), users)).toEqual(odds);
  });

  test("fewer than two active users gives null", () => {
    const ms = replayElo([mk("L", "L", 1, 0, "2026-10-02T12:00:00Z")]);
    expect(futuresOdds("2026-12", ms, ["L", "M"])).toBeNull();
  });
});

describe("futuresOdds edge branches", () => {
  const day = (d: number) => `2026-10-${String(d).padStart(2, "0")}T12:00:00Z`;

  test("all-zero scores fall back to uniform odds", () => {
    const ms = replayElo([mk("A", "B", 0, 0, day(2)), mk("B", "C", 0, 0, day(3))]);
    const odds = futuresOdds("2026-12", ms, ["A", "B", "C"])!;
    expect(odds.eloGain).toEqual({ A: fairOdds(1 / 3), B: fairOdds(1 / 3), C: fairOdds(1 / 3) });
  });

  test("MIN_PROB floor, renormalisation and negative-Elo clamp", () => {
    const ms = replayElo([mk("A", "B", 4, 0, day(2)), mk("C", "B", 1, 0, day(3))]);
    const goals = futuresOdds("2026-12", ms, ["A", "B", "C"])!.goals!;
    expect(goals.B).toBe(fairOdds(MIN_PROB / (1 + MIN_PROB)));
    expect(goals.A).toBe(fairOdds(16 / 17 / (1 + MIN_PROB)));
    expect(goals.C).toBe(fairOdds(1 / 17 / (1 + MIN_PROB)));
    const sum = Object.values(goals).reduce((a, o) => a + 1 / o, 0);
    expect(sum).toBeGreaterThan(0.98);
    expect(sum).toBeLessThan(1.02);
    // B lost Elo (negative gain) while A gained: clamped to 0, so B stays at the floor
    expect(futuresOdds("2026-12", ms, ["A", "B", "C"])!.eloGain!.B).toBeGreaterThan(
      futuresOdds("2026-12", ms, ["A", "B", "C"])!.eloGain!.A,
    );
    expect(futuresOdds("2026-12", ms, ["A", "B", "C"])!.eloGain!.B).toBe(100);
  });

  test("win rate ignores players with fewer than 5 games", () => {
    const ms: ReturnType<typeof mk>[] = [];
    for (let i = 0; i < 4; i++) ms.push(mk("A", "C", 2, 1, day(2 + i))); // A: 4 games, 100%
    for (let i = 0; i < 5; i++) ms.push(i < 3 ? mk("B", "C", 2, 1, day(10 + i)) : mk("C", "B", 2, 1, day(10 + i)));
    const wr = futuresOdds("2026-12", replayElo(ms), ["A", "B", "C"])!.winRate!;
    expect(wr.A).toBe(100);
    expect(wr.B).toBe(Math.min(...Object.values(wr)));
  });
});

describe("picksOpen", () => {
  test("only during the month before the target (Kyiv)", () => {
    expect(picksOpen("2026-12", new Date("2026-11-30T21:59Z"))).toBe(true);
    expect(picksOpen("2026-12", new Date("2026-11-30T22:00Z"))).toBe(false);
    expect(picksOpen("2026-12", new Date("2026-10-15T12:00Z"))).toBe(false);
  });
});

describe("futuresPayouts", () => {
  const odds: FuturesOdds = { potm: { A: 3.5, B: 2 }, winRate: { A: 4 } };
  const result = {
    awards: { winRate: null, goals: { userId: "A", value: 3 } },
    playerOfMonth: { userId: "A", awardsWon: 2 },
  } as unknown as Pick<MonthAwards, "awards" | "playerOfMonth">;

  test("correct pick pays round(20 x odds)", () => {
    expect(futuresPayouts("2026-12", odds, [{ userId: "u", question: "potm", pickUserId: "A" }], result)).toEqual([
      { userId: "u", month: "2026-12", amount: 70 },
    ]);
  });

  test("wrong pick pays nothing", () => {
    expect(futuresPayouts("2026-12", odds, [{ userId: "u", question: "potm", pickUserId: "B" }], result)).toEqual([]);
  });

  test("no winner pays nothing", () => {
    expect(futuresPayouts("2026-12", odds, [{ userId: "u", question: "winRate", pickUserId: "A" }], result)).toEqual([]);
  });

  test("no player of the month pays nothing", () => {
    const none = { awards: {}, playerOfMonth: null } as unknown as Pick<MonthAwards, "awards" | "playerOfMonth">;
    expect(futuresPayouts("2026-12", odds, [{ userId: "u", question: "potm", pickUserId: "A" }], none)).toEqual([]);
  });

  test("picking yourself pays like any pick", () => {
    expect(futuresPayouts("2026-12", odds, [{ userId: "A", question: "potm", pickUserId: "A" }], result)).toEqual([
      { userId: "A", month: "2026-12", amount: 70 },
    ]);
  });
});
