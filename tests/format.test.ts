import { describe, expect, test } from "vitest";
import { displayDelta, matchesOnDay } from "@/lib/format";

describe("displayDelta", () => {
  test("matches the difference of the displayed (rounded) ratings", () => {
    expect(displayDelta(1016.4, 1013.8)).toBe(-2);
    expect(displayDelta(960.4, 963.0)).toBe(3);
    expect(displayDelta(1000, 1000)).toBe(0);
  });
});

describe("matchesOnDay", () => {
  test("plural, singular and zero", () => {
    expect(matchesOnDay("2026-10-26", 3)).toBe("3 matches · 26 Oct 2026");
    expect(matchesOnDay("2026-10-26", 1)).toBe("1 match · 26 Oct 2026");
    expect(matchesOnDay("2026-01-05", 0)).toBe("No matches · 5 Jan 2026");
  });
});
