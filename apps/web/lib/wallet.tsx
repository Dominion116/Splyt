"use client";

import { useMemo } from "react";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import type { Address, WalletClient } from "viem";
import { celo } from "viem/chains";

export type WalletKind =
  | "minipay"
  | "metamask"
  | "walletconnect"
  | "injected"
  | "none";

export interface WalletState {
  address: Address | null;
  chainId: number | null;
  kind: WalletKind;
  hasProvider: boolean;
  isMiniPay: boolean;
  connecting: boolean;
  error: string | null;
}

export interface WalletContextValue extends WalletState {
  connect: () => void;
  disconnect: () => void;
  switchToCelo: () => Promise<void>;
  walletClient: WalletClient | null;
}

type EthereumFlags = { isMiniPay?: boolean; isMetaMask?: boolean };

export function useWallet(): WalletContextValue {
  const { address, chainId, isConnecting, connector, status } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const { open } = useAppKit();

  const kind = useMemo((): WalletKind => {
    if (!connector) return "none";
    const id = connector.id.toLowerCase();
    if (id.includes("walletconnect")) return "walletconnect";
    if (typeof window !== "undefined") {
      const eth = (window as { ethereum?: EthereumFlags }).ethereum;
      if (eth?.isMiniPay) return "minipay";
      if (eth?.isMetaMask) return "metamask";
    }
    return "injected";
  }, [connector]);

  return {
    address: address ?? null,
    chainId: chainId ?? null,
    kind,
    hasProvider: true,
    isMiniPay: kind === "minipay",
    connecting: isConnecting,
    error: null,
    walletClient: walletClient ?? null,
    connect: () => open(),
    disconnect,
    switchToCelo: async () => {
      if (!connector?.switchChain) return;
      try {
        await connector.switchChain({ chainId: celo.id });
      } catch {}
    },
  };
}
