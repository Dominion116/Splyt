"use client";

import { useEffect, useState } from "react";
import { isMiniPay } from "@/lib/minipay";
import { mockWalletAddress, truncateAddress } from "@/lib/dashboard";

export function useDashboardWallet() {
  const [address, setAddress] = useState(mockWalletAddress);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadWallet = async () => {
      if (typeof window === "undefined") return;

      const persisted = window.localStorage.getItem("splyt.wallet");
      if (persisted && mounted) {
        setAddress(persisted);
      }

      if (isMiniPay() && window.ethereum?.request) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          const list = Array.isArray(accounts) ? accounts.filter((account): account is string => typeof account === "string") : [];
          if (list[0] && mounted) {
            setAddress(list[0]);
            window.localStorage.setItem("splyt.wallet", list[0]);
          }
        } catch {
          // Keep fallback wallet if MiniPay is unavailable.
        }
      }

      if (mounted) setReady(true);
    };

    void loadWallet();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    address,
    ready,
    truncatedAddress: truncateAddress(address)
  };
}
