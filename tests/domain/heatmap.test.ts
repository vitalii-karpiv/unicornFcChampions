import { describe, expect, test } from "vitest";
import { activityByDay, clampLeft, trimToColumns, visibleColumns, weekday } from "@/lib/domain/heatmap";

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

describe("visibleColumns", () => {
  test.each([
    [0, 1],
    [10, 1],
    [11, 1],
    [28, 2],
    [340, 24],
    [742, 53],
    [2000, 53],
  ])("width %i → %i columns", (width, cols) => {
    expect(visibleColumns(width)).toBe(cols);
  });
});

describe("trimToColumns", () => {
  const monday = new Date("2026-10-26T10:00:00Z");
  const sunday = new Date("2026-10-25T10:00:00Z");

  test("today is Monday: last column has 1 day, first kept day is a Monday", () => {
    const out = trimToColumns(activityByDay([], monday), 3);
    expect(out).toHaveLength(15);
    expect(out[0].day).toBe("2026-10-12");
    expect(out[14].day).toBe("2026-10-26");
    expect(weekday(out[0].day)).toBe(0);
  });

  test("today is Sunday: last column is full", () => {
    const out = trimToColumns(activityByDay([], sunday), 2);
    expect(out).toHaveLength(14);
    expect(out[0].day).toBe("2026-10-12");
  });

  test("returns all days when columns cover the whole range", () => {
    const days = activityByDay([], monday);
    expect(trimToColumns(days, 53)).toBe(days);
    expect(trimToColumns(days, 100)).toBe(days);
  });

  test("keeps counts and handles empty input", () => {
    const days = activityByDay([new Date("2026-10-26T10:00:00Z")], monday);
    expect(trimToColumns(days, 1)).toEqual([{ day: "2026-10-26", count: 1 }]);
    expect(trimToColumns([], 5)).toEqual([]);
  });
});

describe("clampLeft", () => {
  test.each([
    [100, 60, 300, 70], // centred
    [10, 60, 300, 0], // would overflow left
    [295, 60, 300, 240], // would overflow right (today's cell)
    [50, 400, 300, 0], // tooltip wider than container
  ])("center %i, tip %i, container %i → %i", (c, t, w, left) => {
    expect(clampLeft(c, t, w)).toBe(left);
  });
});
