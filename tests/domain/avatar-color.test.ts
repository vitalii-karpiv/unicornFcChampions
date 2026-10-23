import { describe, expect, test } from "vitest";
import { AVATAR_PALETTE, avatarColor } from "@/lib/domain/avatar-color";

describe("avatarColor", () => {
  test("is deterministic", () => {
    expect(avatarColor("vitalii")).toBe(avatarColor("vitalii"));
  });

  test("always picks from the palette", () => {
    for (const name of ["a", "max", "andrii", "oleh", "x_y_z", ""]) {
      expect(AVATAR_PALETTE).toContain(avatarColor(name));
    }
  });

  test("spreads different names over several colors", () => {
    const colors = new Set(["vitalii", "max", "andrii", "oleh", "ivan", "petro", "taras", "bohdan"].map(avatarColor));
    expect(colors.size).toBeGreaterThan(3);
  });
});
