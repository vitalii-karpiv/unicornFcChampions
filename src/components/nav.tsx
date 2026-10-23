"use client";

import { CalendarDays, Home, Menu, Plus, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function useNavItems(username: string) {
  return [
    { href: "/", label: "Home", icon: Home },
    { href: "/month", label: "Month", icon: CalendarDays },
    { href: "/matches/new", label: "Log", icon: Plus, primary: true },
    { href: "/records", label: "Records", icon: Trophy },
    { href: `/players/${username}`, label: "Me", icon: User },
  ];
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header({ username }: { username: string }) {
  const pathname = usePathname();
  const items = useNavItems(username);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span>🦄</span>
          <span className="hidden sm:inline">Unicorn FC</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {items
            .filter((i) => !i.primary)
            .map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  isActive(pathname, i.href) && "text-foreground",
                )}
              >
                {i.label}
              </Link>
            ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/matches/new"
            className="hidden h-8 items-center gap-1 rounded-md bg-foreground px-3 text-sm font-medium text-background md:inline-flex"
          >
            <Plus className="size-4" /> Log match
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Menu"
            >
              <Avatar username={username} size={30} />
              <Menu className="size-4 text-muted-foreground md:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5 text-sm font-medium">{username}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={`/players/${username}`} />}>Profile</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/hall-of-fame" />}>Hall of Fame</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/activity" />}>Activity log</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                Theme <ThemeToggle />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function TabBar({ username }: { username: string }) {
  const pathname = usePathname();
  const items = useNavItems(username);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon, primary }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground",
              isActive(pathname, href) && "text-foreground",
            )}
          >
            {primary ? (
              <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
                <Icon className="size-5" />
              </span>
            ) : (
              <>
                <Icon className="size-5" />
                {label}
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
