# Bets — design

Agreed in a brainstorming session on 2026-11-11. Mockup: `docs/superpowers/mockups/2026-11-11-bets.html`.

Friends bet fake coins on each other's matches (daily markets) and make free monthly predictions (futures) that are the only source of new coins. It adds a reason to open the app every day and some trash talk before games.

## Coins

- Every user starts with **1,000 coins** (new signups too). Coins carry over between months; there is no monthly reset.
- The balance is **derived, never stored**: `1000 + futures payouts − stakes + returns`. Settlement is a pure function of bets and matches, so editing or deleting a match re-settles affected bets automatically (the same idea as the Elo replay).
- A re-settle can push a balance below zero. That is allowed; the player can't bet again until it is positive.
- Amounts are plain integers. No coin emoji. Odds are written **×1.70** (never "@").

## Futures (monthly predictions)

- Fixed questions every month: 👑 Player of the Month plus the six existing awards (📈 Biggest Elo gain, 🔥 Longest win streak, 🎮 Most games, 🏆 Most wins, 🎯 Best win rate, ⚽ Most goals).
- Timeline: when month A ends, odds for month C (= A + 2) are calculated from results up to the end of A and **locked**. During month B everyone picks one player per question for C; picks can change until B ends. C's picks are scored when C freezes into the Hall of Fame.
- Picks are **free**. A correct pick pays **20 × odds** (rounded). No margin on futures odds.
- **Picking yourself is allowed.**
- If an award has no winner that month (nobody qualified), nobody is paid for that question.
- The first month after launch has no picks (nothing was open the month before).

## Daily bets

- Every Kyiv day, markets are generated for each pair of players who played each other in the last 30 days, plus a few group markets. Prices come from Elo (who wins) and the pair's recent scoring (how many goals), with a **5% margin**.
- Pair markets: Winner (incl. draw), Total goals over/under, Correct score (4 most likely), Winning margin (1–2 / 3–5 / 6+ per side), each player's goals over/under, "X wins the next 3 in a row".
- Group markets (yes/no, open to everyone): a match is won by 8+, someone scores 15+ in a match, a match ends in a draw, the lowest-rated active player wins a match. *Change from the mockup:* "Matches today over/under" was dropped, because a count that started before your bet can't be priced fairly.
- **No betting on a pair you play in.** Group markets are open to everyone.
- A bet only counts matches played **10+ minutes after it was placed**.
- A pair bet settles on the **first** match between the two (either side order) in that window. If they don't play within **7 days**, the stake is refunded. "Next 3 in a row" needs up to three matches in that week; if the week ends before it's decided, refunded.
- A group bet covers matches from 10 minutes after the bet until **Kyiv midnight**. "Yes" wins as soon as a qualifying match is played; "No" wins at midnight.
- An open bet can be **cancelled for a 10% fee** (rounded up, so at least 1 coin); the rest of the stake comes back. A cancellation is final: a match logged later that would have settled the bet is ignored. Settled bets can't be cancelled.
- Singles only (no accumulators). The bet stores its odds; later price moves don't affect it. If the price changed between viewing and placing, the bet is rejected and the player sees the new price.

## Screens

- **Phone tab bar:** Home · Month · Log · Records · **Bets** (Bets replaces Me; Profile stays in the avatar menu).
- **Laptop header:** Home · Month · Records · Me · **Bets**.
- **Bets page** (`/bets`): wallet stats (Balance · At stake · this month's profit), then tabs **Today · Futures · My bets**.
  - Today: one collapsible card per pair; your own pairs shown locked ("You're playing"); group card. Tapping a price opens the bet slip: stake input, 50/100/250/All in chips, returns, balance after, and a line saying exactly which match will settle it and the refund deadline.
  - Futures: next month's questions with locked odds and a countdown to the deadline; "if all hit" total; this month's picks tracked live.
  - My bets: open bets (stake → returns, deadline), settled bets (won / lost / refunded) linking to the deciding match.
- **Home:** a **Betting rating** table right below the Elo leaderboard, sorted by balance: #, player, bets won (all-time), this month's profit, balance.

## Not doing

Accumulators, live in-play odds, cash-out at current odds, admin tools to void bets, a release/What's-new entry (separate task).
