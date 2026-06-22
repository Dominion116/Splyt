"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { FileText, Receipt } from "lucide-react";
import { FlowHeader } from "@/components/app/shell/FlowHeader";
import { ImagePicker } from "@/components/app/scan/ImagePicker";
import { ApiRequestError, parseReceipt } from "@/lib/api";
import { compressForParse } from "@/lib/image";
import { putDraft } from "@/lib/draft";
import { useWallet } from "@/lib/wallet";
import { TemplateList } from "@/components/app/home/TemplateList";
import type { ParsedReceipt, SplitMode } from "@/lib/types";
import type { Address } from "viem";

export default function ScanPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManualEntry = async () => {
    if (busy) return;
    const draftId = crypto.randomUUID();
    const blankReceipt: ParsedReceipt = {
      items: [{ name: "Item 1", amount: "0.000000" }],
      subtotal: "0.000000",
      tax: "0.000000",
      total: "0.000000",
      currency: "cUSD"
    };
    await putDraft({
      id: draftId,
      receipt: blankReceipt,
      members: address ? [address] : [],
      mode: "equal",
      amounts: [],
      expiresInMinutes: 60,
      createdAt: Date.now()
    });
    router.push(`/app/review/${draftId}`);
  };

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const { base64, mimeType } = await compressForParse(file);
      const receipt = await parseReceipt(base64, mimeType);
      const draftId = crypto.randomUUID();
      await putDraft({
        id: draftId,
        receipt,
        members: address ? [address] : [],
        mode: "equal",
        amounts: [],
        expiresInMinutes: 60,
        createdAt: Date.now()
      });
      router.push(`/app/review/${draftId}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Couldn't read this receipt. Try a clearer photo.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <FlowHeader step="scan" label="Step 1 of 4" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex flex-1 flex-col gap-6 px-5 pt-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Receipt size={20} />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Snap a receipt</h1>
          <p className="text-sm text-muted-foreground">
            Take a clear photo and Splyt&apos;s AI will pull out the line items, totals, and tax. Or type
            the items in yourself.
          </p>
        </div>

        <ImagePicker busy={busy} onFile={handleFile} />

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        ) : null}

        <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
          <hr className="flex-1 border-border/40" />
          or
          <hr className="flex-1 border-border/40" />
        </div>

        <button
          type="button"
          onClick={handleManualEntry}
          disabled={busy}
          aria-label="Enter receipt manually"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border/40 bg-card px-4 py-2.5 text-xs text-muted-foreground transition hover:border-border hover:text-foreground disabled:opacity-50"
        >
          <FileText size={12} /> Enter manually
        </button>

        <p className="text-xs text-muted-foreground">
          We never store the photo. It&apos;s sent once to the parser, then dropped.
        </p>
      </motion.div>
    </div>
  );
}
