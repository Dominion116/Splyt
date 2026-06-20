"use client";

import Link from "next/link";
import { ClipboardList, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { deleteDraft, listDrafts, purgeOldDrafts } from "@/lib/draft";
import { formatCUSD, formatRelativeTime, microsFromDecimalString } from "@/lib/format";
import type { DraftSession } from "@/lib/types";

export function DraftRecoveryList() {
  const [mounted, setMounted] = useState(false);
  const [drafts, setDrafts] = useState<DraftSession[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const PREVIEW_LIMIT = 3;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    purgeOldDrafts(7)
      .catch(() => {})
      .finally(() => {
        listDrafts()
          .then((all) =>
            setDrafts(
              all
                .filter((d) => d.id && d.receipt?.total)
                .sort((a, b) => b.createdAt - a.createdAt)
            )
          )
          .catch(() => setDrafts([]));
      });
  }, [mounted]);

  if (!drafts || drafts.length === 0) return null;

  const remove = async (id: string) => {
    await deleteDraft(id).catch(() => {});
    setDrafts((prev) => prev?.filter((d) => d.id !== id) ?? []);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-2"
    >
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        Saved drafts ({drafts.length})
      </span>
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
        {(showAll ? drafts : drafts.slice(0, PREVIEW_LIMIT)).map((draft) => (
          <motion.li
            key={draft.id}
            initial={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 overflow-hidden rounded-2xl border border-border/40 bg-card p-4"
          >
            <Link
              href={`/app/review/${draft.id}`}
              aria-label={`Resume draft — ${formatCUSD(microsFromDecimalString(draft.receipt.total))}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <ClipboardList size={14} className="shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCUSD(microsFromDecimalString(draft.receipt.total))}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {draft.mode}
                  </span>
                </div>
                {draft.receipt.items[0]?.name ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {draft.receipt.items[0].name}
                    {draft.receipt.items.length > 1 ? ` +${draft.receipt.items.length - 1} more` : ""}
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {draft.members.length === 0
                    ? "No members added"
                    : `${draft.members.length} member${draft.members.length !== 1 ? "s" : ""}`}{" "}
                  · {draft.receipt.items.length} item{draft.receipt.items.length !== 1 ? "s" : ""} ·{" "}
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
          </motion.li>
        ))}
        </AnimatePresence>
      </ul>
      {drafts.length > PREVIEW_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start text-xs text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
        >
          {showAll ? "Show less" : `Show ${drafts.length - PREVIEW_LIMIT} more`}
        </button>
      )}
    </motion.div>
  );
}
