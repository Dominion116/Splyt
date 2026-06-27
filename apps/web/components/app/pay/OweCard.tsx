"use client";

import { Countdown } from "@/components/app/common/Countdown";
import { formatUSDm } from "@/lib/format";

interface Props {
  amountMicros: string;
  total: string;
  expiresAt: number;
  paidCount: number;
  memberCount: number;
}

export function OweCard({ amountMicros, total, expiresAt, paidCount, memberCount }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">You owe</span>
        <Countdown expiresAt={expiresAt} />
      </div>
      <span className="font-serif text-5xl italic tracking-tight">{formatUSDm(amountMicros)}</span>
      <span className="text-xs text-muted-foreground">
        of {formatUSDm(total)} bill · {paidCount}/{memberCount} paid
      </span>
    </div>
  );
}
