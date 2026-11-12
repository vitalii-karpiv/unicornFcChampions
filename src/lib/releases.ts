/**
 * User-facing release notes, newest first. A release only shows the "What's new" popup if it has an entry here,
 * so patch releases without user-visible changes simply don't add one. The newest entry must match package.json.
 */
export type ArtKey =
  | "intro"
  | "team-stars"
  | "elo-odds"
  | "giant-killing"
  | "strength-split"
  | "coins"
  | "bet-slip"
  | "futures"
  | "betting-rating";

export type Card = {
  art: ArtKey;
  title: string;
  body: string;
  /** Intro cards only: the release they open, and the titles of the cards that follow (desktop table of contents). */
  version?: string;
  toc?: string[];
};

export type Release = {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  /** One line under "Version X is out". */
  summary: string;
  /** Feature cards; the intro card is derived. */
  cards: Card[];
};

export const RELEASES: Release[] = [
  {
    version: "1.3.0",
    date: "2026-11-12",
    summary: "Bets are here. Back your friends (or bet against them) with fake coins.",
    cards: [
      {
        art: "coins",
        title: "1,000 coins each",
        body: "Everyone starts with 1,000 coins to bet on the new Bets tab. On your phone, Bets takes Me's place; your profile is in the avatar menu.",
      },
      {
        art: "bet-slip",
        title: "Daily bets",
        body: "Every day there are odds for each pair who played in the last 30 days: winner, total goals, correct score and more. You can't bet on your own matches.",
      },
      {
        art: "futures",
        title: "Monthly predictions",
        body: "Pick next month's Player of the Month and award winners. Picks are free, and a correct one pays 20 × its odds. This is the only way to earn new coins.",
      },
      {
        art: "betting-rating",
        title: "Betting rating",
        body: "A new table on Home, right under the Elo leaderboard, ranks everyone by balance. It also shows bets won and this month's profit.",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-11-09",
    summary: "Team stars are here. A few quick cards on what's new.",
    cards: [
      {
        art: "team-stars",
        title: "Team stars",
        body: "When you log a match, set each side's team rating, from 0.5★ to 5★. Use 5+ for legend teams. New matches start at 5★.",
      },
      {
        art: "elo-odds",
        title: "Stars count in Elo",
        body: "Beat a stronger team and you gain more. Win with the stronger one and you gain less. The odds on the log form update as you change stars.",
      },
      {
        art: "giant-killing",
        title: "Biggest giant-killing",
        body: "A new all-time record on the Records page: the win against the biggest star gap.",
      },
      {
        art: "strength-split",
        title: "Results by team strength",
        body: "Your player page now splits your record into underdog, even and favourite. Older matches count as 5★ v 5★, so nobody's rating changed.",
      },
    ],
  },
];

export const LATEST_RELEASE = RELEASES[0].version;

/** Numeric comparison per dot-separated segment, so 1.10.0 > 1.9.0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Releases newer than the one the user last saw, newest first; null (never seen any) → all of them. */
export function unseenReleases(lastSeen: string | null): Release[] {
  return lastSeen === null ? RELEASES : RELEASES.filter((r) => compareVersions(r.version, lastSeen) > 0);
}

/** One continuous story: an intro card for each release, followed by its feature cards. */
export function storyCards(releases: Release[]): Card[] {
  return releases.flatMap((r) => [
    { art: "intro" as const, title: `Version ${r.version} is out`, body: r.summary, version: r.version, toc: r.cards.map((c) => c.title) },
    ...r.cards,
  ]);
}
