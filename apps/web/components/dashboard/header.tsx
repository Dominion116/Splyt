"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useDashboardWallet } from "./use-wallet";

export function DashboardHeader({ title }: { title: string }) {
  const { address, truncatedAddress } = useDashboardWallet();
  const connected = Boolean(address);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="flex h-full items-center justify-between gap-3 px-5">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-base">splyt</span>
        </Link>

        {title ? (
          <span className="truncate text-xs font-medium text-muted-foreground" aria-live="polite">
            {title}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}

        <span
          className="flex max-w-[150px] items-center gap-1.5 truncate rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-foreground"
          title={connected ? address : "Wallet not connected"}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-success" : "bg-muted-foreground/50"}`}
          />
          <span className="truncate">{truncatedAddress}</span>
        </span>
      </div>
    </header>
  );
}
