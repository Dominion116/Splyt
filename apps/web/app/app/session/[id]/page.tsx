"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Check, Loader2, Share2, Receipt } from "lucide-react";
import { ApiRequestError, getSession } from "@/lib/api";
import { useSessionStream } from "@/lib/sse";
import { Countdown } from "@/components/app/common/Countdown";
import { ExpiryBanner } from "@/components/app/common/ExpiryBanner";
import { MemberStatusList } from "@/components/app/session/MemberStatusList";
import { CloseAction } from "@/components/app/session/CloseAction";
import { formatCUSD } from "@/lib/format";
import type { Address, LiveMember, SessionDetail } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function SessionRoomPage({ params }: Props) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = useSessionStream(id);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSession(id)
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError) setError(err.message);
        else setError("Couldn't load session.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const members: LiveMember[] | null = useMemo(() => {
    if (live.data) return live.data.members;
    if (!session) return null;
    return session.members.map((member) => ({
      address: member.address as Address,
      amountDue: member.amount,
      paid: member.paid,
      paidAt: member.paidAt
    }));
  }, [live.data, session]);

  const allPaid = useMemo(() => {
    if (live.data) return live.data.allPaid;
    if (!session) return false;
    return session.allPaid;
  }, [live.data, session]);

  if (error && !session) {
    return (
      <div className="flex flex-1 flex-col px-5 pt-6">
        <Link
          href="/app"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground"
        >
          <ArrowLeft size={16} />
        </Link>
        <p className="mt-6 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 px-5 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Loading split…
      </div>
    );
  }

  const settled = Boolean(session.closeTxHash);
  const link = `${origin}/app/session/${id}`;

  const shareSummary = async () => {
    const memberCount = members?.length ?? session.members.length;
    const paidCount = members?.filter((m) => m.paid).length ?? memberCount;
    const text = [
      `Splyt · ${formatCUSD(session.total)}`,
      `${paidCount}/${memberCount} member${memberCount !== 1 ? "s" : ""} · all paid ✓`,
      "Settled on Celo",
      link
    ].join("\n");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Splyt summary", text });
        return;
      } catch {
        // User cancelled or share not supported — fall through to clipboard.
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard write denied — silently ignore.
      }
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Split bill", url: link });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(link);
    } catch {}
  };

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
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Split</span>
        <button
          type="button"
          aria-label="Share"
          onClick={share}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground transition hover:text-foreground"
        >
          <Share2 size={16} />
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6"
      >
        <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
            <Countdown expiresAt={session.expiresAt} />
          </div>
          <span className="font-serif text-4xl italic tracking-tight">
            {formatCUSD(session.total)}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LiveDot connected={live.connected} />
            {settled
              ? "Settled"
              : allPaid
                ? "All paid — ready to close"
                : `${members?.filter((m) => m.paid).length ?? 0}/${members?.length ?? 0} paid`}
          </div>
        </div>

        {!settled ? <ExpiryBanner expiresAt={session.expiresAt} /> : null}

        {members ? (
          <MemberStatusList members={members} sessionId={id} origin={origin} />
        ) : null}

        {settled ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
              <Check size={14} /> Settled. Funds were transferred to the host.
            </div>
            <button
              type="button"
              onClick={shareSummary}
              aria-label="Share session summary"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border/40 bg-card px-4 py-2.5 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
            >
              <Receipt size={12} /> Share summary
            </button>
          </div>
        ) : allPaid ? (
          <CloseAction
            sessionId={id}
            host={session.host as Address}
            onClosed={() => {
              getSession(id)
                .then(setSession)
                .catch(() => {});
            }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full rounded-full ${
          connected ? "bg-primary/70 animate-ping" : "bg-muted-foreground/40"
        }`}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          connected ? "bg-primary" : "bg-muted-foreground"
        }`}
      />
    </span>
  );
}
