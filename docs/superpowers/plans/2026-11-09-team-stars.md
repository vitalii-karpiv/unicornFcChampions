# Team Star Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record each side's EA FC team star rating (0.5★–5★, plus 5+) on every match, use it as an Elo handicap, and surface it on cards, the form, activity, records and player stats; then ship it as release 1.2.0 with a one-time "What's new" story popup.

**Architecture:** A new pure module `src/lib/domain/stars.ts` owns the scale (half-star integers), formatting, stepping and star stats. `rateMatch` / `matchOdds` gain optional star inputs that shift only the expected score. Two `NOT NULL DEFAULT 10` columns on `matches` flow through the existing `select()` → `replayElo` pipeline, so every page gets stars on `RatedMatch` for free.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before touching app code), React 19, Drizzle ORM + drizzle-kit, Postgres, zod 4, vitest, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-09-team-stars-design.md`

## Global Constraints

- Stars are stored as integer half-stars: valid set is exactly `{1,2,3,4,5,6,7,8,9,10,12}`; `10` = 5★ (default), `12` = 5+ (counts as 6★). `11` is never valid.
- `STAR_ELO = 100` Elo points per whole star; handicap applies to the expected score only (K-factor, goal multiplier unchanged).
- Display: `★4.5`, `★5`, `★0.5`, `★5+` (whole stars without `.0`).
- Equal stars must give results bit-identical to today's Elo (existing tests stay green unchanged).
- Minimal monochrome UI; muted text for stars; no new dependencies; npm.

## Review Focus

1. **Old activity_log rows** have no `starsA`/`starsB` → Activity page must read them as 5★ and never print `undefined`/`NaN` (Task 4 test on `snapshotStars`).
2. **Form post without star fields** (installed PWA still running the previous bundle) → treat as 5★, not a validation error (Task 2 test).
3. **Tampered star values** (`11`, `13`, `0`, `9.5`, `"abc"`) → rejected with the form error (Task 2 test).
4. **Editing a non-5★ match** must keep its stored stars, not reset to 5★ (Task 3: edit page passes `match.starsA/B`; checked in the manual run in Task 7).
5. **Stepper at the edges**: 10 → +1 → 12, 12 → −1 → 10, clamps at 1 and 12 (Task 1 test on `stepStars`).
6. **Version ordering**: `"1.10.0"` is newer than `"1.9.0"` — string comparison would hide future releases (Task 8 test on `compareVersions`).
7. **New signup vs existing user**: `NULL` last-seen shows every release; a fresh signup sees nothing (Task 8 test on `unseenReleases` + signup writes `LATEST_RELEASE`).
8. **Auto-advance on the last card / while paused**: never skips past "Got it", and no timer progress while hovered, held or manually paused (Task 8 reducer tests).

---

### Task 1: Stars domain + Elo handicap

**Files:**
- Create: `src/lib/domain/stars.ts`
- Modify: `src/lib/domain/elo.ts`, `src/lib/domain/odds.ts`, `src/lib/domain/types.ts`, `src/lib/domain/replay.ts`, `tests/helpers/fixtures.ts`
- Test: `tests/domain/stars.test.ts` (new), `tests/domain/elo.test.ts`, `tests/domain/odds.test.ts`, `tests/domain/replay.test.ts`

**Interfaces:**
- Produces (`stars.ts`):
  - `DEFAULT_STARS = 10`, `STAR_VALUES: readonly number[] = [1,2,3,4,5,6,7,8,9,10,12]`
  - `isStars(n: unknown): n is number`
  - `formatStars(half: number): string` → `"★4.5"`, `"★5"`, `"★5+"`
  - `stepStars(half: number, dir: 1 | -1): number` → next/previous value in `STAR_VALUES`, clamped
  - `starWhole(half: number): number` → `half / 2` (so 12 → 6)
- Produces (`elo.ts`): `STAR_ELO = 100`; `rateMatch` input gains optional `starsA?: number; starsB?: number` (half-stars, default `DEFAULT_STARS`).
- Produces (`odds.ts`): `matchOdds(a: PlayerRating, b: PlayerRating, starsA = DEFAULT_STARS, starsB = DEFAULT_STARS): Odds`
- Produces (`types.ts`): `MatchRow` gains `starsA: number; starsB: number`.
- Produces (`fixtures.ts`): `mk()` defaults `starsA: 10, starsB: 10` (overridable via `extra`).

- [ ] **Step 1: Write failing tests**

`tests/domain/stars.test.ts`:
```ts
test("formatStars", () => {
  expect([1, 9, 10, 12].map(formatStars)).toEqual(["★0.5", "★4.5", "★5", "★5+"]);
});
test("isStars accepts only the scale", () => {
  expect(STAR_VALUES.every(isStars)).toBe(true);
  for (const bad of [0, 11, 13, 9.5, "10", null]) expect(isStars(bad)).toBe(false);
});
test("stepStars skips 11 and clamps", () => {
  expect(stepStars(10, 1)).toBe(12);
  expect(stepStars(12, -1)).toBe(10);
  expect(stepStars(12, 1)).toBe(12);
  expect(stepStars(1, -1)).toBe(1);
  expect(stepStars(9, 1)).toBe(10);
});
```
`tests/domain/elo.test.ts` (add):
```ts
test("3★ beats 5★: underdog gains ~24.3 at K=32", () => {
  const r = rateMatch({ ra: 1000, rb: 1000, priorA: 20, priorB: 20, goalsA: 1, goalsB: 0, starsA: 6, starsB: 10 });
  expect(r.aAfter).toBeCloseTo(1024.31, 2);
  expect(r.bAfter).toBeCloseTo(975.69, 2);
});
test("5★ beats 3★: favourite gains ~7.7", () => {
  const r = rateMatch({ ra: 1000, rb: 1000, priorA: 20, priorB: 20, goalsA: 0, goalsB: 1, starsA: 6, starsB: 10 });
  expect(r.bAfter).toBeCloseTo(1007.69, 2);
});
test("equal stars of any level change nothing vs no stars", () => {
  const base = { ra: 1100, rb: 950, priorA: 3, priorB: 30, goalsA: 2, goalsB: 0 };
  expect(rateMatch({ ...base, starsA: 12, starsB: 12 })).toEqual(rateMatch(base));
});
```
`tests/domain/odds.test.ts` (add):
```ts
test("5+ vs 5★ at equal Elo is one full star = 64%", () => {
  const o = matchOdds({ elo: 1000, games: 20 }, { elo: 1000, games: 20 }, 12, 10);
  expect(o.expectedA).toBeCloseTo(0.6401, 4);
});
test("stars cancel a 200-point skill gap", () => {
  expect(matchOdds({ elo: 1200, games: 20 }, { elo: 1000, games: 20 }, 6, 10).expectedA).toBeCloseTo(0.5, 10);
});
```
`tests/domain/replay.test.ts` (add): a match `mk("a","b",1,0,…,{ starsA: 6, starsB: 10 })` replays to `aEloAfter` equal to `rateMatch({...,starsA:6,starsB:10}).aAfter`.

- [ ] **Step 2: Run** `npx vitest run tests/domain` — Expected: FAIL (module `stars` not found / handicap not applied).

- [ ] **Step 3: Implement**
  - `stars.ts` per Interfaces. `formatStars`: `half === 12 ? "★5+" : "★" + half / 2` (JS prints `4.5`, `5`).
  - `elo.ts`: inside `rateMatch`, `ea = expectedScore(ra + STAR_ELO * starWhole(starsA), rb + STAR_ELO * starWhole(starsB))`. Nothing else changes.
  - `odds.ts`: pass `starsA/starsB` to both `rateMatch` calls and compute `expectedA` with the same shifted ratings (import a shared helper or repeat the one line; must match `rateMatch` exactly).
  - `types.ts`, `replay.ts` (pass `starsA: m.starsA, starsB: m.starsB`), `fixtures.ts`.

- [ ] **Step 4: Run** `npm test` — Expected: all PASS, including every pre-existing Elo/odds/replay test unchanged.

- [ ] **Step 5: Commit** `feat: team star rating domain and Elo handicap`

---

### Task 2: Schema, migration, validation, service

**Files:**
- Modify: `src/lib/db/schema.ts`, `src/lib/domain/validation.ts`, `src/lib/matches/service.ts`, `src/app/(app)/matches/actions.ts`
- Create: `drizzle/0001_*.sql` (generated)
- Test: `tests/domain/validation.test.ts`

**Interfaces:**
- Consumes: `isStars`, `DEFAULT_STARS` from Task 1.
- Produces: `MatchInput` gains `starsA: number; starsB: number`. Activity snapshot JSON gains `starsA`, `starsB`. Form field names: `starsA`, `starsB`.

- [ ] **Step 1: Write failing tests** in `validation.test.ts` (extend the `input()` helper type with `starsA/starsB`):
```ts
describe("matchInputSchema stars", () => {
  const raw = { playerAId: A, playerBId: B, goalsA: "1", goalsB: "0", playedAt: new Date("2026-10-23T17:00:00Z") };
  test("parses form strings", () => {
    expect(matchInputSchema.parse({ ...raw, starsA: "9", starsB: "12" })).toMatchObject({ starsA: 9, starsB: 12 });
  });
  test("missing fields (null from FormData) default to 5★", () => {
    expect(matchInputSchema.parse({ ...raw, starsA: null, starsB: null })).toMatchObject({ starsA: 10, starsB: 10 });
  });
  test.each(["11", "13", "0", "9.5", "abc", ""])("rejects %s", (v) => {
    expect(matchInputSchema.safeParse({ ...raw, starsA: v, starsB: "10" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/domain/validation.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**
  - `validation.ts`: `const stars = z.preprocess((v) => (v === null || v === undefined ? DEFAULT_STARS : v), z.coerce.number().refine(isStars))`; note `""` must be rejected (coerces to 0 → fails `isStars`, good). Add `starsA: stars, starsB: stars` to `matchInputSchema`.
  - `schema.ts`: `starsA: integer("stars_a").notNull().default(10)`, same for `stars_b`; add `check("matches_stars_valid", sql\`${t.starsA} in (1,2,3,4,5,6,7,8,9,10,12) and ${t.starsB} in (1,2,3,4,5,6,7,8,9,10,12)\`)`.
  - `npm run db:generate` → review the SQL: two `ADD COLUMN ... DEFAULT 10 NOT NULL` + one `ADD CONSTRAINT`. Rename the file tag to `0001_team_stars` only if drizzle-kit lets you without editing the journal by hand; otherwise keep the generated name.
  - `service.ts`: `MatchSnapshot` / `snapshot()` include `starsA`, `starsB`.
  - `actions.ts`: pass `starsA: formData.get("starsA")`, `starsB: formData.get("starsB")` into `safeParse`.

- [ ] **Step 4: Run** `npm test && npm run db:migrate` (local `ufc-pg` must be up) — Expected: tests PASS, migration applies; `psql` check: existing rows show `stars_a = 10`.

- [ ] **Step 5: Commit** `feat: store team stars on matches`

---

### Task 3: Log/edit form with star steppers and live odds

**Files:**
- Modify: `src/components/match-form.tsx`, `src/app/(app)/matches/new/page.tsx`, `src/app/(app)/matches/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `formatStars`, `stepStars`, `DEFAULT_STARS` (Task 1); `matchOdds(a, b, starsA, starsB)` (Task 1); field names `starsA`/`starsB` (Task 2).
- Produces: `MatchForm` `initial` gains `starsA: number; starsB: number`.

- [ ] **Step 1: Implement**
  - `StarStepper({ name, value, onChange })` in `match-form.tsx`: same layout as `Stepper` but smaller (`size-9` buttons, `text-lg` value), shows `formatStars(value)`, buttons use `stepStars`, disabled at 1 / 12, `aria-label` "Decrease/Increase team stars A|B", hidden `<input name={name}>`.
  - Place a row of two `StarStepper`s directly under the player selects (above odds).
  - `Odds` receives `starsA`, `starsB` and calls `matchOdds(a, b, starsA, starsB)`.
  - New page: `initial.starsA/starsB = DEFAULT_STARS`. Edit page: `match.starsA`, `match.starsB`.

- [ ] **Step 2: Verify** `npx tsc --noEmit && npm run lint` — Expected: clean. (Visual check happens in Task 7.)

- [ ] **Step 3: Commit** `feat: team star steppers on the match form`

---

### Task 4: Stars on match card, match detail and activity

**Files:**
- Modify: `src/components/match-card.tsx`, `src/app/(app)/matches/[id]/page.tsx`, `src/app/(app)/activity/page.tsx`
- Modify: `src/lib/domain/stars.ts`
- Test: `tests/domain/stars.test.ts`

**Interfaces:**
- Produces: `snapshotStars(s: { starsA?: number; starsB?: number }): { starsA: number; starsB: number }` in `stars.ts` (missing → `DEFAULT_STARS`).

- [ ] **Step 1: Write failing test**
```ts
test("snapshotStars reads pre-stars activity rows as 5★", () => {
  expect(snapshotStars({})).toEqual({ starsA: 10, starsB: 10 });
  expect(snapshotStars({ starsA: 12, starsB: 3 })).toEqual({ starsA: 12, starsB: 3 });
});
```
- [ ] **Step 2: Run** `npx vitest run tests/domain/stars.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement**
  - `snapshotStars`.
  - Match card `Side`: `stars` prop; render `formatStars(stars)` as `text-xs text-muted-foreground` next to the `EloDelta` (same line, `gap-1.5`).
  - Match detail `Player`: `stars` prop; `formatStars` under the username, muted.
  - Activity: `Snapshot` gets optional `starsA?/starsB?`. `describe()` → `vitalii ★4.5 2–1 ★5 max` (stars via `snapshotStars`). `change()` adds a part per side whose stars differ: `${name} ${formatStars(before)} → ${formatStars(after)}` (use the *after* player name for that side).
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` — Expected: PASS / clean.
- [ ] **Step 5: Commit** `feat: show team stars on matches and activity`

---

### Task 5: "Biggest giant-killing" record

**Files:**
- Modify: `src/lib/domain/records.ts`, `src/app/(app)/records/page.tsx`
- Test: `tests/domain/records.test.ts`

**Interfaces:**
- Produces: `Records.biggestGiantKilling: RecordEntry` — `userId` = winner, `value` = star deficit in half-stars (loser stars − winner stars, > 0).

- [ ] **Step 1: Write failing tests** (update the "empty history" expectation to include `biggestGiantKilling: null`):
```ts
test("giant-killing: largest star deficit, then goal difference; draws and equal stars ignored", () => {
  const ms = replayElo([
    mk("a", "b", 1, 0, "2026-10-01T18:00:00Z", { starsA: 8, starsB: 10 }),  // deficit 2
    mk("a", "b", 2, 2, "2026-10-02T18:00:00Z", { starsA: 2, starsB: 12 }),  // draw: ignored
    mk("b", "a", 1, 0, "2026-10-03T18:00:00Z", { starsA: 6, starsB: 10 }),  // b wins, deficit 4
    mk("a", "b", 3, 0, "2026-10-04T18:00:00Z", { starsA: 6, starsB: 10 }),  // deficit 4, bigger GD → wins
    mk("a", "b", 9, 0, "2026-10-05T18:00:00Z"),                             // equal stars: ignored
  ]);
  expect(computeRecords(ms, ["a", "b"]).biggestGiantKilling).toMatchObject({ userId: "a", value: 4, matchId: ms[3].id });
});
```
- [ ] **Step 2: Run** `npx vitest run tests/domain/records.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** in the existing `for (const m of ms)` loop, tracking the held entry's goal difference like `biggestWin` does with total goals (strictly greater replaces; equal deficit + equal GD keeps the earlier).
- [ ] **Step 4: Records page row** after "Biggest win": `{ emoji: "🗡️", label: "Biggest giant-killing", value: (e) => "<winner stars> vs <loser stars>" }`, e.g. `★3 vs ★5`, built from `byId.get(e.matchId)` with `formatStars`.
- [ ] **Step 5: Run** `npm test && npx tsc --noEmit` — Expected: PASS / clean.
- [ ] **Step 6: Commit** `feat: biggest giant-killing record`

---

### Task 6: Player team-strength stats

**Files:**
- Modify: `src/lib/domain/types.ts`, `src/lib/domain/results.ts`, `src/lib/domain/stars.ts`, `src/app/(app)/players/[username]/page.tsx`
- Test: `tests/domain/stars.test.ts`

**Interfaces:**
- Produces: `PlayerResult` gains `starsFor: number; starsAgainst: number` (half-stars).
- Produces (`stars.ts`): `type WDL = { w: number; d: number; l: number }`; `starStats(rs: PlayerResult[]): { avgStars: number | null; underdog: WDL; even: WDL; favourite: WDL }` — `avgStars` in whole stars (5+ = 6), `null` with no games; bucket by `starsFor` vs `starsAgainst` (<, =, >).

- [ ] **Step 1: Write failing test**
```ts
test("starStats buckets by stars only and averages 5+ as 6", () => {
  const ms = replayElo([
    mk("a", "b", 1, 0, "2026-10-01T18:00:00Z", { starsA: 8, starsB: 10 }),   // a underdog W
    mk("b", "a", 1, 1, "2026-10-02T18:00:00Z", { starsA: 10, starsB: 10 }),  // even D
    mk("a", "b", 0, 2, "2026-10-03T18:00:00Z", { starsA: 12, starsB: 9 }),   // a favourite L
  ]);
  expect(starStats(playerResults(ms, "a"))).toEqual({
    avgStars: 5,                               // (4 + 5 + 6) / 3
    underdog: { w: 1, d: 0, l: 0 },
    even: { w: 0, d: 1, l: 0 },
    favourite: { w: 0, d: 0, l: 1 },
  });
  expect(starStats([]).avgStars).toBeNull();
});
```
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** `playerResults` fills `starsFor/starsAgainst`; `starStats` per Interfaces.
- [ ] **Step 4: Player page** — new section "Team strength" after the stats grid (only if `rs.length > 0`): header line `avg ★4.6` (one decimal via `toFixed(1)`), then a bordered list of three rows `Underdog` / `Even` / `Favourite` with `w-d-l` in `tabular font-mono text-xs text-muted-foreground`, matching the Head-to-head list style. Rows with 0 games show `—`.
- [ ] **Step 5: Run** `npm test && npx tsc --noEmit` — Expected: PASS / clean.
- [ ] **Step 6: Commit** `feat: team strength stats on player page`

---

### Task 7: Seed, project spec, end-to-end check

**Files:**
- Modify: `scripts/seed.ts`, `docs/spec.md`

- [ ] **Step 1: Seed** — `const stars = () => pick([10, 10, 10, 9, 9, 8, 12, 6])`; set `starsA: stars(), starsB: stars()` on each row (draw stars before goals, after picking players, so the PRNG order stays deterministic).
- [ ] **Step 2: `docs/spec.md`** — §2 Matches: add the stars fields; §3 Elo: add the handicap line with `STAR_ELO = 100`; add a short "Team stars" section pointing at the design doc's rules (records, player stats, activity).
- [ ] **Step 3: Verify** `npm test && npx tsc --noEmit && npm run lint && npm run build` — Expected: all clean.
- [ ] **Step 4: Manual run** (`npm run db:seed`, `npm run dev`, use the `run` skill): log a 3★ vs 5★ win and check the odds move with the steppers before saving, the card shows stars, Elo gain is larger than a 5v5 win; edit that match and confirm stars load as saved (Review Focus 4); check Activity shows the star change, Records shows the giant-killing row, the player page shows Team strength. Light + dark, phone width.
- [ ] **Step 5: Commit** `chore: seed team stars and document them in the spec`

---

### Task 8: Release notes data, story state, seen tracking

**Files:**
- Create: `src/lib/releases.ts`, `src/lib/whats-new/story.ts`, `src/app/(app)/whats-new-actions.ts`
- Modify: `src/lib/db/schema.ts`, `src/lib/auth/session.ts`, `src/app/(auth)/actions.ts`, `package.json` + `package-lock.json` (version → `1.2.0`)
- Create: `drizzle/0002_*.sql` (generated)
- Test: `tests/releases.test.ts`, `tests/whats-new/story.test.ts`

**Interfaces:**
- Produces (`releases.ts`):
  - `type ArtKey = "intro" | "team-stars" | "elo-odds" | "giant-killing" | "strength-split"`
  - `type Card = { art: ArtKey; title: string; body: string }`
  - `type Release = { version: string; date: string /* YYYY-MM-DD */; summary: string; cards: Card[] }` — `cards` are the feature cards only; the intro card is derived.
  - `RELEASES: Release[]` (newest first), `LATEST_RELEASE: string` (= `RELEASES[0].version`)
  - `compareVersions(a: string, b: string): number` (numeric per segment)
  - `unseenReleases(lastSeen: string | null): Release[]` — newer than `lastSeen`, newest first; `null` → all
  - `storyCards(releases: Release[]): Card[]` — for each release: `{ art: "intro", title: \`Version ${v} is out\`, body: summary }` then its cards
- Produces (`story.ts`), a pure reducer the dialog drives from `requestAnimationFrame`:
  - `SLIDE_MS = 6000`
  - `type StoryState = { idx: number; count: number; elapsed: number; hover: boolean; held: boolean; manual: boolean }`
  - `type StoryAction = { type: "tick"; dt: number } | { type: "go"; idx: number } | { type: "next" } | { type: "back" } | { type: "hover" | "held"; on: boolean } | { type: "toggle" }`
  - `initStory(count: number): StoryState`, `storyReducer(s, a): StoryState`, `isPaused(s): boolean`, `isLast(s): boolean`
- Produces: `CurrentUser.lastSeenRelease: string | null`; server action `markReleasesSeen(): Promise<void>` (sets the current user's `last_seen_release = LATEST_RELEASE`).

- [ ] **Step 1: Write failing tests**

`tests/releases.test.ts`:
```ts
test("newest release matches package.json", () => {
  expect(RELEASES[0].version).toBe(pkg.version);   // import pkg from "../package.json"
});
test("compareVersions is numeric", () => {
  expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
  expect(compareVersions("1.2.0", "1.2.0")).toBe(0);
});
test("unseenReleases", () => {
  expect(unseenReleases(null).map((r) => r.version)).toEqual(RELEASES.map((r) => r.version));
  expect(unseenReleases(LATEST_RELEASE)).toEqual([]);
  expect(unseenReleases("1.1.0")[0].version).toBe("1.2.0");
});
test("storyCards puts an intro before each release's cards", () => {
  const cards = storyCards([RELEASES[0]]);
  expect(cards[0]).toMatchObject({ art: "intro", title: "Version 1.2.0 is out" });
  expect(cards.map((c) => c.art)).toEqual(["intro", "team-stars", "elo-odds", "giant-killing", "strength-split"]);
});
```
`tests/whats-new/story.test.ts`:
```ts
const run = (s, ...as) => as.reduce(storyReducer, s);
test("auto-advances after SLIDE_MS", () => {
  expect(run(initStory(5), { type: "tick", dt: SLIDE_MS }).idx).toBe(1);
});
test("never auto-advances past the last card", () => {
  expect(run(initStory(2), { type: "next" }, { type: "tick", dt: SLIDE_MS * 3 }).idx).toBe(1);
});
test.each([["hover"], ["held"]])("%s pauses", (type) => {
  expect(run(initStory(5), { type, on: true }, { type: "tick", dt: SLIDE_MS }).idx).toBe(0);
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
```
- [ ] **Step 2: Run** `npx vitest run tests/releases.test.ts tests/whats-new` — Expected: FAIL.
- [ ] **Step 3: Implement**
  - `releases.ts` with the 1.2.0 entry. Copy is fixed by the spec/mockup:
    - summary: `Team stars are here. A few quick cards on what's new.`
    - team-stars / "Team stars": `When you log a match, set each side's team rating, from 0.5★ to 5★. Use 5+ for legend teams. New matches start at 5★.`
    - elo-odds / "Stars count in Elo": `Beat a stronger team and you gain more. Win with the stronger one and you gain less. The odds on the log form update as you change stars.`
    - giant-killing / "Biggest giant-killing": `A new all-time record on the Records page: the win against the biggest star gap.`
    - strength-split / "Results by team strength": `Your player page now splits your record into underdog, even and favourite. Older matches count as 5★ v 5★, so nobody's rating changed.`
  - `story.ts` per Interfaces; `tick` adds `dt` only when not paused and not last; reaching `SLIDE_MS` moves to `idx + 1` with `elapsed = 0`. On the last card `elapsed` still fills to `SLIDE_MS` (the progress bar completes) but `idx` stays.
  - Schema: `lastSeenRelease: text("last_seen_release")` on `users`; `npm run db:generate`, check the SQL is a single nullable `ADD COLUMN`.
  - `session.ts`: select `lastSeenRelease` into `CurrentUser`.
  - Signup (`(auth)/actions.ts`): insert `lastSeenRelease: LATEST_RELEASE`.
  - `whats-new-actions.ts` (`"use server"`): `requireUser()`, then update the row. No cache tags needed (the user row is read per request).
  - `npm version 1.2.0 --no-git-tag-version` (this is the release bump; there's no separate release commit for 1.2.0).
- [ ] **Step 4: Run** `npm test && npm run db:migrate && npx tsc --noEmit` — Expected: PASS / applied / clean.
- [ ] **Step 5: Commit** `feat: release notes data and per-user seen tracking`

---

### Task 9: "What's new" story dialog

**Files:**
- Create: `src/components/whats-new/whats-new-dialog.tsx`, `src/components/whats-new/story-art.tsx`, `src/components/whats-new/whats-new-button.tsx`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(app)/settings/page.tsx`, `src/app/globals.css` (keyframes only)

**Interfaces:**
- Consumes: `storyCards`, `unseenReleases`, `RELEASES`, `Card`, `ArtKey` (Task 8); `initStory`, `storyReducer`, `isPaused`, `isLast`, `SLIDE_MS` (Task 8); `markReleasesSeen` (Task 8); `formatStars` (Task 1).
- Produces:
  - `WhatsNewDialog({ cards: Card[]; open: boolean; onOpenChange: (open: boolean) => void })` — client component, Base UI `Dialog` from `@base-ui/react/dialog`.
  - `StoryArt({ art: ArtKey; version?: string; active: boolean })` — `active` restarts that card's animation when it becomes current.
  - `WhatsNew({ cards: Card[] })` (in `whats-new-dialog.tsx`): opens on mount, calls `markReleasesSeen()` on the first close.
  - `WhatsNewButton()` for Settings: opens the latest release's story; does not call the action.

- [ ] **Step 1: Implement `StoryArt`**, one component per `ArtKey`, matching the mockup (https://claude.ai/artifact/UZ65eEP4RbHUXSr6paWH4A; read its HTML for exact sizes, timings and keyframes):
  - `intro`: big `version` minus the patch (`"1.2"`) in Geist Mono, 6 gold stars orbiting (18 s spin), a 14-dot burst on enter.
  - `team-stars`: 5 stars fill half by half every 300 ms, then a `5+` badge lights up.
  - `elo-odds`: `★3 / ★5` win-chance bar animates 50/50 → 24/76, then `win: +24 · win: +8` fades in.
  - `giant-killing`: sword icon (lucide `Swords` or the mockup path) swings in; chip `★3 beat ★5 · 2–0`.
  - `strength-split`: three bars (win colour / muted / foreground) grow to fixed heights with sample `W-D-L` labels.
  - Gold: add `--star` (light `oklch(0.78 0.16 80)`, dark `oklch(0.83 0.15 85)`) to `globals.css` tokens and `@theme`. Under `motion-reduce` every art renders its final frame.
- [ ] **Step 2: Implement `WhatsNewDialog`**
  - `useReducer(storyReducer, cards.length, initStory)`; a `requestAnimationFrame` loop dispatches `tick` while open; reset with `go 0` when it opens.
  - Layout per spec: phone = centred card, art 170 px above text; `md:` = 700×390, art 300 px left. Track is `flex` + `translateX(-idx*100%)` with a 460 ms transition.
  - Top: progress segments (width = done / `elapsed/SLIDE_MS` / 0; clicking one dispatches `go`), ⏸/▶ button (`aria-pressed`, hidden on last), ✕.
  - Footer: desktop hint `← → browse · Space pause` (`hidden md:block`), Back (hidden on first), primary button "Show me" on an intro card, "Next", or "Got it" on the last (closes).
  - Pointer: `pointerenter/leave` with `pointerType === "mouse"` → `hover`; `pointerdown` on the track → `held: true`, `pointerup/cancel/leave` → `held: false`; prevent the context menu on the track.
  - Keys while open: ←/→ → `back`/`next`, Space → `toggle` (not when focus is on a button), Esc is handled by Base UI and closes.
- [ ] **Step 3: Wire up**
  - `(app)/layout.tsx`: `const cards = storyCards(unseenReleases(user.lastSeenRelease))`; render `<WhatsNew cards={cards} />` only when `cards.length > 0`.
  - Settings: new "What's new" section with `<WhatsNewButton />` ("See what's new in 1.2.0").
- [ ] **Step 4: Verify** `npm test && npx tsc --noEmit && npm run lint` — Expected: clean.
- [ ] **Step 5: Manual run** (with Task 7's seeded DB, where seeded users have `NULL`): log in → popup opens on the first page; check auto-advance, ⏸ sticky pause, hold-to-pause on a touch emulator, hover pause, ← → Space Esc on desktop; close, reload → no popup; Settings → What's new reopens it; sign up a new user → no popup. Phone width + desktop, light + dark, reduced motion on.
- [ ] **Step 6: Commit** `feat: what's new story popup for 1.2.0`

**Deploy note (for the PR description):** run the production migrations (`DATABASE_URL=<prod> npx drizzle-kit migrate`) *before* deploying the new code. Both are additive (two star columns with a 5★ default, one nullable `last_seen_release`): old code ignores them and inserts pick up the defaults, so the order is safe. After deploy, every existing player sees the 1.2.0 popup once.
