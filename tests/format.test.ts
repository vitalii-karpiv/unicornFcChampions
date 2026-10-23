import { describe, expect, test } from "vitest";
import { displayDelta } from "@/lib/format";

describe("displayDelta", () => {
  test("matches the difference of the displayed (rounded) ratings", () => {
    expect(displayDelta(1016.4, 1013.8)).toBe(-2);
    expect(displayDelta(960.4, 963.0)).toBe(3);
    expect(displayDelta(1000, 1000)).toBe(0);
  });
});
