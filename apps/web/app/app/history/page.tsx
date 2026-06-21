"use client";

import { Clock } from "lucide-react";
import { DraftRecoveryList } from "@/components/app/home/DraftRecoveryList";
import { SessionList } from "@/components/app/home/SessionList";
import { useWallet } from "@/lib/wallet";

export default function HistoryPage() {
  const { address } = useWallet();

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-8">
      <div className="flex items-center gap-2">
        <Clock size={18} className="text-muted-foreground" />
        <h1 className="text-2xl font-medium tracking-tight">History</h1>
      </div>
      {address ? (
        <>
          <DraftRecoveryList />
          <SessionList host={address} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Connect your wallet to see your past splits.</p>
      )}
    </div>
  );
}
