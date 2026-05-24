"use client";

import { ExternalLink, LogOut } from "lucide-react";
import { AddressPill } from "@/components/app/common/AddressPill";
import { BalanceCard } from "@/components/app/home/BalanceCard";
import { ConnectSheet } from "@/components/app/wallet/ConnectSheet";
import { Button } from "@/components/ui/button";
import { CONTRACT_ADDRESS } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";

export default function WalletPage() {
  const { address, kind, chainId, disconnect } = useWallet();

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-8">
      <h1 className="text-2xl font-medium tracking-tight">Wallet</h1>
      {address ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card p-5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Connected</span>
            <AddressPill address={address} className="self-start" />
            <span className="text-xs text-muted-foreground">
              via {kind === "minipay" ? "MiniPay" : kind} · chain {chainId ?? "?"}
            </span>
          </div>
          <BalanceCard />
          <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card p-5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Settings</span>
            <a
              href={`https://celoscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between text-sm transition hover:text-foreground"
            >
              <span>View contract on Celoscan</span>
              <ExternalLink size={14} className="text-muted-foreground" />
            </a>
            <Button
              variant="outline"
              size="lg"
              onClick={disconnect}
              className="mt-2 h-10 justify-between rounded-full px-4"
            >
              <span>Disconnect</span>
              <LogOut size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <ConnectSheet />
      )}
    </div>
  );
}
