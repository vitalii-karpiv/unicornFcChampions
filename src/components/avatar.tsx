import { cn } from "@/lib/utils";
import { avatarColor } from "@/lib/domain/avatar-color";

export function Avatar({ username, size = 28, className }: { username: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.45, background: avatarColor(username) }}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
