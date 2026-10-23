import { describe, expect, test } from "vitest";
import { activityByDay } from "@/lib/domain/heatmap";

describe("activityByDay", () => {
  const now = new Date("2026-10-23T21:30:00Z"); // Oct 24 00:30 Kyiv

  test("365 Kyiv days ending today", () => {
    const days = activityByDay([], now);
    expect(days).toHaveLength(365);
    expect(days[364]).toEqual({ day: "2026-10-24", count: 0 });
    expect(days[0].day).toBe("2025-10-25");
  });

  test("aggregates matches on the same Kyiv day and ignores out-of-range dates", () => {
    const days = activityByDay(
      [
        new Date("2026-10-23T21:10:00Z"), // Oct 24 Kyiv
        new Date("2026-10-24T08:00:00Z"), // Oct 24 Kyiv
        new Date("2026-10-23T20:00:00Z"), // Oct 23 Kyiv
        new Date("2020-01-01T00:00:00Z"),
      ],
      now,
    );
    expect(days[364].count).toBe(2);
    expect(days[363]).toEqual({ day: "2026-10-23", count: 1 });
    expect(days.reduce((n, d) => n + d.count, 0)).toBe(3);
  });

  test("custom length", () => {
    expect(activityByDay([], now, 7)).toHaveLength(7);
  });
});
