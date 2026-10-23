"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { addComment, deleteComment } from "@/app/(app)/matches/actions";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Comment = { id: string; body: string; username: string; userId: string; ago: string };

export function Comments({ matchId, comments, userId }: { matchId: string; comments: Comment[]; userId: string }) {
  const [state, action, pending] = useActionState(addComment.bind(null, matchId), undefined);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) form.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      {comments.length === 0 && <p className="text-sm text-muted-foreground">No trash talk yet.</p>}
      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar username={c.username} size={28} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                <Link href={`/players/${c.username}`} className="font-medium text-foreground">
                  {c.username}
                </Link>
                <span>{c.ago}</span>
                {c.userId === userId && (
                  <button
                    type="button"
                    onClick={() => deleteComment(c.id, matchId)}
                    className="ml-auto hover:text-foreground"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <form ref={form} action={action} className="space-y-2">
        <Textarea name="body" placeholder="Write a comment…" maxLength={500} rows={2} required />
        {state?.error && <p className="text-sm text-loss">{state.error}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Posting…" : "Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
