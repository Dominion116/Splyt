"use client";

import Link from "next/link";
import { CheckCircle2, CircleX, Timer } from "lucide-react";
import { formatCUSD } from "@/lib/format";

type Kind = "paid" | "expired" | "settled";

interface Props {
  kind: Kind;
  amountMicros?: string;
  txHash?: string | null;
}

const COPY: Record<Kind, { title: string; body: string; tone: "primary" | "muted" | "destructive" }> = {
  paid: {
    title: "You're settled",
    body: "Your share is on-chain. The host gets everyone's funds once all members pay.",
    tone: "primary"
  },
  settled: {
    title: "Bill closed",
    body: "All members paid and the host has collected. Nothing left to do.",
    tone: "primary"
  },
  expired: {
    title: "This split expired",
    body: "The host needs to start a new one. Payments are blocked once the timer runs out.",
    tone: "destructive"
  }
};

export function TerminalState({ kind, amountMicros, txHash }: Props) {
  const copy = COPY[kind];
  const Icon = kind === "expired" ? CircleX : kind === "settled" ? Timer : CheckCircle2;
  const accent =
    copy.tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary"
      : copy.tone === "destructive"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border/40 bg-card text-muted-foreground";

  return (
    <div className={`flex flex-col items-start gap-3 rounded-2xl border p-5 ${accent}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/40">
        <Icon size={20} />
      </div>
      <h2 className="text-xl font-medium tracking-tight">{copy.title}</h2>
      <p className="text-sm">
        {copy.body}
        {amountMicros ? (
          <span className="ml-1 font-mono">
            ({formatCUSD(amountMicros)} settled)
          </span>
        ) : null}
      </p>
      {txHash ? (
        <a
          href={`https://celoscan.io/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline underline-offset-2"
        >
          View transaction
        </a>
      ) : null}
      <Link
        href="/app"
        className="mt-1 inline-flex items-center rounded-full border border-current px-3 py-1.5 text-xs"
      >
        Back to Splyt
      </Link>
    </div>
  );
}
