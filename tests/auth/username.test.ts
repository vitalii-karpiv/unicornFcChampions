import { describe, expect, test } from "vitest";
import { normalizeUsername, passwordSchema, usernameSchema } from "@/lib/domain/validation";

describe("username", () => {
  test("normalizes case and whitespace so Vitalii and vitalii are one account", () => {
    expect(normalizeUsername(" Vitalii ")).toBe("vitalii");
    expect(usernameSchema.parse("  ViTaLii_99 ")).toBe("vitalii_99");
  });

  test("rejects too short, too long and invalid characters", () => {
    for (const bad of ["ab", "a-b", "a b", "x".repeat(21), "żółw"]) {
      expect(usernameSchema.safeParse(bad).success).toBe(false);
    }
  });

  test("accepts 3 and 20 characters", () => {
    expect(usernameSchema.safeParse("abc").success).toBe(true);
    expect(usernameSchema.safeParse("x".repeat(20)).success).toBe(true);
  });
});

describe("password", () => {
  test("min 8 characters", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });
});
