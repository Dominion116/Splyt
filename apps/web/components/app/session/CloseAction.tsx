"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiRequestError, closeSession } from "@/lib/api";
import { closeSessionTx, getPublicClient } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";
import type { Address } from "@/lib/types";

interface Props {
  sessionId: string;
  host: Address;
  onClosed: () => void;
}

export function CloseAction({ sessionId, host, onClosed }: Props) {
  const { address, walletClient } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHost = address?.toLowerCase() === host.toLowerCase();

  const close = async () => {
    if (!walletClient || !address) {
      setError("Connect the host wallet to close.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const txHash = await closeSessionTx(walletClient, sessionId);
      await getPublicClient().waitForTransactionReceipt({ hash: txHash });
      await closeSession(sessionId, txHash);
      onClosed();
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Couldn't close session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={close}
        disabled={!isHost || busy}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : null}
        {isHost ? "Close & collect" : "Only the host can close"}
      </button>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
