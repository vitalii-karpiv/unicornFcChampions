import { describe, expect, test } from "vitest";
import {
  frameDelta,
  initStory,
  isLast,
  isPaused,
  MAX_FRAME_MS,
  SLIDE_MS,
  type StoryAction,
  type StoryState,
  storyKeyAction,
  storyReducer,
} from "@/lib/whats-new/story";

const run = (s: StoryState, ...as: StoryAction[]) => as.reduce(storyReducer, s);

describe("story", () => {
  test("auto-advances after SLIDE_MS", () => {
    expect(run(initStory(5), { type: "tick", dt: SLIDE_MS }).idx).toBe(1);
    expect(run(initStory(5), { type: "tick", dt: SLIDE_MS - 1 }).idx).toBe(0);
  });

  test("never auto-advances past the last card", () => {
    const s = run(initStory(2), { type: "next" }, { type: "tick", dt: SLIDE_MS * 3 });
    expect(s.idx).toBe(1);
    expect(isLast(s)).toBe(true);
    expect(s.elapsed).toBe(SLIDE_MS);
  });

  test.each(["hover", "held"] as const)("%s pauses", (type) => {
    const s = run(initStory(5), { type, on: true }, { type: "tick", dt: SLIDE_MS });
    expect(isPaused(s)).toBe(true);
    expect(s).toMatchObject({ idx: 0, elapsed: 0 });
  });

  test("manual pause is sticky until toggled; navigation still works", () => {
    const s = run(initStory(5), { type: "toggle" }, { type: "tick", dt: SLIDE_MS }, { type: "next" });
    expect(s).toMatchObject({ idx: 1, manual: true, elapsed: 0 });
    expect(run(s, { type: "toggle" }, { type: "tick", dt: SLIDE_MS }).idx).toBe(2);
  });

  test("back/go clamp and reset elapsed", () => {
    expect(run(initStory(5), { type: "back" }).idx).toBe(0);
    expect(run(initStory(5), { type: "tick", dt: 100 }, { type: "go", idx: 9 })).toMatchObject({ idx: 4, elapsed: 0 });
  });

  test("Space toggles pause and arrows browse, whatever has focus", () => {
    expect(storyKeyAction(" ")).toEqual({ type: "toggle" });
    expect(storyKeyAction("ArrowRight")).toEqual({ type: "next" });
    expect(storyKeyAction("ArrowLeft")).toEqual({ type: "back" });
    expect(storyKeyAction("Enter")).toBeNull();
  });

  test("frameDelta ignores gaps from a hidden tab and clock skew", () => {
    expect(frameDelta(1000, 1016)).toBe(16);
    expect(frameDelta(1000, 61_000)).toBe(MAX_FRAME_MS);
    expect(frameDelta(1000, 998)).toBe(0);
  });

  test("visits count activations per card so only the incoming card replays its art", () => {
    const s = run(initStory(3), { type: "next" });
    expect(s.visits).toEqual([1, 1, 0]);
    expect(run(s, { type: "back" }).visits).toEqual([2, 1, 0]);
    expect(run(s, { type: "go", idx: 1 }).visits).toEqual([1, 1, 0]);
    expect(run(initStory(3), { type: "tick", dt: SLIDE_MS }).visits).toEqual([1, 1, 0]);
  });
});
