# Team star rating — design

Agreed in a grilling session on 2026-11-09. Players pick EA FC teams of different strength; the team's star rating is recorded per side and feeds both Elo and stats.

## Scale and storage

- Values: 0.5★ to 5★ in half steps, plus **5+** for legend/special teams (stronger than a normal 5★).
- Stored as an integer count of **half-stars**: `1…10` for 0.5★…5★, and **`12` for 5+** (it counts as a full extra star, i.e. 6★). `11` is never valid.
- Two columns on `matches`: `stars_a`, `stars_b` — `integer NOT NULL DEFAULT 10`, CHECK value in `{1…10, 12}`.
- Migration backfills every existing match as 5★ vs 5★. Equal stars mean zero handicap, so replayed Elo is identical and frozen award snapshots are untouched.
- Stars only — no team name.

## Elo

- Each team adds **`STAR_ELO = 100` virtual Elo points per star** (50 per half-star) inside the expected score only:
  `E_a = expectedScore(R_a + 100·stars_a, R_b + 100·stars_b)` (stars in whole-star units, 5+ = 6).
- K-factor and goal-difference multiplier unchanged. Displayed ratings are never shifted.
- `STAR_ELO` is one named constant; changing it later rewrites replayed Elo history (frozen award snapshots stay as they are). Accepted.
- Example, both 1000, K=32, A on 3★ vs B on 5★: B expected 76%; A wins 1–0 → A +24.3; B wins 1–0 → B +7.7; draw → A +8.3.

## Log / edit form

- −/+ stepper under each player, same style as the goals stepper: 0.5 … 4.5 → 5 → 5+ (skips 11). Shows `★ 4.5` / `★ 5+`.
- New match: both sides start at 5★ (no stickiness). Edit: the match's stored stars.
- The existing Elo odds bar and win/lose stakes take stars into account and update live as stars change.
- Stars are editable under the same current-month lock as goals.
- Server-side validation rejects any value outside the allowed set. A form post with no star fields (old cached client) is treated as 5★.

## Audit

- Activity log before/after JSON includes `starsA`, `starsB`.
- Activity page shows star changes, e.g. `vitalii ★5 → ★4.5`. Old snapshots without stars read as 5★.

## Display and stats

- Match card and match detail page: stars shown next to each side.
- Records page: **"Biggest giant-killing"** — the win with the largest star deficit (winner's stars below loser's); ties → larger goal difference, then the earlier match keeps it. Draws and equal-star wins don't count.
- Player page: average team stars (5+ counts as 6) and W-D-L split into **underdog / even / favourite**, by stars only; any difference, even half a star, counts.
- No new monthly award.

## Seed

- Seed generates a realistic star mix: mostly 4–5★, occasional 3★ and 5+.

## "What's new" popup (ships with release 1.2.0)

Agreed 2026-11-09. Mockup: https://claude.ai/artifact/UZ65eEP4RbHUXSr6paWH4A (story-cards concept, phone + desktop).

- **Seen state is per user, in the DB:** `users.last_seen_release text NULL`. Existing users start `NULL` → they see 1.2.0. **New signups** get the latest release version written at signup, so they never see it.
- **Notes live in code:** `src/lib/releases.ts`, a typed list newest first. Each release has an intro card ("Version 1.2.0 is out" + one-line summary + a table of contents on desktop) followed by feature cards (title, body, animated art). A test pins the newest entry's version to `package.json`.
- **Which releases show:** every release newer than the user's `last_seen_release` (semver comparison), newest first, as one continuous story. Releases without an entry (patches) never trigger the popup.
- **Closing in any way** (✕, Got it on the last card, Esc, click outside) marks everything as seen by setting `last_seen_release` to the latest version.
- **Story behaviour:** progress segments at the top (tappable), auto-advance every 6 s, the last card waits for Got it. Buttons: Back (hidden on the first card), Next ("Show me" on the intro, "Got it" on the last). Desktop: ← / → browse, Space toggles pause, Esc closes.
- **Pausing:** ⏸/▶ button next to ✕ (sticky until pressed again; hidden on the last card); press-and-hold a card pauses while held; mouse hover over the card pauses on desktop. Navigation still works while paused.
- **Layout:** phone stacks the art (≈170 px) above the text in a centred card; from `md` up the card is ≈700×390 with art left (300 px) and text right.
- **Look:** app palette and Geist fonts; gold for stars is the only new colour. Animations are CSS + React state, no new dependency; everything settles to its final frame under `prefers-reduced-motion`.
- **Settings** gets a "What's new" row that reopens the latest release's story.
- **1.2.0 cards:** intro (orbiting stars around "1.2") → Team stars (stars fill, 5+ lights up) → Stars count in Elo (win-chance bar 50/50 → 24/76, then "win: +24 / +8") → Biggest giant-killing (sword, "★3 beat ★5 · 2–0") → Results by team strength (underdog/even/favourite bars; notes older matches are 5★ v 5★).

## Out of scope

Team names, a giant-killer award, betting, a full release-history page.
