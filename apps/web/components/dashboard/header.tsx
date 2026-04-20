"use client";

import { useDashboardWallet } from "./use-wallet";

export function DashboardHeader({ title }: { title: string }) {
  const { truncatedAddress } = useDashboardWallet();

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4">
        <span className="font-mono text-lg font-semibold tracking-tight text-indigo-400">splyt</span>
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">{title}</span>
        <span className="max-w-[140px] truncate rounded-md bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-300">{truncatedAddress}</span>
      </div>
    </header>
  );
}
