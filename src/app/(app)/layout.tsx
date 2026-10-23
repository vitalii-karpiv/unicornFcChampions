import { Header, TabBar } from "@/components/nav";
import { SessionRefresher } from "@/components/session-refresher";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Header username={user.username} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 md:pb-12">{children}</main>
      <TabBar username={user.username} />
      <SessionRefresher needsRefresh={user.needsRefresh} />
    </>
  );
}
