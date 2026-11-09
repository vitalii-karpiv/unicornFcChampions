import { describe, expect, test } from "vitest";
import { compareVersions, LATEST_RELEASE, RELEASES, storyCards, unseenReleases } from "@/lib/releases";
import pkg from "../package.json";

describe("releases", () => {
  test("newest release matches package.json", () => {
    expect(RELEASES[0].version).toBe(pkg.version);
    expect(LATEST_RELEASE).toBe(pkg.version);
  });

  test("compareVersions is numeric", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.9.0", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("1.2.0", "1.2.0")).toBe(0);
  });

  test("unseenReleases", () => {
    expect(unseenReleases(null).map((r) => r.version)).toEqual(RELEASES.map((r) => r.version));
    expect(unseenReleases(LATEST_RELEASE)).toEqual([]);
    expect(unseenReleases("1.1.0")[0].version).toBe("1.2.0");
  });

  test("storyCards puts an intro before each release's cards", () => {
    const cards = storyCards([RELEASES[0]]);
    expect(cards[0]).toMatchObject({ art: "intro", title: "Version 1.2.0 is out", version: "1.2.0" });
    expect(cards.map((c) => c.art)).toEqual(["intro", "team-stars", "elo-odds", "giant-killing", "strength-split"]);
  });
});
