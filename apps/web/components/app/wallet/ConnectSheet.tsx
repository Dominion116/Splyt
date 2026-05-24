"use client";

import { Icon } from "@iconify/react";
import { ArrowUpRight, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { useWallet, type WalletKind } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROVIDER_LABEL: Record<WalletKind, { label: string; icon: string; hint: string }> = {
  minipay: { label: "MiniPay", icon: "lucide:smartphone", hint: "Detected" },
  metamask: { label: "MetaMask", icon: "logos:metamask-icon", hint: "Detected" },
  valora: { label: "Valora", icon: "lucide:smartphone", hint: "Detected" },
  injected: { label: "Browser wallet", icon: "lucide:wallet", hint: "Detected" },
  none: { label: "No wallet detected", icon: "lucide:wallet", hint: "Install MiniPay or MetaMask" }
};

export function ConnectSheet() {
  const { kind, hasProvider, connect, connecting, error } = useWallet();
  const provider = PROVIDER_LABEL[kind];

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
        disabled={!hasProvider || connecting}
        className={cn(
          "group flex w-full items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background p-4 text-left transition",
          hasProvider ? "hover:border-border" : "opacity-60",
          "disabled:cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Icon icon={provider.icon} width={18} height={18} />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{provider.label}</span>
            <span className="text-xs text-muted-foreground">
              {connecting ? "Waiting for wallet…" : provider.hint}
            </span>
          </div>
        </div>
        <ArrowUpRight
          size={16}
          className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
        />
      </button>

      {!hasProvider ? (
        <p className="text-xs text-muted-foreground">
          Tip: open this app inside the MiniPay app on Celo, or install a browser wallet that
          supports Celo (MetaMask, Valora) to continue.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        className="self-start text-xs text-muted-foreground"
        asChild
      >
        <a href="https://docs.celo.org/build-on-celo/build-with-ai/agent-skills" target="_blank" rel="noreferrer">
          Learn about MiniPay
        </a>
      </Button>
    </motion.div>
  );
}
