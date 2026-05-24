"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Address } from "@/lib/types";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AddressPill({
  address,
  className
}: {
  address: Address;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-xs text-muted-foreground transition hover:text-foreground",
        className
      )}
      aria-label={`Copy address ${address}`}
    >
      <span>{shortAddress(address)}</span>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}
