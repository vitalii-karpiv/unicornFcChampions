import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { formatAwardValue } from "@/components/awards-table";
import { ensureFrozenMonths, getFrozenMonths } from "@/lib/awards/freeze";
import { getUsers } from "@/lib/data/queries";
import { AWARDS } from "@/lib/domain/awards";
import { formatMonth } from "@/lib/format";
import { nameOf, userMap } from "@/lib/users";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Hall of Fame" };

export default async function HallOfFamePage() {
  await requireUser();
  await ensureFrozenMonths();
  const [months, users] = await Promise.all([getFrozenMonths(), getUsers()]);
  const names = userMap(users);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Hall of Fame</h1>
      {months.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          The first month hasn&apos;t finished yet.
        </div>
      )}
      {months.map((m) => {
        const potm = m.playerOfMonth ? nameOf(names, m.playerOfMonth.userId) : null;
        return (
          <Link key={m.month} href={`/month/${m.month}`} className="block rounded-xl border bg-card p-5 hover:border-foreground/20">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{formatMonth(m.month)}</h2>
              {potm && (
                <span className="flex items-center gap-2 text-sm">
                  👑 <Avatar username={potm} size={22} /> <span className="font-semibold">{potm}</span>
                </span>
              )}
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {AWARDS.map((a) => {
                const w = m.awards[a.key];
                return (
                  <li key={a.key} className="flex items-center gap-2 text-muted-foreground">
                    <span>{a.emoji}</span>
                    <span className="flex-1 truncate">{a.label}</span>
                    {w ? (
                      <span className="text-foreground">
                        {nameOf(names, w.userId)}{" "}
                        <span className="tabular font-mono text-xs text-muted-foreground">{formatAwardValue(a.key, w.value)}</span>
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Link>
        );
      })}
    </div>
  );
}
