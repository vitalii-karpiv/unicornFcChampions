import { describe, expect, test } from "vitest";
import { checkMatchRules, commentSchema, isReaction, matchInputSchema, REACTIONS } from "@/lib/domain/validation";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-10-23T18:00:00Z");
const input = (o: Partial<{ playerAId: string; playerBId: string; goalsA: number; goalsB: number; playedAt: Date }> = {}) => ({
  playerAId: A,
  playerBId: B,
  goalsA: 2,
  goalsB: 1,
  playedAt: new Date("2026-10-23T17:00:00Z"),
  ...o,
});

describe("checkMatchRules", () => {
  test("valid match", () => {
    expect(checkMatchRules(input(), now)).toBeNull();
  });

  test("same player on both sides", () => {
    expect(checkMatchRules(input({ playerBId: A }), now)).toBe("Pick two different players.");
  });

  test("more than 5 minutes in the future is rejected", () => {
    expect(checkMatchRules(input({ playedAt: new Date("2026-10-23T18:10:00Z") }), now)).toBe(
      "Match time can't be in the future.",
    );
  });

  test("small clock skew is tolerated", () => {
    expect(checkMatchRules(input({ playedAt: new Date("2026-10-23T18:02:00Z") }), now)).toBeNull();
  });

  test("previous Kyiv month is locked", () => {
    expect(checkMatchRules(input({ playedAt: new Date("2026-09-30T20:59:00Z") }), now)).toBe(
      "That month is closed — matches from past months can't be added or changed.",
    );
  });
});

describe("matchInputSchema", () => {
  test("coerces form strings", () => {
    const r = matchInputSchema.parse({ playerAId: A, playerBId: B, goalsA: "3", goalsB: "0", playedAt: "2026-10-23T17:00:00.000Z" });
    expect(r).toEqual({ playerAId: A, playerBId: B, goalsA: 3, goalsB: 0, playedAt: new Date("2026-10-23T17:00:00Z") });
  });

  test("rejects goals outside 0–99 and non-integers", () => {
    for (const goalsA of [100, -1, 1.5]) {
      expect(matchInputSchema.safeParse({ ...input(), goalsA }).success).toBe(false);
    }
  });

  test("rejects non-uuid player ids", () => {
    expect(matchInputSchema.safeParse({ ...input(), playerAId: "abc" }).success).toBe(false);
  });
});

describe("comments and reactions", () => {
  test("comment body is trimmed, 1–500 chars", () => {
    expect(commentSchema.parse("  gg ez  ")).toBe("gg ez");
    expect(commentSchema.safeParse("   ").success).toBe(false);
    expect(commentSchema.safeParse("x".repeat(501)).success).toBe(false);
    expect(commentSchema.safeParse("x".repeat(500)).success).toBe(true);
  });

  test("only the five fixed reactions are allowed", () => {
    expect(REACTIONS).toEqual(["🔥", "😂", "💀", "👏", "🤡"]);
    expect(isReaction("🔥")).toBe(true);
    expect(isReaction("👍")).toBe(false);
  });
});
