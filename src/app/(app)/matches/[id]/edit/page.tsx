import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MatchForm } from "@/components/match-form";
import { getMatch, getUsers } from "@/lib/data/queries";
import { isLockedDate, toKyivLocal } from "@/lib/domain/time";

export const metadata: Metadata = { title: "Edit match" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditMatchPage({ params }: PageProps<"/matches/[id]/edit">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [match, users] = await Promise.all([getMatch(id), getUsers()]);
  if (!match) notFound();
  if (isLockedDate(match.playedAt, new Date())) redirect(`/matches/${id}`);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">Edit match</h1>
      <MatchForm
        players={users}
        initial={{
          id,
          playerAId: match.playerAId,
          playerBId: match.playerBId,
          goalsA: match.goalsA,
          goalsB: match.goalsB,
          playedAt: toKyivLocal(match.playedAt),
        }}
      />
    </div>
  );
}
