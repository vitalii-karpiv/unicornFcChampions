import { describe, expect, test } from "vitest";
import {
  currentMonthKey,
  dayKey,
  fromKyivLocal,
  isLockedDate,
  monthKey,
  monthStart,
  nextMonthStart,
  shiftMonth,
  toKyivLocal,
} from "@/lib/domain/time";

describe("monthKey", () => {
  test("uses Kyiv winter offset (UTC+2) after DST ends", () => {
    expect(monthKey(new Date("2026-10-31T22:30:00Z"))).toBe("2026-11");
    expect(monthKey(new Date("2026-10-31T21:59:00Z"))).toBe("2026-10");
  });

  test("uses Kyiv summer offset (UTC+3)", () => {
    expect(monthKey(new Date("2026-07-31T20:59:00Z"))).toBe("2026-07");
    expect(monthKey(new Date("2026-07-31T21:00:00Z"))).toBe("2026-08");
  });
});

describe("monthStart / nextMonthStart", () => {
  test("returns the UTC instant of Kyiv midnight on the 1st", () => {
    expect(monthStart("2026-11").toISOString()).toBe("2026-10-31T22:00:00.000Z");
    expect(monthStart("2026-08").toISOString()).toBe("2026-07-31T21:00:00.000Z");
  });

  test("nextMonthStart rolls over the year", () => {
    expect(nextMonthStart("2026-12").toISOString()).toBe("2026-12-31T22:00:00.000Z");
  });
});

describe("currentMonthKey", () => {
  test("is the Kyiv month of now", () => {
    expect(currentMonthKey(new Date("2026-12-31T22:30:00Z"))).toBe("2027-01");
  });
});

describe("isLockedDate", () => {
  const now = new Date("2026-10-31T22:30:00Z"); // 00:30 Nov 1 in Kyiv

  test("a match from yesterday evening (Kyiv) is locked just after midnight on the 1st", () => {
    expect(isLockedDate(new Date("2026-10-31T21:50:00Z"), now)).toBe(true);
  });

  test("a match in the current Kyiv month is not locked", () => {
    expect(isLockedDate(new Date("2026-10-31T22:10:00Z"), now)).toBe(false);
  });
});

describe("dayKey", () => {
  test("formats the Kyiv calendar day", () => {
    expect(dayKey(new Date("2026-07-31T21:30:00Z"))).toBe("2026-08-01");
  });
});

describe("shiftMonth", () => {
  test("crosses year boundaries in both directions", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-05", 0)).toBe("2026-05");
  });
});

describe("Kyiv local datetime (datetime-local inputs)", () => {
  test("fromKyivLocal parses wall-clock time in Kyiv", () => {
    expect(fromKyivLocal("2026-10-23T21:15").toISOString()).toBe("2026-10-23T18:15:00.000Z");
    expect(fromKyivLocal("2026-11-02T21:15").toISOString()).toBe("2026-11-02T19:15:00.000Z");
  });

  test("toKyivLocal formats for the input and round-trips", () => {
    const d = new Date("2026-10-23T18:15:42Z");
    expect(toKyivLocal(d)).toBe("2026-10-23T21:15");
    expect(fromKyivLocal(toKyivLocal(d)).toISOString()).toBe("2026-10-23T18:15:00.000Z");
  });

  test("fromKyivLocal rejects garbage", () => {
    expect(Number.isNaN(fromKyivLocal("nope").getTime())).toBe(true);
  });
});
