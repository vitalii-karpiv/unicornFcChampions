"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Theme is only known on the client; avoid a hydration mismatch on the active button.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="inline-flex rounded-full border p-0.5" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mounted && theme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className={cn(
            "rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground",
            mounted && theme === value && "bg-muted text-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
