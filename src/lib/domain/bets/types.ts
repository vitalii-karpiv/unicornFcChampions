export type Side = "over" | "under";
export type GroupCond = "bigWin" | "highScore" | "draw" | "playerWin";
export type BetSpec =
  | { type: "winner"; a: string; b: string; pick: string /* userId | "draw" */ }
  | { type: "total"; a: string; b: string; line: number; side: Side }
  | { type: "margin"; a: string; b: string; winner: string; min: number; max: number | null }
  | { type: "score"; a: string; b: string; goalsA: number; goalsB: number } // goals of spec.a / spec.b
  | { type: "playerGoals"; a: string; b: string; player: string; line: number; side: Side }
  | { type: "streak3"; a: string; b: string; player: string }
  | { type: "group"; cond: GroupCond; player?: string; side: "yes" | "no" };
export type BetStatus = "open" | "won" | "lost" | "void" | "cancelled";
export type Settlement = { status: BetStatus; matchIds: string[]; at: Date | null };
export type BetRecord = {
  id: string;
  userId: string;
  spec: BetSpec;
  odds: number;
  stake: number;
  placedAt: Date;
  label: string;
  marketTitle: string;
  scope: string;
  /** Set when the player cancelled the bet while it was open; it then never settles. */
  cancelledAt?: Date | null;
};
export type FuturesPayout = { userId: string; month: string; amount: number }; // month = the predicted month
export type Wallet = {
  userId: string;
  balance: number;
  atStake: number;
  openCount: number;
  won: number;
  settled: number;
  monthNet: number;
};
