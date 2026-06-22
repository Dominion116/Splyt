"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { DraftRecoveryList } from "@/components/app/home/DraftRecoveryList";
import { SessionList } from "@/components/app/home/SessionList";
import { useWallet } from "@/lib/wallet";
import { cn } from "@/lib/utils";

type SessionFilter = "all" | "open" | "settled" | "expired";

const FILTER_TABS: { label: string; value: SessionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Settled", value: "settled" },
  { label: "Expired", value: "expired" }
];

export default function HistoryPage() {
  const { address } = useWallet();
  const [filter, setFilter] = useState<SessionFilter>("all");

  useEffect(() => { setFilter("all"); }, [address]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-8">
      <div className="flex items-center gap-2">
        <Clock size={18} className="text-muted-foreground" />
        <h1 className="text-2xl font-medium tracking-tight">History</h1>
      </div>
      {address ? (
        <>
          <DraftRecoveryList />
          <hr className="border-border/40" />
          <div className="flex gap-1 rounded-full border border-border/40 bg-muted/50 p-0.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                aria-pressed={filter === tab.value}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-xs capitalize transition",
                  filter === tab.value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <SessionList host={address} filter={filter} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Connect your wallet to see your past splits.</p>
      )}
    </div>
  );
}
