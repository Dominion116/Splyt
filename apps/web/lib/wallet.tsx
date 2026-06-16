"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { Address } from "viem";
import { CELO_CHAIN } from "./chain";

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
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToCelo: () => Promise<void>;
  provider: Eip1193Provider | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "splyt:wallet:autoConnect";

function detectKind(provider: Eip1193Provider | undefined): WalletKind {
  if (!provider) return "none";
  if (provider.isMiniPay) return "minipay";
  if (provider.isMetaMask) return "metamask";
  return "injected";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    kind: "none",
    hasProvider: false,
    isMiniPay: false,
    connecting: false,
    error: null
  });

  const providerRef = useRef<Eip1193Provider | null>(null);

  const applyAccounts = useCallback((accounts: unknown) => {
    const list = Array.isArray(accounts) ? (accounts as string[]) : [];
    const address = (list[0] ?? null) as Address | null;
    setState((prev) => ({ ...prev, address }));
    if (address) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }
  }, []);

  const applyChain = useCallback((chainIdHex: unknown) => {
    if (typeof chainIdHex !== "string") return;
    setState((prev) => ({ ...prev, chainId: Number.parseInt(chainIdHex, 16) }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const provider = window.ethereum;
    providerRef.current = provider ?? null;
    const kind = detectKind(provider);
    setState((prev) => ({
      ...prev,
      hasProvider: Boolean(provider),
      isMiniPay: Boolean(provider?.isMiniPay),
      kind
    }));

    if (!provider) return;

    const onAccounts = (accounts: unknown) => applyAccounts(accounts);
    const onChain = (chainId: unknown) => applyChain(chainId);

    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);

    const shouldAutoConnect =
      provider.isMiniPay ||
      (() => {
        try {
          return localStorage.getItem(STORAGE_KEY) === "1";
        } catch {
          return false;
        }
      })();

    if (shouldAutoConnect) {
      provider
        .request({ method: "eth_accounts" })
        .then(applyAccounts)
        .catch(() => {});
      provider
        .request({ method: "eth_chainId" })
        .then(applyChain)
        .catch(() => {});
    }

    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [applyAccounts, applyChain]);

  const value = useMemo<WalletContextValue>(
    () => ({
      ...state,
      provider: providerRef.current,
      connect: async () => {
        const provider = providerRef.current;
        if (!provider) {
          setState((prev) => ({ ...prev, error: "No wallet provider detected." }));
          return;
        }
        setState((prev) => ({ ...prev, connecting: true, error: null }));
        try {
          const accounts = await provider.request({ method: "eth_requestAccounts" });
          applyAccounts(accounts);
          const chainId = await provider.request({ method: "eth_chainId" });
          applyChain(chainId);
        } catch (err) {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : "Failed to connect wallet."
          }));
        } finally {
          setState((prev) => ({ ...prev, connecting: false }));
        }
      },
      disconnect: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        setState((prev) => ({ ...prev, address: null, chainId: null, error: null }));
      },
      switchToCelo: async () => {
        const provider = providerRef.current;
        if (!provider) return;
        const targetHex = `0x${CELO_CHAIN.id.toString(16)}`;
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetHex }]
          });
        } catch (err: unknown) {
          const code = (err as { code?: number })?.code;
          if (code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: targetHex,
                  chainName: CELO_CHAIN.name,
                  nativeCurrency: CELO_CHAIN.nativeCurrency,
                  rpcUrls: [CELO_CHAIN.rpcUrls.default.http[0]],
                  blockExplorerUrls: CELO_CHAIN.blockExplorers?.default
                    ? [CELO_CHAIN.blockExplorers.default.url]
                    : []
                }
              ]
            });
          } else {
            throw err;
          }
        }
      }
    }),
    [state, applyAccounts, applyChain]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
