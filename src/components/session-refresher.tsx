"use client";

import { useEffect } from "react";
import { refreshSession } from "@/app/(app)/session-actions";

/** Sliding session: re-issue the cookie once a day while the user is active. */
export function SessionRefresher({ needsRefresh }: { needsRefresh: boolean }) {
  useEffect(() => {
    if (needsRefresh) void refreshSession();
  }, [needsRefresh]);
  return null;
}
