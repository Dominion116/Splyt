"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Camera, Loader2 } from "lucide-react";
import { FlowHeader } from "@/components/app/shell/FlowHeader";
import { ReviewEditor } from "@/components/app/review/ReviewEditor";
import { ForwardCTA } from "@/components/app/common/ForwardCTA";
import { ImagePicker } from "@/components/app/scan/ImagePicker";
import { getDraft, putDraft } from "@/lib/draft";
import { ApiRequestError, parseReceipt } from "@/lib/api";
import { compressForParse } from "@/lib/image";
import type { DraftSession, ParsedReceipt } from "@/lib/types";

interface Props {
  params: Promise<{ draftId: string }>;
}

export default function ReviewPage({ params }: Props) {
  const { draftId } = use(params);
  const router = useRouter();
  const [draft, setDraft] = useState<DraftSession | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRescan, setShowRescan] = useState(false);

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

  const handleChange = (next: ParsedReceipt) => {
    if (!draft) return;
    setDraft({ ...draft, receipt: next });
  };

  const handleContinue = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await putDraft(draft);
      router.push(`/app/members/${draftId}`);
    } finally {
      setSaving(false);
    }
  };

  if (missing) {
    return (
      <div className="flex flex-1 flex-col">
        <FlowHeader step="review" label="Step 2 of 4" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <p className="text-sm">This draft is gone.</p>
          <p className="text-xs text-muted-foreground">Start a fresh split from the scan screen.</p>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex flex-1 flex-col">
        <FlowHeader step="review" label="Step 2 of 4" />
        <div className="flex flex-1 items-center justify-center gap-2 px-5 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading draft…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <FlowHeader step="review" label="Step 2 of 4" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-6"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">Look right?</h1>
          <p className="text-sm text-muted-foreground">
            Tweak any item or total. We&apos;ll split whatever the total says.
          </p>
        </div>

        <ReviewEditor receipt={draft.receipt} onChange={handleChange} />

        <ForwardCTA label="Add members" onClick={handleContinue} busy={saving} />
      </motion.div>
    </div>
  );
}
