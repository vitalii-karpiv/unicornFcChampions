import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const APP_DIR = join(__dirname, "../../src/app/(app)");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return pages(p);
    return name === "page.tsx" ? [p] : [];
  });
}

// Layouts don't re-render on client navigation, so every page must check
// token_version itself (spec §1: checked on every authenticated request).
test.each(pages(APP_DIR).map((p) => [p.slice(APP_DIR.length)]))("%s calls requireUser()", (rel) => {
  expect(readFileSync(join(APP_DIR, rel), "utf8")).toMatch(/await requireUser\(\)/);
});
