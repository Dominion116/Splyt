"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ApiRequestError, getMemberPrice, getSession } from "@/lib/api";
import { ConnectSheet } from "@/components/app/wallet/ConnectSheet";
import { OweCard } from "@/components/app/pay/OweCard";
import { ApproveAction } from "@/components/app/pay/ApproveAction";
import { PayAction } from "@/components/app/pay/PayAction";
import { TerminalState } from "@/components/app/pay/TerminalState";
import { getCusdAllowance, microsToWei } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";
import { shortAddress } from "@/lib/format";
import type { Address, SessionDetail } from "@/lib/types";

type Phase =
  | { kind: "loading" }
  | { kind: "expired" }
  | { kind: "already-paid" }
  | { kind: "settled" }
  | { kind: "needs-approve"; amountMicros: string }
  | { kind: "ready-to-pay"; amountMicros: string; allowanceSufficient: boolean }
  | { kind: "paid"; amountMicros: string; txHash: string }
  | { kind: "error"; message: string };

interface Props {
  params: Promise<{ id: string; member: string }>;
}

export default function PayPage({ params }: Props) {
  const { id, member: memberParam } = use(params);
  const member = memberParam as Address;
  const { address, connect, hasProvider, connecting } = useWallet();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [neededApproval, setNeededApproval] = useState(false);

  const matchesMember = address?.toLowerCase() === member.toLowerCase();

  const refreshPrice = useCallback(async () => {
    if (!matchesMember) return;
    try {
      const price = await getMemberPrice(id, member);
      const amountWei = microsToWei(BigInt(price.price));
      const allowance = await getCusdAllowance(member);
      if (allowance >= amountWei) {
        setPhase({ kind: "ready-to-pay", amountMicros: price.price, allowanceSufficient: true });
      } else {
        setNeededApproval(true);
        setPhase({ kind: "needs-approve", amountMicros: price.price });
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 410) setPhase({ kind: "expired" });
        else if (err.status === 409) setPhase({ kind: "already-paid" });
        else setPhase({ kind: "error", message: err.message });
      } else {
        setPhase({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load this split." });
      }
    }
  }, [id, member, matchesMember]);

  // Always load session metadata (works without wallet) for context.
  useEffect(() => {
    let cancelled = false;
    getSession(id)
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        if (data.closeTxHash) setPhase({ kind: "settled" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError) {
          setPhase({ kind: "error", message: err.message });
        } else {
          setPhase({ kind: "error", message: "Couldn't load this split." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!matchesMember || !session || session.closeTxHash) return;
    setPhase({ kind: "loading" });
    refreshPrice();
  }, [matchesMember, session, refreshPrice]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/80 px-5 py-4 backdrop-blur-lg">
        <Link
          href="/app"
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={16} />
        </Link>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Pay your share</span>
        <span className="h-9 w-9" aria-hidden />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6"
      >
        {!address ? (
          <ConnectPrompt member={member} onConnect={connect} hasProvider={hasProvider} connecting={connecting} />
        ) : !matchesMember ? (
          <WalletMismatch expected={member} actual={address as Address} />
        ) : (
          renderPhase({
            phase,
            session,
            sessionId: id,
            member,
            payStep: neededApproval ? 2 : 1,
            onApproved: refreshPrice,
            onPaid: (txHash) =>
              setPhase((prev) =>
                prev.kind === "ready-to-pay" || prev.kind === "needs-approve"
                  ? { kind: "paid", amountMicros: prev.amountMicros, txHash }
                  : prev
              )
          })
        )}
      </motion.div>
    </div>
  );
}

function renderPhase(args: {
  phase: Phase;
  session: SessionDetail | null;
  sessionId: string;
  member: Address;
  payStep: 1 | 2;
  onApproved: () => void;
  onPaid: (txHash: string) => void;
}) {
  const { phase, session, sessionId, member, payStep, onApproved, onPaid } = args;
  if (!session) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Loading split…
      </div>
    );
  }

  if (phase.kind === "settled") return <TerminalState kind="settled" />;
  if (phase.kind === "expired") return <TerminalState kind="expired" />;
  if (phase.kind === "already-paid")
    return (
      <TerminalState
        kind="paid"
        amountMicros={
          session.members.find((m) => m.address.toLowerCase() === member.toLowerCase())?.amount
        }
        txHash={
          session.members.find((m) => m.address.toLowerCase() === member.toLowerCase())
            ?.paymentTxHash
        }
      />
    );

  if (phase.kind === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Reading your share…
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{phase.message}</p>
    );
  }

  if (phase.kind === "paid") {
    return <TerminalState kind="paid" amountMicros={phase.amountMicros} txHash={phase.txHash} />;
  }

  const paidCount = session.members.filter((m) => m.paid).length;

  return (
    <>
      <OweCard
        amountMicros={phase.amountMicros}
        total={session.total}
        expiresAt={session.expiresAt}
        paidCount={paidCount}
        memberCount={session.members.length}
      />
      {phase.kind === "needs-approve" ? (
        <ApproveAction onApproved={onApproved} />
      ) : (
        <PayAction sessionId={sessionId} member={member} step={payStep} onPaid={onPaid} />
      )}
      <p className="text-xs text-muted-foreground">
        Your wallet sends cUSD directly to the Splyt contract. The host can&apos;t collect until everyone pays.
      </p>
    </>
  );
}

function ConnectPrompt({
  member,
  onConnect,
  hasProvider,
  connecting
}: {
  member: Address;
  onConnect: () => void;
  hasProvider: boolean;
  connecting: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl border border-border/40 bg-card p-4 text-sm">
        This payment link is for{" "}
        <span className="font-mono text-xs">{shortAddress(member)}</span>. Connect that wallet to
        continue.
      </p>
      <ConnectSheet />
      <button
        type="button"
        onClick={onConnect}
        disabled={!hasProvider || connecting}
        className="rounded-full border border-border/60 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-60"
      >
        {connecting ? "Opening wallet…" : "Already a wallet user? Tap to connect."}
      </button>
    </div>
  );
}

function WalletMismatch({ expected, actual }: { expected: Address; actual: Address }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
      <h2 className="text-lg font-medium">Wrong wallet</h2>
      <p className="text-sm">
        This payment link is meant for{" "}
        <span className="font-mono text-xs">{shortAddress(expected)}</span>, but you&apos;re
        connected as <span className="font-mono text-xs">{shortAddress(actual)}</span>. Switch
        wallets in your browser/MiniPay and reload.
      </p>
    </div>
  );
}
