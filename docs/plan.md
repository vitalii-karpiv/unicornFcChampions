# Unicorn FC Champions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first Next.js app for 3–4 friends to log 1v1 EA FC matches and see Elo, monthly awards, head-to-heads, records and a banter feed.

**Architecture:** Next.js 16 App Router. Server Components read from Postgres via Drizzle; Server Actions write. With 3–4 players the whole match history is tiny, so pages load all matches once per request (`getRatedMatches()`) and derive every statistic with pure, unit-tested functions in `src/lib/domain/`. Elo is materialized on match rows by a full replay inside a locked transaction after every write.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, next-themes, Recharts, Drizzle ORM + drizzle-kit, `pg` (node-postgres Pool; works with Neon on Vercel Node runtime and with local Postgres), `jose`, `@node-rs/argon2`, zod, `@date-fns/tz` + date-fns, Vitest. Package manager: npm.

**Spec:** `docs/spec.md`

## Global Constraints

- No auth framework. JWT via `jose` HS256, cookie `session` httpOnly/secure(prod)/SameSite=Lax/30 days; `token_version` checked server-side.
- Username `^[a-z0-9_]{3,20}$` stored lowercase; password min 8 chars, argon2id.
- Login rate limit: 5 failed attempts per username per 15 min.
- Elo: start 1000; K = 40 if player has < 10 prior matches else 32; GD multiplier 1 / 1.5 / (11+GD)/8; replay order `(played_at, created_at, id)`.
- All month logic in `Europe/Kyiv`. Ended months are locked: no create/edit/delete of matches with `played_at` before current Kyiv month start; no `played_at` more than 5 min in the future.
- Goals are integers 0–99; players must differ.
- Comments ≤ 500 chars, plain text. Reactions fixed: 🔥 😂 💀 👏 🤡.
- Awards: eloGain, winStreak, games, wins, winRate (≥5 games), goals. One winner each; stat must be > 0. Tiebreak: eloGain (skipped for eloGain award) → wins → fewer games → earliest reachedAt. POTM needs ≥5 games; ranked by awards won, then same chain.
- Monochrome Geist look, light/dark via system + toggle, green/red only for win/loss and Elo deltas.
- Next 16: middleware file is `src/proxy.ts` exporting `proxy`.

## Review Focus

1. A match whose `played_at` equals another's — replay order must be deterministic (`created_at`, then `id`) → test in Task 3.
2. Logging a match at 00:30 Kyiv on the 1st for a game "yesterday" — must be rejected as locked month, using Kyiv (not UTC) boundaries, including DST months → tests in Task 2 and Task 5.
3. Month where nobody reaches 5 games, or all players tie on every stat → awards/POTM degrade to null or tiebreak chain, never crash → tests in Task 4.
4. Username case: "Vitalii" and "vitalii" must be the same account at signup and login → test in Task 6.
5. Deleting the only match of a player, then viewing profile/records → Elo back to 1000, no NaN, empty states → test in Task 3 (`replayElo([])`, player with no matches in `playerResults`) and Task 4 records on empty input.

---

## File Structure

```
src/
  proxy.ts                         auth redirect (JWT signature only)
  app/
    layout.tsx, globals.css, manifest.ts, icon.svg
    (auth)/login/page.tsx, (auth)/signup/page.tsx, (auth)/actions.ts
    (app)/layout.tsx               nav shell, requires user
    (app)/page.tsx                 home
    (app)/matches/new/page.tsx, (app)/matches/[id]/page.tsx, (app)/matches/[id]/edit/page.tsx, (app)/matches/actions.ts
    (app)/month/[[...month]]/page.tsx, (app)/hall-of-fame/page.tsx
    (app)/players/[username]/page.tsx, (app)/h2h/[a]/[b]/page.tsx
    (app)/records/page.tsx, (app)/activity/page.tsx
    (app)/settings/page.tsx, (app)/settings/actions.ts
  components/                      ui/ (shadcn), nav.tsx, avatar.tsx, form-dots.tsx, elo-delta.tsx,
                                   match-card.tsx, match-form.tsx, elo-chart.tsx, heatmap.tsx,
                                   reactions.tsx, comments.tsx, theme-toggle.tsx, awards-table.tsx
  lib/
    db/schema.ts, db/index.ts
    domain/types.ts, time.ts, elo.ts, replay.ts, results.ts, streaks.ts, month.ts, awards.ts,
           records.ts, h2h.ts, heatmap.ts, validation.ts, avatar-color.ts
    auth/password.ts, auth/jwt.ts, auth/session.ts, auth/rate-limit.ts
    data/queries.ts                getUsers, getRatedMatches, getMatch, feed, comments, reactions, activity
    matches/service.ts             createMatch/updateMatch/deleteMatch + replayAll
    awards/freeze.ts               ensureFrozenMonths
scripts/seed.ts, scripts/reset-password.ts
drizzle/                           generated migrations
tests/domain/*.test.ts
```

---

### Task 1: Scaffold project

**Files:** Create: whole Next.js skeleton, `vitest.config.ts`, `tests/smoke.test.ts`, `.env.example`, `drizzle.config.ts`

**Interfaces:** Produces: `@/` alias → `src/`; `npm test` runs Vitest; `npm run db:generate`, `db:migrate`, `db:seed`, `reset-password` scripts.

- [ ] **Step 1:** `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack --yes` (move `docs/` and `.claude/` aside if the CLI refuses a non-empty dir).
- [ ] **Step 2:** Install deps: `drizzle-orm pg jose @node-rs/argon2 zod date-fns @date-fns/tz next-themes recharts` and dev `drizzle-kit vitest tsx @types/pg`.
- [ ] **Step 3:** `npx shadcn@latest init` (neutral base color), add `button input label card badge separator dropdown-menu textarea tabs sonner`.
- [ ] **Step 4:** Add `vitest.config.ts` (node env, `@` alias) and `tests/smoke.test.ts` asserting `1 + 1 === 2`. Run `npm test` → PASS.
- [ ] **Step 5:** `.env.example` with `DATABASE_URL=`, `AUTH_SECRET=`; `.gitignore` covers `.env*.local`.
- [ ] **Step 6:** `npm run build` → succeeds. Commit `chore: scaffold next app`.

### Task 2: Kyiv time utilities

**Files:** Create `src/lib/domain/time.ts`; Test `tests/domain/time.test.ts`

**Interfaces:** Produces:
- `TZ = 'Europe/Kyiv'`
- `monthKey(d: Date): string` → `'YYYY-MM'` in Kyiv
- `monthStart(key: string): Date`, `nextMonthStart(key: string): Date` (UTC instants of Kyiv midnight)
- `currentMonthKey(now?: Date): string`
- `isLockedDate(playedAt: Date, now: Date): boolean` (true if before `monthStart(currentMonthKey(now))`)
- `dayKey(d: Date): string` → `'YYYY-MM-DD'` in Kyiv
- `shiftMonth(key: string, delta: number): string`

- [ ] **Step 1: Tests**
  - `monthKey(new Date('2026-10-31T22:30:00Z'))` === `'2026-11'` (Kyiv UTC+2 after DST end on Oct 25 2026 → 00:30 Nov 1).
  - `monthKey(new Date('2026-07-31T20:59:00Z'))` === `'2026-07'`; `'2026-07-31T21:00:00Z'` → `'2026-08'` (UTC+3).
  - `monthStart('2026-11').toISOString()` === `'2026-10-31T22:00:00.000Z'`; `monthStart('2026-08')` === `'2026-07-31T21:00:00.000Z'`.
  - `isLockedDate(new Date('2026-10-31T21:50:00Z'), new Date('2026-10-31T22:30:00Z'))` === true.
  - `shiftMonth('2026-01', -1)` === `'2025-12'`.
- [ ] **Step 2:** `npx vitest run tests/domain/time.test.ts` → FAIL.
- [ ] **Step 3:** Implement with `TZDate` from `@date-fns/tz`.
- [ ] **Step 4:** Run → PASS. Commit `feat: kyiv month utilities`.

### Task 3: Elo + replay + per-player results

**Files:** Create `src/lib/domain/types.ts`, `elo.ts`, `replay.ts`, `results.ts`; Tests `tests/domain/elo.test.ts`, `replay.test.ts`, `results.test.ts`

**Interfaces:** Produces:
```ts
// types.ts
export type MatchRow = { id: string; playerAId: string; playerBId: string; goalsA: number; goalsB: number; playedAt: Date; createdAt: Date };
export type RatedMatch = MatchRow & { aEloBefore: number; aEloAfter: number; bEloBefore: number; bEloAfter: number };
export type Outcome = 'W' | 'D' | 'L';
export type PlayerResult = { matchId: string; playedAt: Date; opponentId: string; goalsFor: number; goalsAgainst: number; outcome: Outcome; eloBefore: number; eloAfter: number; eloDelta: number };
```
- `elo.ts`: `START_ELO = 1000`; `expectedScore(ra, rb): number`; `goalDiffMultiplier(gd: number): number`; `kFactor(priorGames: number): number`; `rateMatch(i: { ra: number; rb: number; priorA: number; priorB: number; goalsA: number; goalsB: number }): { aAfter: number; bAfter: number }`
- `replay.ts`: `sortMatches<T extends MatchRow>(ms: T[]): T[]`; `replayElo(ms: MatchRow[]): RatedMatch[]` (sorted output)
- `results.ts`: `playerResults(ms: RatedMatch[], userId: string): PlayerResult[]` (chronological); `currentElo(ms: RatedMatch[], userId: string): number`; `peakElo(ms, userId): number`

- [ ] **Step 1: Tests**
  - `expectedScore(1000, 1000)` = 0.5; `expectedScore(1200, 1000)` ≈ 0.7597 (4 dp).
  - `goalDiffMultiplier(0)`=1, `(1)`=1, `(2)`=1.5, `(3)`=1.75, `(5)`=2.
  - `kFactor(9)`=40, `kFactor(10)`=32.
  - `rateMatch({ra:1000,rb:1000,priorA:0,priorB:0,goalsA:2,goalsB:1})` → aAfter 1020, bAfter 980.
  - `rateMatch({ra:1000,rb:1000,priorA:20,priorB:20,goalsA:3,goalsB:0})` → aAfter 1028, bAfter 972.
  - Draw at equal ratings → unchanged.
  - Different K: priorA 0, priorB 20, 1–0 at 1000/1000 → aAfter 1020, bAfter 984.
  - `replayElo([])` → `[]`.
  - Replay chains ratings: second match uses first match's after values; prior-game counts increment per player.
  - Same `playedAt`: ordered by `createdAt`, then `id`; result independent of input order.
  - `playerResults` for player B side flips goals/outcome; `currentElo` of a user with no matches = 1000.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Commit `feat: elo rating and replay`.

### Task 4: Streaks, monthly stats, awards, records, h2h, heatmap

**Files:** Create `src/lib/domain/streaks.ts`, `month.ts`, `awards.ts`, `records.ts`, `h2h.ts`, `heatmap.ts`; Tests one per file.

**Interfaces:** Consumes Task 2/3. Produces:
- `streaks.ts`: `longestStreak(rs: PlayerResult[], kind: Outcome): { length: number; endMatchId: string | null; reachedAt: Date | null }` (reachedAt = playedAt of the match where that max length was first reached); `currentStreak(rs): { outcome: Outcome | null; length: number }`; `lastN(rs, n = 5): Outcome[]` (oldest→newest).
- `month.ts`: `type PlayerMonthStats = { userId; games; wins; draws; losses; goalsFor; goalsAgainst; eloGain; longestWinStreak; winRate; reachedAt: Record<AwardKey, Date | null> }`; `monthStats(ms: RatedMatch[], key: string, userIds: string[]): PlayerMonthStats[]` (only matches with `monthKey(playedAt) === key`; reachedAt per key = playedAt of the last match that changed that stat, winStreak from `longestStreak`).
- `awards.ts`: `type AwardKey = 'eloGain' | 'winStreak' | 'games' | 'wins' | 'winRate' | 'goals'`; `AWARDS: { key: AwardKey; label: string; emoji: string; minGames: number }[]` (labels: Biggest Elo gain 📈, Longest win streak 🔥, Most games 🎮, Most wins 🏆, Best win rate 🎯 (minGames 5), Most goals ⚽); `type MonthAwards = { month: string; awards: Record<AwardKey, { userId: string; value: number } | null>; playerOfMonth: { userId: string; awardsWon: number } | null; stats: PlayerMonthStats[] }`; `computeAwards(month: string, stats: PlayerMonthStats[]): MonthAwards`.
- `records.ts`: `type RecordEntry = { userId: string; value: number; matchId: string; playedAt: Date } | null`; `computeRecords(ms: RatedMatch[], userIds: string[]): { longestWinStreak; longestLossStreak; biggestWin; highestElo; mostGoalsInMatch }` (all RecordEntry; biggestWin value = GD, tie → more total goals → earlier).
- `h2h.ts`: `headToHead(ms: RatedMatch[], a: string, b: string): { games; aWins; draws; bWins; aGoals; bGoals; aEloNet; biggestAWin: RatedMatch | null; biggestBWin: RatedMatch | null; recent: RatedMatch[] /* last 10, newest first */ }`.
- `heatmap.ts`: `activityByDay(dates: Date[], now: Date, days = 365): { day: string; count: number }[]` (Kyiv days, oldest→newest, length `days`).

- [ ] **Step 1: Tests** (build fixtures with a `mk(a, b, ga, gb, iso)` helper + `replayElo`)
  - streak: W W D W W W L → longest W = 3 with reachedAt of 6th match; currentStreak `{outcome:'L', length:1}`; empty → `{null,0}`.
  - monthStats ignores matches from other months; a 23:30 Kyiv match on the last day counts in that month.
  - awards: winRate award skips a 4-game 100% player and goes to a 5-game player; all-zero goals → `goals` award null; tie on wins broken by eloGain, then by fewer games, then earlier reachedAt.
  - POTM: nobody with ≥5 games → null; two eligible players with equal awardsWon → higher eloGain wins.
  - records on `[]` → all null; biggestWin picks 5–0 over 4–0 and 6–1 over 5–0.
  - h2h counts from a's perspective when a played as player B; `recent` capped at 10.
  - heatmap length 365, last entry is today's Kyiv day, counts aggregate same-day matches.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Commit `feat: stats, awards, records`.

### Task 5: Database + match service

**Files:** Create `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/domain/validation.ts`, `src/lib/matches/service.ts`, `src/lib/data/queries.ts`, `drizzle/*`; Test `tests/domain/validation.test.ts`

**Interfaces:** Consumes Task 2/3. Produces:
- Drizzle tables per spec §10: `users`, `matches`, `matchComments`, `matchReactions`, `activityLog`, `monthlyAwards`, `loginAttempts`.
- `db` (drizzle `node-postgres` over a `pg` Pool, reused via globalThis in dev).
- `validation.ts`: `matchInputSchema` (zod: `playerAId`, `playerBId` uuid, `goalsA`/`goalsB` int 0–99, `playedAt` Date); `checkMatchRules(i: MatchInput, now: Date): string | null` (error message: same player, future > 5 min, locked month).
- `service.ts`: `createMatch(actorId: string, i: MatchInput): Promise<string>`; `updateMatch(actorId: string, id: string, i: MatchInput): Promise<void>`; `deleteMatch(actorId: string, id: string): Promise<void>` — each in one transaction: `pg_advisory_xact_lock(4242)`, rule check (update/delete also check the existing row isn't locked), write, activity_log row, `replayAll(tx)` (load all matches, `replayElo`, update elo columns of changed rows). Throws `MatchRuleError`.
- `queries.ts`: `getUsers(): Promise<{ id; username }[]>`; `getRatedMatches(): Promise<RatedMatch[]>`; `getMatch(id)`; `getFeed(limit, offset)` (matches newest first + reaction counts + comment counts); `getComments(matchId)`; `getReactions(matchId)`; `getActivity(limit)`.

- [ ] **Step 1: Tests** for `checkMatchRules`: same players → error; playedAt now+10min → error; now+2min → ok; playedAt previous Kyiv month → error; zod rejects goals 100 and -1.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement validation, schema, db, service, queries.
- [ ] **Step 4:** Run tests → PASS; `npm run db:generate` produces `drizzle/0000_*.sql`; with `DATABASE_URL` set run `npm run db:migrate`.
- [ ] **Step 5:** Commit `feat: schema and match service`.

### Task 6: Auth

**Files:** Create `src/lib/auth/{password,jwt,session,rate-limit}.ts`, `src/proxy.ts`, `src/app/(auth)/{login,signup}/page.tsx`, `src/app/(auth)/actions.ts`; Test `tests/auth/jwt.test.ts`, `tests/auth/username.test.ts`

**Interfaces:** Produces:
- `password.ts`: `hashPassword(p): Promise<string>`, `verifyPassword(hash, p): Promise<boolean>`
- `jwt.ts`: `signSession(p: { sub: string; ver: number }): Promise<string>`, `verifySession(t: string): Promise<{ sub: string; ver: number; iat: number } | null>` (expiry 30d)
- `validation.ts` additions: `normalizeUsername(s): string` (trim + lowercase), `usernameSchema`, `passwordSchema`
- `session.ts`: `setSessionCookie(userId, ver)`, `clearSessionCookie()`, `getCurrentUser(): Promise<{ id; username; tokenVersion } | null>` (cached per request with React `cache`, checks `ver === token_version`), `requireUser()` (redirects to `/login`)
- `rate-limit.ts`: `isRateLimited(username): Promise<boolean>`, `recordFailure(username)`, `clearFailures(username)`
- actions: `signup(prev, formData)`, `login(prev, formData)`, `logout()`
- [ ] **Step 1: Tests**: sign→verify round-trip returns sub/ver; tampered token → null; `normalizeUsername(' Vitalii ')` = `'vitalii'`; `usernameSchema` rejects `'ab'`, `'a-b'`, 21 chars.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. Sliding refresh: in `(app)/layout.tsx` render a tiny client component that calls a `refreshSession` server action when `iat` older than 1 day.
- [ ] **Step 4:** Run → PASS; manual: sign up, log out, log in, 6th wrong password says "Too many attempts, try again in 15 minutes".
- [ ] **Step 5:** Commit `feat: hand-rolled jwt auth`.

### Task 7: App shell, theme, PWA, shared components

**Files:** `src/app/layout.tsx`, `globals.css`, `manifest.ts`, `icon.svg`, `(app)/layout.tsx`, `components/{nav,avatar,form-dots,elo-delta,theme-toggle}.tsx`, `lib/domain/avatar-color.ts`

**Interfaces:** Produces `<Avatar username size? />`, `<FormDots outcomes: Outcome[] />`, `<EloDelta value: number />` (green +N / red −N / gray 0), `<Nav />` (bottom tab bar mobile, top bar ≥md: Home `/`, Month `/month`, + Log `/matches/new`, Records `/records`, Me `/players/[me]`; settings & activity & hall of fame in the "Me" page/top bar menu), `avatarColor(username): string`.
- [ ] **Step 1:** Test `avatarColor` deterministic and from palette.
- [ ] **Step 2:** Implement; Geist via `next/font` (`geist` package fonts from create-next-app), ThemeProvider `attribute="class"`, monochrome CSS tokens.
- [ ] **Step 3:** `npm run build` passes; commit `feat: app shell and theme`.

### Task 8: Log / edit / delete matches + match detail with comments & reactions

**Files:** `(app)/matches/new/page.tsx`, `(app)/matches/[id]/page.tsx`, `(app)/matches/[id]/edit/page.tsx`, `(app)/matches/actions.ts`, `components/{match-form,match-card,comments,reactions}.tsx`

**Interfaces:** Consumes Task 5 service/queries. Actions: `saveMatch(prev, formData)` (create or update by hidden id), `removeMatch(id)`, `addComment(matchId, body)`, `deleteComment(id)` (author only), `toggleReaction(matchId, emoji)` (validated against the fixed set). All call `requireUser()` and `revalidatePath('/', 'layout')`.
- [ ] **Step 1:** Match form: player A select (default me), player B select, big +/− score steppers, `datetime-local` (default now, Kyiv), submit; shows `MatchRuleError` message inline.
- [ ] **Step 2:** Detail page: score header, Elo before→after for both, edit/delete buttons hidden when locked, reactions bar, comments list + form.
- [ ] **Step 3:** Manual check against dev DB: create, edit score (Elo changes downstream), delete; comment & react. Commit `feat: match logging and detail`.

### Task 9: Home, month, hall of fame

**Files:** `(app)/page.tsx`, `(app)/month/[[...month]]/page.tsx`, `(app)/hall-of-fame/page.tsx`, `components/awards-table.tsx`, `lib/awards/freeze.ts`

**Interfaces:** `ensureFrozenMonths(now = new Date()): Promise<void>` — for each `monthKey` of matches `< currentMonthKey(now)` without a `monthly_awards` row: `computeAwards(key, monthStats(...))`, insert `ON CONFLICT DO NOTHING`. `getFrozenMonths(): Promise<MonthAwards[]>`.
- [ ] **Step 1:** Home: leaderboard (rank, avatar, username→profile, Elo, games, W-D-L, `FormDots`), current-month mini standings (POTM leader + award leaders), feed of `MatchCard` with "Load more".
- [ ] **Step 2:** Month page: month switcher (prev/next), monthly Elo-change leaderboard, awards table; current month labelled "Live standings", past months read from snapshot (call `ensureFrozenMonths` first).
- [ ] **Step 3:** Hall of fame: one card per frozen month with POTM and award winners.
- [ ] **Step 4:** Build passes; commit `feat: home, month and hall of fame`.

### Task 10: Profile, H2H, records, activity

**Files:** `(app)/players/[username]/page.tsx`, `(app)/h2h/[a]/[b]/page.tsx`, `(app)/records/page.tsx`, `(app)/activity/page.tsx`, `components/{elo-chart,heatmap}.tsx`
- [ ] **Step 1:** Profile: Elo, peak, W-D-L, goals, current streak, `EloChart` (Recharts `LineChart`, monotone, no dots, x = match #), `Heatmap` (53×7 CSS grid, 5 gray-intensity buckets, tooltip "N matches on DATE"), H2H links per opponent, recent matches. Unknown username → `notFound()`.
- [ ] **Step 2:** H2H page from `headToHead`; `a === b` or unknown → `notFound()`.
- [ ] **Step 3:** Records page from `computeRecords` with empty states.
- [ ] **Step 4:** Activity: rows "vitalii edited match · 2–1 → 3–1 · 2h ago".
- [ ] **Step 5:** Build passes; commit `feat: profile, h2h, records, activity`.

### Task 11: Settings, scripts, docs

**Files:** `(app)/settings/page.tsx`, `(app)/settings/actions.ts`, `scripts/seed.ts`, `scripts/reset-password.ts`, `README.md`
- [ ] **Step 1:** Settings actions: `changePassword` (verify current, hash new, `token_version + 1`, re-issue cookie), `logoutEverywhere` (`token_version + 1`, clear cookie), theme toggle.
- [ ] **Step 2:** `scripts/reset-password.ts <username>`: generates a 12-char random password, stores hash, bumps `token_version`, prints it. Run via `tsx --env-file=.env.local`.
- [ ] **Step 3:** `scripts/seed.ts`: wipes tables, creates users `vitalii, max, andrii, oleh` (password `password123`), ~150 random matches across the last 3 months, then `replayAll`.
- [ ] **Step 4:** README: setup (Vercel + Neon integration, env vars, migrate, seed), scripts.
- [ ] **Step 5:** `npm test`, `npm run lint`, `npm run build` all pass. Commit `feat: settings and scripts`.
