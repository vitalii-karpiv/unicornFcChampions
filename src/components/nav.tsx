"use client";

import { CalendarDays, Coins, Home, Menu, Plus, Trophy } from "lucide-react";
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

/** Laptop header links (Log match has its own button). */
function headerItems(username: string) {
  return [
    { href: "/", label: "Home" },
    { href: "/month", label: "Month" },
    { href: "/records", label: "Records" },
    { href: `/players/${username}`, label: "Me" },
    { href: "/bets", label: "Bets" },
  ];
}

/** Phone tab bar. Bets takes Me's slot; Profile stays in the avatar menu. */
const TAB_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/month", label: "Month", icon: CalendarDays },
  { href: "/matches/new", label: "Log", icon: Plus, primary: true },
  { href: "/records", label: "Records", icon: Trophy },
  { href: "/bets", label: "Bets", icon: Coins },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header({ username }: { username: string }) {
  const pathname = usePathname();
  const items = headerItems(username);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span>🦄</span>
          <span className="hidden sm:inline">Unicorn FC</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {items.map((i) => (
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

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden">
      <div className="pointer-events-auto mx-auto grid h-14 max-w-sm grid-cols-5 rounded-full border bg-background/50 shadow-lg backdrop-blur-xl">
        {TAB_ITEMS.map(({ href, label, icon: Icon, primary }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex items-center justify-center text-muted-foreground transition-colors",
                active && "text-foreground",
              )}
            >
              {primary ? (
                <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
                  <Icon className="size-5" />
                </span>
              ) : (
                <Icon className="size-6" strokeWidth={active ? 2.5 : 1.75} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
