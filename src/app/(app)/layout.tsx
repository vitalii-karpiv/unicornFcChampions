import { Header, TabBar } from "@/components/nav";
import { SessionRefresher } from "@/components/session-refresher";
import { WhatsNew } from "@/components/whats-new/whats-new-dialog";
import { requireUser } from "@/lib/auth/session";
import { storyCards, unseenReleases } from "@/lib/releases";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const whatsNew = storyCards(unseenReleases(user.lastSeenRelease));
  return (
    <>
      <Header username={user.username} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12">{children}</main>
      <TabBar />
      <SessionRefresher needsRefresh={user.needsRefresh} />
      {whatsNew.length > 0 && <WhatsNew cards={whatsNew} />}
    </>
  );
}
