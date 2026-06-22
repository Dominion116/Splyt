"use client";

import { Check, Loader2, X } from "lucide-react";
import { motion } from "motion/react";
import { ApiRequestError, createSession } from "@/lib/api";
import { createSessionTx, signHostMessage } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { computeSplit, computeItemisedSplit } from "@/lib/split";
import { microsFromDecimalString, microsToDecimalString } from "@/lib/format";
import type { Address, DraftSession } from "@/lib/types";
import { deleteDraft } from "@/lib/draft";
import { getPublicClient } from "@/lib/chain";
import { saveTemplate } from "@/lib/templates";

type Stage = "sign" | "tx" | "register";
type Status = "pending" | "active" | "done" | "error";

interface Props {
  draft: DraftSession;
  open: boolean;
  onClose: () => void;
}

export function CreateSheet({ draft, open, onClose }: Props) {
  const router = useRouter();
  const { address, walletClient } = useWallet();
  const [stage, setStage] = useState<Stage>("sign");
  const [statusMap, setStatusMap] = useState<Record<Stage, Status>>({
    sign: "active",
    tx: "pending",
    register: "pending"
  });
  const [error, setError] = useState<string | null>(null);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");

  const handleSaveTemplate = async () => {
    await saveTemplate({
      id: crypto.randomUUID(),
      name: templateName.trim() || "My template",
      members: draft.members,
      mode: draft.mode,
      createdAt: Date.now()
    }).catch(() => {});
    router.push(`/app/session/${createdSessionId}`);
  };

  const handleSkipTemplate = () => {
    router.push(`/app/session/${createdSessionId}`);
  };

  if (!open) return null;

  const start = async () => {
    if (!address || !walletClient) {
      setStatusMap((prev) => ({ ...prev, sign: "error" }));
      setError("Wallet not connected.");
      return;
    }
    setError(null);
    setStage("sign");
    setStatusMap({ sign: "active", tx: "pending", register: "pending" });

    // Track stage locally so async continuations always mark the correct step.
    let current: Stage = "sign";

    const advance = (next: Stage) => {
      setStatusMap((prev) => ({ ...prev, [current]: "done", [next]: "active" }));
      current = next;
      setStage(next);
    };

    const fail = (message: string) => {
      setStatusMap((prev) => ({ ...prev, [current]: "error" }));
      setError(message);
    };

    const sessionId = crypto.randomUUID();
    let amountsMicros: bigint[];
    try {
      if (draft.mode === "custom") {
        amountsMicros = draft.amounts.map((value) => microsFromDecimalString(value || "0.000000"));
        const total = amountsMicros.reduce((acc, current) => acc + current, 0n);
        if (total !== microsFromDecimalString(draft.receipt.total)) {
          fail("Custom amounts must sum to the total.");
          return;
        }
      } else if (draft.mode === "itemised") {
        const computed = computeItemisedSplit(draft.receipt, draft.members, draft.assignments ?? {});
        amountsMicros = draft.members.map((member) => computed.get(member) ?? 0n);
      } else {
        const computed = computeSplit(draft.receipt, draft.members, "equal");
        amountsMicros = draft.members.map((member) => computed.get(member) ?? 0n);
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : "Couldn't compute split.");
      return;
    }

    const expiresAt = Date.now() + draft.expiresInMinutes * 60_000;

    let signature: `0x${string}`;
    try {
      signature = await signHostMessage(walletClient, sessionId);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Signature rejected.");
      return;
    }
    advance("tx");

    let txHash: `0x${string}`;
    try {
      txHash = await createSessionTx(walletClient, {
        sessionId,
        members: draft.members,
        amountsMicros,
        expiresAt
      });
    } catch (err) {
      fail(err instanceof Error ? err.message : "Transaction rejected.");
      return;
    }

    try {
      await getPublicClient().waitForTransactionReceipt({ hash: txHash });
    } catch (err) {
      fail(err instanceof Error ? err.message : "Transaction did not confirm.");
      return;
    }
    advance("register");

    try {
      await createSession({
        sessionId,
        host: address as Address,
        hostSignature: signature,
        txHash,
        members: draft.members,
        amounts: amountsMicros.map(String),
        mode: draft.mode,
        receipt: draft.receipt,
        expiresInMinutes: draft.expiresInMinutes
      });
    } catch (err) {
      if (err instanceof ApiRequestError) fail(err.message);
      else fail(err instanceof Error ? err.message : "Couldn't register session.");
      return;
    }

    setStatusMap((prev) => ({ ...prev, register: "done" }));
    await deleteDraft(draft.id).catch(() => {});
    setCreatedSessionId(sessionId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex w-full max-w-[420px] flex-col gap-5 rounded-2xl border border-border/40 bg-card p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">Create split</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-muted-foreground transition hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        <ol className="flex flex-col gap-3">
          <StageRow status={statusMap.sign} title="Sign host message" hint="Confirm ownership of the host wallet" />
          <StageRow
            status={statusMap.tx}
            title="Create session on-chain"
            hint="Sends a Celo transaction from your wallet"
          />
          <StageRow status={statusMap.register} title="Register with Splyt" hint="Links the session to your account" />
        </ol>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        ) : null}

        {createdSessionId ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-background p-4">
            <p className="text-sm font-medium">Save as template?</p>
            <p className="text-xs text-muted-foreground">Store the member list and split mode for future splits.</p>
            <input
              type="text"
              placeholder="Template name (optional)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="rounded-xl border border-border/40 bg-card px-3 py-2 text-sm outline-none focus:border-border"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Save &amp; continue
              </button>
              <button
                type="button"
                onClick={handleSkipTemplate}
                className="flex flex-1 items-center justify-center rounded-full border border-border/40 px-4 py-2 text-xs text-muted-foreground transition hover:text-foreground"
              >
                Skip
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={statusMap.sign === "active" && stage !== "sign"}
            className="flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {error ? "Retry" : "Start"}
          </button>
        )}
      </motion.div>
    </div>
  );
}

function StageRow({ status, title, hint }: { status: Status; title: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background p-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          status === "done"
            ? "bg-primary/10 text-primary"
            : status === "active"
              ? "bg-muted text-foreground"
              : status === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
        }`}
      >
        {status === "active" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : status === "done" ? (
          <Check size={14} />
        ) : status === "error" ? (
          <X size={14} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    </li>
  );
}
