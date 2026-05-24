"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { Address } from "viem";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMiniPay?: boolean;
  isMetaMask?: boolean;
  isValora?: boolean;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export type WalletKind = "minipay" | "metamask" | "valora" | "injected" | "none";

export interface WalletState {
  address: Address | null;
  chainId: number | null;
  kind: WalletKind;
  hasProvider: boolean;
  isMiniPay: boolean;
  connecting: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToCelo: () => Promise<void>;
  provider: Eip1193Provider | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state] = useState<WalletState>({
    address: null,
    chainId: null,
    kind: "none",
    hasProvider: false,
    isMiniPay: false,
    connecting: false,
    error: null
  });

  const providerRef = useRef<Eip1193Provider | null>(null);

  const value = useMemo<WalletContextValue>(
    () => ({
      ...state,
      provider: providerRef.current,
      connect: async () => {},
      disconnect: () => {},
      switchToCelo: async () => {}
    }),
    [state]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}

