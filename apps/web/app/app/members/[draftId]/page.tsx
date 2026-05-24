"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { FlowHeader } from "@/components/app/shell/FlowHeader";
import { MembersEditor } from "@/components/app/members/MembersEditor";
import { ForwardCTA } from "@/components/app/common/ForwardCTA";
import { getDraft, putDraft } from "@/lib/draft";
import { useWallet } from "@/lib/wallet";
import type { Address, DraftSession } from "@/lib/types";

interface Props {
  params: Promise<{ draftId: string }>;
}

export default function MembersPage({ params }: Props) {
  const { draftId } = use(params);
  const router = useRouter();
  const { address } = useWallet();
  const [draft, setDraft] = useState<DraftSession | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleChange = (next: Address[]) => {
    if (!draft) return;
    setDraft({ ...draft, members: next });
  };

  const handleContinue = async () => {
    if (!draft || draft.members.length === 0) return;
    setSaving(true);
    try {
      await putDraft(draft);
      router.push(`/app/split/${draftId}`);
    } finally {
      setSaving(false);
    }
  };

  if (missing) {
    return (
      <div className="flex flex-1 flex-col">
        <FlowHeader step="members" label="Step 3 of 4" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <p className="text-sm">This draft is gone.</p>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex flex-1 flex-col">
        <FlowHeader step="members" label="Step 3 of 4" />
        <div className="flex flex-1 items-center justify-center gap-2 px-5 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading draft…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <FlowHeader step="members" label="Step 3 of 4" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-6"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">Who&apos;s splitting?</h1>
          <p className="text-sm text-muted-foreground">
            Add each person&apos;s wallet address. They&apos;ll pay from their own wallet via the
            link you share.
          </p>
        </div>

        <MembersEditor
          members={draft.members}
          hostAddress={(address as Address | null) ?? null}
          onChange={handleChange}
        />

        <ForwardCTA
          label={draft.members.length === 0 ? "Add at least one member" : "Choose split"}
          onClick={handleContinue}
          disabled={draft.members.length === 0}
          busy={saving}
        />
      </motion.div>
    </div>
  );
}
