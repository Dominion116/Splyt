"use client";

import Link from "next/link";
import { ClipboardList, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteDraft, listDrafts } from "@/lib/draft";
import { formatCUSD, formatRelativeTime, microsFromDecimalString } from "@/lib/format";
import type { DraftSession } from "@/lib/types";

export function DraftRecoveryList() {
  const [drafts, setDrafts] = useState<DraftSession[] | null>(null);

  useEffect(() => {
    listDrafts()
      .then((all) => setDrafts(all.sort((a, b) => b.createdAt - a.createdAt)))
      .catch(() => setDrafts([]));
  }, []);

  if (!drafts || drafts.length === 0) return null;

  const remove = async (id: string) => {
    await deleteDraft(id).catch(() => {});
    setDrafts((prev) => prev?.filter((d) => d.id !== id) ?? []);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">Saved drafts</span>
      <ul className="flex flex-col gap-2">
        {drafts.map((draft) => (
          <li
            key={draft.id}
            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-4"
          >
            <Link
              href={`/app/review/${draft.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <ClipboardList size={14} className="shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">
                  {formatCUSD(microsFromDecimalString(draft.receipt.total))}
                </span>
                <span className="text-xs text-muted-foreground">
                  {draft.members.length} member{draft.members.length !== 1 ? "s" : ""} ·{" "}
                  {formatRelativeTime(draft.createdAt)}
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => remove(draft.id)}
              aria-label="Delete draft"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
