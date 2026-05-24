"use client";

import { use, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { FlowHeader } from "@/components/app/shell/FlowHeader";
import { SplitEditor } from "@/components/app/split/SplitEditor";
import { CreateSheet } from "@/components/app/split/CreateSheet";
import { ForwardCTA } from "@/components/app/common/ForwardCTA";
import { ConnectSheet } from "@/components/app/wallet/ConnectSheet";
import { getDraft, putDraft } from "@/lib/draft";
import { useWallet } from "@/lib/wallet";
import { microsFromDecimalString } from "@/lib/format";
import type { DraftSession } from "@/lib/types";

interface Props {
  params: Promise<{ draftId: string }>;
}

export default function SplitPage({ params }: Props) {
  const { draftId } = use(params);
  const { address } = useWallet();
  const [draft, setDraft] = useState<DraftSession | null>(null);
  const [missing, setMissing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDraft(draftId).then((result) => {
      if (cancelled) return;
      if (!result) setMissing(true);
      else setDraft(result);
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  // Persist draft edits as the user adjusts mode/amounts/expiry.
  useEffect(() => {
    if (!draft) return;
    const handle = setTimeout(() => {
      putDraft(draft).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [draft]);

  if (missing) {
    return (
      <div className="flex flex-1 flex-col">
        <FlowHeader step="split" label="Step 4 of 4" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <p className="text-sm">This draft is gone.</p>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex flex-1 flex-col">
        <FlowHeader step="split" label="Step 4 of 4" />
        <div className="flex flex-1 items-center justify-center gap-2 px-5 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading draft…
        </div>
      </div>
    );
  }

  const canCreate = (() => {
    if (!address) return false;
    if (draft.members.length === 0) return false;
    if (draft.mode !== "custom") return true;
    const total = microsFromDecimalString(draft.receipt.total);
    let sum = 0n;
    if (draft.amounts.length !== draft.members.length) return false;
    for (const value of draft.amounts) {
      sum += microsFromDecimalString(value || "0.000000");
    }
    return sum === total;
  })();

  return (
    <div className="flex flex-1 flex-col">
      <FlowHeader step="split" label="Step 4 of 4" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-6"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">Split the bill</h1>
          <p className="text-sm text-muted-foreground">
            Choose how to divide it and how long members have to pay.
          </p>
        </div>

        {address ? null : <ConnectSheet />}

        <SplitEditor draft={draft} onChange={setDraft} />

        <ForwardCTA
          label={
            !address
              ? "Connect wallet to continue"
              : draft.members.length === 0
                ? "Add a member first"
                : !canCreate
                  ? "Adjust amounts"
                  : "Sign & create"
          }
          onClick={() => setCreateOpen(true)}
          disabled={!canCreate}
        />
      </motion.div>

      <CreateSheet draft={draft} open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
