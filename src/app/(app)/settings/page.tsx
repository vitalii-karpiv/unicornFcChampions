import type { Metadata } from "next";
import { logout } from "@/app/(auth)/actions";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { logoutEverywhere } from "./actions";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border p-5">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user.username}</p>
      </div>
      <Section title="Appearance">
        <div className="flex items-center justify-between text-sm">
          Theme <ThemeToggle />
        </div>
      </Section>
      <Section title="Password">
        <ChangePasswordForm />
      </Section>
      <Section title="Sessions">
        <div className="flex flex-wrap gap-2">
          <form action={logout}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
          <form action={logoutEverywhere}>
            <Button type="submit" variant="destructive">
              Log out everywhere
            </Button>
          </form>
        </div>
      </Section>
    </div>
  );
}
