export type MatchRow = {
  id: string;
  playerAId: string;
  playerBId: string;
  goalsA: number;
  goalsB: number;
  /** Team stars in half-stars (see stars.ts). */
  starsA: number;
  starsB: number;
  playedAt: Date;
  createdAt: Date;
};

export type RatedMatch = MatchRow & {
  aEloBefore: number;
  aEloAfter: number;
  bEloBefore: number;
  bEloAfter: number;
};

export type Outcome = "W" | "D" | "L";

export type PlayerResult = {
  matchId: string;
  playedAt: Date;
  opponentId: string;
  goalsFor: number;
  goalsAgainst: number;
  /** Team stars in half-stars, from this player's side. */
  starsFor: number;
  starsAgainst: number;
  outcome: Outcome;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
};

export type AwardKey = "eloGain" | "winStreak" | "games" | "wins" | "winRate" | "goals";
