"use client";

import { ArrowUpRight, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { useWallet } from "@/lib/wallet";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  minipay: "MiniPay",
  metamask: "MetaMask",
  walletconnect: "WalletConnect",
  injected: "Browser wallet",
  none: "Wallet",
};

export function ConnectSheet() {
  const { kind, connecting, connect } = useWallet();

  const label = KIND_LABEL[kind] ?? "Wallet";
  const hint =
    kind === "none"
      ? "Choose a wallet to connect"
      : `${label} detected`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="flex flex-col gap-6 rounded-2xl border border-border/40 bg-card p-6"
    >
      <div className="flex flex-col gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wallet size={20} />
        </div>
        <h2 className="text-xl font-medium tracking-tight">Connect your wallet</h2>
        <p className="text-sm text-muted-foreground">
          Splyt settles every split directly between wallets on Celo. Connect to start scanning
          receipts.
        </p>
      </div>

      <button
        type="button"
        onClick={connect}
        disabled={connecting}
        className={cn(
          "group flex w-full items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background p-4 text-left transition hover:border-border",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Wallet size={18} className="text-muted-foreground" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {connecting ? "Connecting…" : kind === "none" ? "Connect Wallet" : label}
            </span>
            <span className="text-xs text-muted-foreground">
              {connecting ? "Waiting for wallet…" : hint}
            </span>
          </div>
        </div>
        <ArrowUpRight
          size={16}
          className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
        />
      </button>

      <p className="text-xs text-muted-foreground">
        Supports MiniPay, MetaMask, WalletConnect, and any injected wallet on Celo.
      </p>
    </motion.div>
  );
}
