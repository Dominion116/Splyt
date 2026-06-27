"use client";

import { useEffect, useState } from "react";
import { USDM_ADDRESS, ERC20_ABI, getPublicClient } from "@/lib/chain";
import { formatUSDm } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

export function BalanceCard() {
  const { address } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPublicClient()
      .readContract({
        address: USDM_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address]
      })
      .then((wei) => {
        if (cancelled) return;
        // USDm is 18 decimals, format.formatUSDm expects 6-decimal micros.
        const micros = (wei as bigint) / 10n ** 12n;
        setBalance(micros);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-card p-5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">USDm balance</span>
      <span className="font-serif text-4xl italic tracking-tight">
        {balance !== null ? formatUSDm(balance) : loading ? "…" : "$—"}
      </span>
      <span className="text-xs text-muted-foreground">on Celo · ready to split</span>
    </div>
  );
}
