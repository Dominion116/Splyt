"use client";

import { useEffect, useState } from "react";
import { truncateAddress, isValidEthAddress } from "@/lib/dashboard";

const STORAGE_KEY = "splyt.wallet";

export function useDashboardWallet() {
  const [address, setAddress] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadWallet = async () => {
      if (typeof window === "undefined") return;

      // Show the cached value immediately as a UX hint while we wait for
      // the wallet to respond — but only if the cache parses as a valid
      // address. Never trust this as the source of truth: we re-query the
      // wallet provider unconditionally below and overwrite.
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached && isValidEthAddress(cached) && mounted) {
        setAddress(cached);
      }

      // Authoritative read — works for MiniPay, MetaMask, and any other
      // EIP-1193 provider. eth_accounts is silent (does not prompt the
      // user) so it is safe to call on every page load.
      if (window.ethereum?.request) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          const list = Array.isArray(accounts)
            ? accounts.filter((account): account is string => typeof account === "string")
            : [];
          if (mounted) {
            const live = list[0] && isValidEthAddress(list[0]) ? list[0] : "";
            setAddress(live);
            if (live) {
              window.localStorage.setItem(STORAGE_KEY, live);
            } else {
              // Provider has no connected account — clear the cache so the
              // next load doesn't show a stale address attributed to the
              // wrong wallet.
              window.localStorage.removeItem(STORAGE_KEY);
            }
          }
        } catch {
          // Provider rejected the read — keep the cached value showing in
          // the UI, but do not write back.
        }
      } else if (mounted) {
        // No provider at all (e.g. server-rendered preview, browser without
        // a wallet). Drop the cache so we don't surface a stale address.
        window.localStorage.removeItem(STORAGE_KEY);
        setAddress("");
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
    truncatedAddress: address ? truncateAddress(address) : "connect wallet"
  };
}
