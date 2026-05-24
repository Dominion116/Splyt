"use client";

import { Loader2, Wallet } from "lucide-react";
import { useState } from "react";
import { ApiRequestError, confirmMemberPayment } from "@/lib/api";
import { getPublicClient, markPaidTx } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";
import type { Address } from "@/lib/types";

type Stage = "idle" | "signing" | "mining" | "confirming";

interface Props {
  sessionId: string;
  member: Address;
  step: 1 | 2;
  onPaid: (txHash: string) => void;
}

export function PayAction({ sessionId, member, step, onPaid }: Props) {
  const { provider } = useWallet();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = stage !== "idle";

  const submit = async () => {
    if (!provider) {
      setError("Wallet not connected.");
      return;
    }
    setError(null);
    setStage("signing");
    let txHash: `0x${string}`;
    try {
      txHash = await markPaidTx(provider, member, sessionId);
    } catch (err) {
      setStage("idle");
      setError(err instanceof Error ? err.message : "Payment rejected.");
      return;
    }

    setStage("mining");
    try {
      await getPublicClient().waitForTransactionReceipt({ hash: txHash });
    } catch (err) {
      setStage("idle");
      setError(err instanceof Error ? err.message : "Transaction did not confirm.");
      return;
    }

    setStage("confirming");
    try {
      await confirmMemberPayment(sessionId, member, txHash);
    } catch (err) {
      setStage("idle");
      if (err instanceof ApiRequestError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Couldn't verify payment.");
      return;
    }

    onPaid(txHash);
    setStage("idle");
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="flex h-11 items-center justify-between gap-3 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        <span className="flex items-center gap-2">
          <Wallet size={16} />
          {stage === "signing"
            ? "Confirm in wallet…"
            : stage === "mining"
              ? "Settling on-chain…"
              : stage === "confirming"
                ? "Verifying…"
                : "Pay my share"}
        </span>
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <span className="text-xs opacity-70">Step {step} of {step}</span>
        )}
      </button>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
