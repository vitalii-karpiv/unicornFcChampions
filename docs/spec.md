# Unicorn FC Champions — Spec

A small web app for 3–4 friends to track 1v1 EA FC (FIFA) matches on PlayStation: Elo ratings, monthly awards, head-to-heads, records and banter.

Agreed in a design session on 2026-10-24. Anything not covered here is out of scope for v1.

## 1. Users & auth

- Open sign-up: **unique username + password**. No email, no Google, no admin role, no user deletion.
- Username rules: 3–20 chars, `[a-z0-9_]`, stored lowercase. The username is also the display name.
- Avatar: circle with the username's first letter, background color derived deterministically from the username (hash → palette of ~8 muted colors).
- Passwords: min 8 chars, hashed with `@node-rs/argon2` (argon2id defaults).
- Sessions: hand-rolled, **no auth framework**.
  - JWT signed with `jose` (HS256, secret `AUTH_SECRET`), payload `{ sub: userId, ver: tokenVersion }`.
  - Stored in cookie `session`: httpOnly, secure (prod), SameSite=Lax, path `/`, max-age 30 days.
  - Sliding expiry: if the token is older than 1 day, re-issue on request (done in a server action/route, since server components can't set cookies).
  - `users.token_version` is checked on every authenticated request; "log out everywhere" increments it.
  - `proxy.ts` (Next 16's renamed middleware) only verifies the JWT signature/expiry and redirects anonymous users to `/login`; the DB `token_version` check happens in `getCurrentUser()` on the server.
- Login rate limit: max **5 failed attempts per username per 15 minutes**, tracked in Postgres (`login_attempts`). Successful login clears the username's failures.
- Settings page: change password (requires current password; increments `token_version` and re-issues own cookie), log out, log out everywhere.
- Forgotten password: developer runs `npm run reset-password <username>` (prompts for / prints a new password) against the DB.
- Known/accepted risk: the Vercel URL is public; anyone who finds it can sign up. Accepted.

## 2. Matches

- 1v1 only. Fields: player A, player B (distinct users), goals A, goals B (integers 0–99), `played_at` (timestamptz, defaults to now, editable).
- Draws allowed (a match decided on penalties is entered as a draw).
- **Anyone** logged in can create, edit or delete **any** match. Every create/update/delete writes an `activity_log` row (actor, action, before/after JSON).
- **Locking:** a month is locked as soon as it has ended (Europe/Kyiv time), regardless of whether its awards snapshot has been written yet. Consequences:
  - Only matches with `played_at` in the **current** Kyiv month can be edited/deleted.
  - New matches can't be logged with `played_at` before the start of the current Kyiv month, nor in the future (small clock-skew tolerance: 5 min).
- Deleting a match cascades its comments and reactions.

## 3. Elo

- Everyone starts at **1000**. Ratings stored as `double precision`, displayed rounded to integers.
- Expected score: `E_a = 1 / (1 + 10^((R_b − R_a) / 400))`.
- Actual score `S`: win 1, draw 0.5, loss 0.
- Goal-difference multiplier `G` (World Football Elo), with `GD = |goals_a − goals_b|`:
  - GD ≤ 1 → 1
  - GD = 2 → 1.5
  - GD ≥ 3 → (11 + GD) / 8
- K-factor per player: **40** if that player has played fewer than 10 matches before this one, otherwise **32**.
- Update: `R_a' = R_a + K_a · G · (S_a − E_a)` (and symmetrically for B with its own K).
- **Full replay:** after any create/update/delete, recompute every match in order `(played_at, created_at, id)` from the 1000 baseline and write `a_elo_before/after`, `b_elo_before/after` on each match row. Runs inside one transaction guarded by `pg_advisory_xact_lock` so concurrent writes serialize.
- A player's current Elo = `elo_after` of their latest match, else 1000.

## 4. Ratings views

- **All-time leaderboard** (never resets): rank, avatar, username, Elo, matches, W-D-L, form guide (last 5 results as colored dots, newest right).
- **Monthly leaderboard**: Elo change within the selected month, sorted desc.
- Players with 0 matches are still listed (at the bottom).

## 5. Monthly awards

Computed over matches whose `played_at` falls in the Kyiv calendar month.

| # | Award | Stat | Eligibility |
|---|-------|------|-------------|
| 1 | Biggest Elo gain | sum of the player's Elo deltas in the month | ≥1 game |
| 2 | Longest win streak | longest run of consecutive wins within the month (draw or loss breaks it; streaks don't carry over from the previous month) | ≥1 game |
| 3 | Most games played | count | ≥1 game |
| 4 | Most wins | count | ≥1 game |
| 5 | Best win rate | wins / games | ≥5 games |
| 6 | Most goals scored | total goals | ≥1 game |

- Each award has exactly **one winner** (no shared points). Tiebreak chain after the award's own stat:
  1. higher Elo gain in the month (skipped for award 1)
  2. more wins
  3. fewer games played
  4. reached the final value first (earlier timestamp of the match where the player last changed that stat)
- A winner's stat must be > 0 where applicable (no "longest win streak: 0"); if nobody qualifies, the award is empty.
- **Player of the Month**: the player with the most award wins, restricted to players with **≥5 games** in the month; ties use the same chain (Elo gain → wins → fewer games → earliest). If nobody has 5 games, no Player of the Month.
- **Live** during the current month (shown as "standings").
- **Freezing:** lazily, on any request that renders awards/hall of fame/home, for every ended month that has matches and no `monthly_awards` row, compute and insert a snapshot (`INSERT … ON CONFLICT DO NOTHING`). Snapshot JSON holds per-award winner + value, the Player of the Month, and per-player month stats. Since ended months are locked (section 2), the snapshot can't go stale.
- **Hall of Fame** page lists frozen months, newest first.

## 6. Other features (v1)

- **Head-to-head** `/h2h/[a]/[b]`: W-D-L, goals for/against, net Elo swing between the two, biggest win each, last 10 matches.
- **Player profile** `/players/[username]`: current Elo, peak Elo, W-D-L, goals, current streak, **Elo history chart** (Recharts line, one point per match), **activity heatmap** (GitHub-style, last 12 months, matches per day, only this player's matches), list of H2H links vs each opponent, recent matches.
- **Records** `/records` (all-time): longest win streak, longest losing streak, biggest win (largest GD, then most goals), highest Elo ever reached, most goals by one player in a match. Each shows holder, value, date and links to the match.
- **Match feed** (home page, reverse chronological, paginated): each match card shows players, score, Elo deltas, time, reaction counts, comment count. Match detail page `/matches/[id]` shows comments (plain text ≤500 chars, author can delete own, no threads, no edits) and reactions toggle with fixed set 🔥 😂 💀 👏 🤡 (one of each per user per match).
- **Activity log** `/activity`: who created/edited/deleted which match, with before → after.

## 7. Pages & navigation

| Route | Purpose |
|-------|---------|
| `/login`, `/signup` | auth (public) |
| `/` | leaderboard, current-month mini standings, match feed |
| `/matches/new` | log a match (opponent picker, score steppers, date/time, win-probability not in scope) |
| `/matches/[id]` | match detail, edit, delete, comments, reactions |
| `/month/[yyyy-mm]?` | monthly leaderboard + award standings (live for current, frozen for past) |
| `/hall-of-fame` | frozen months |
| `/players/[username]` | profile |
| `/h2h/[a]/[b]` | head-to-head |
| `/records` | all-time records |
| `/activity` | activity log |
| `/settings` | password, logout, logout everywhere |

- Mobile: bottom tab bar — Home, Month, **+ Log** (prominent), Records, Me. Desktop: top bar with the same items.
- New match: one tap from anywhere via the "+ Log" tab. Logged-in user preselected as player A (changeable).

## 8. Design

- Minimal, Vercel/Geist-like: monochrome, hairline borders, generous whitespace, Geist Sans + Geist Mono (numbers).
- Light/dark following system, with a manual toggle (`next-themes`).
- Only accents: green/red for win/loss & Elo up/down, neutral gray for draws.
- Tailwind CSS v4 + shadcn/ui components. Recharts for the Elo chart; heatmap is a custom SVG/grid.
- **Mobile-first**, installable **PWA** (web app manifest + icons; no offline mode).

## 9. Tech & structure

- Next.js 16 (App Router, Turbopack), TypeScript strict, npm.
- Vercel hosting; Postgres via Vercel's Neon integration; `pg` (node-postgres) Pool + Drizzle ORM; migrations via drizzle-kit, committed.
- Reads: Server Components query the DB directly. Writes: Server Actions with zod validation.
- Domain logic as pure functions in `src/lib/domain/` (elo, replay, streaks, month stats, awards, records, h2h, heatmap) — unit-tested with **Vitest**. No UI tests in v1.
- `src/lib/time.ts`: all month boundaries computed in `Europe/Kyiv`.
- Seed script (`npm run db:seed`) creates 4 users and ~3 months of random matches for local dev.
- Local dev against a Neon dev branch (`DATABASE_URL` in `.env.local`).

## 10. Data model

```
users            id uuid pk, username text unique, password_hash text, token_version int default 0, created_at
matches          id uuid pk, player_a_id fk users, player_b_id fk users, goals_a int, goals_b int,
                 played_at timestamptz, created_by fk users, created_at, updated_at,
                 a_elo_before, a_elo_after, b_elo_before, b_elo_after double precision (filled by replay)
                 check player_a_id <> player_b_id; index (played_at)
match_comments   id uuid pk, match_id fk matches on delete cascade, user_id fk users, body text, created_at
match_reactions  match_id fk cascade, user_id fk, emoji text, created_at, pk (match_id, user_id, emoji)
activity_log     id uuid pk, actor_id fk users, action text ('create'|'update'|'delete'), match_id uuid (no fk),
                 before jsonb null, after jsonb null, created_at
monthly_awards   month text pk ('YYYY-MM'), snapshot jsonb, frozen_at timestamptz
login_attempts   id serial pk, username text, attempted_at timestamptz; index (username, attempted_at)
```

## 11. Out of scope (later)

Achievements/badges, group activity heatmap, 2v2, teams/clubs used, game edition, penalties/extra time, match stats, Google sign-in, email, admin tools, i18n, win-probability preview, avatars upload, offline mode.
