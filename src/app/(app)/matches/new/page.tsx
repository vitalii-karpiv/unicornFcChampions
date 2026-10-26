import type { Metadata } from "next";
import { MatchForm } from "@/components/match-form";
import { requireUser } from "@/lib/auth/session";
import { getRatedMatches, getUsers } from "@/lib/data/queries";
import { buildLeaderboard } from "@/lib/domain/leaderboard";
import { playerResults } from "@/lib/domain/results";
import { toKyivLocal } from "@/lib/domain/time";

export const metadata: Metadata = { title: "Log match" };

export default async function NewMatchPage() {
  const user = await requireUser();
  const [users, matches] = await Promise.all([getUsers(), getRatedMatches()]);
  const others = users.filter((u) => u.id !== user.id);
  // Preselect the last opponent (or the only other player) to make logging one tap.
  const lastOpponent = playerResults(matches, user.id).at(-1)?.opponentId ?? (others.length === 1 ? others[0].id : "");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">Log match</h1>
      {others.length === 0 ? (
        <p className="text-sm text-muted-foreground">You need at least one friend to sign up before logging a match.</p>
      ) : (
        <MatchForm
          players={users}
          ratings={Object.fromEntries(
            buildLeaderboard(matches, users).map((r) => [r.userId, { elo: r.elo, games: r.games }]),
          )}
          initial={{ playerAId: user.id, playerBId: lastOpponent, goalsA: 0, goalsB: 0, playedAt: toKyivLocal(new Date()) }}
        />
      )}
    </div>
  );
}
