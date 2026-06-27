"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { approveUSDmTx, getPublicClient, MAX_UINT256 } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";

interface Props {
  onApproved: () => void;
}

export function ApproveAction({ onApproved }: Props) {
  const { walletClient } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    if (!walletClient) {
      setError("Wallet not connected.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const txHash = await approveUSDmTx(walletClient, MAX_UINT256);
      await getPublicClient().waitForTransactionReceipt({ hash: txHash });
      onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval rejected.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={approve}
        disabled={busy}
        className="flex h-11 items-center justify-between gap-3 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck size={16} />
          {busy ? "Approving USDm…" : "Approve USDm (one-time)"}
        </span>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <span className="text-xs opacity-70">Step 1 of 2</span>}
      </button>
      <p className="text-xs text-muted-foreground">
        Allows Splyt to move your USDm when you confirm payment. You approve once per wallet.
      </p>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
