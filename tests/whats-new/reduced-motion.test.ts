import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

// No DOM in this suite, so guard the reduced-motion contract at the source: every CSS transition in the
// story art must be switched off for people who ask for reduced motion.
describe("story art under reduced motion", () => {
  test("every transition has a motion-reduce:transition-none partner", () => {
    const src = readFileSync("src/components/whats-new/story-art.tsx", "utf8");
    const transitions = src.match(/(?<![:-])transition-(?:\[|all\b|opacity\b|transform\b|colors\b)/g) ?? [];
    const disabled = src.match(/motion-reduce:transition-none/g) ?? [];
    expect(transitions.length).toBeGreaterThan(0);
    expect(disabled.length).toBe(transitions.length);
  });
});
