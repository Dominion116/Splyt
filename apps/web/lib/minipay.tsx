"use client";

import { ReactNode } from "react";
import { Address, createPublicClient, createWalletClient, custom, http } from "viem";
import { celo } from "viem/chains";

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean;
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
export const USDC_ADAPTER = "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as const;

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  }
] as const;

export function isMiniPay(): boolean {
  return typeof window !== "undefined" && !!window.ethereum?.isMiniPay;
}

export function getMiniPayWalletClient() {
  if (typeof window === "undefined" || !window.ethereum || !window.ethereum.isMiniPay) {
    throw new Error("MiniPay wallet not found");
  }
  return createWalletClient({
    chain: celo,
    transport: custom(window.ethereum)
  });
}

export function getMiniPayPublicClient() {
  const rpc = process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo.org";
  return createPublicClient({
    chain: celo,
    transport: http(rpc)
  });
}

export async function getUSDCBalance(address: Address): Promise<bigint> {
  const client = getMiniPayPublicClient();
  return client.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address]
  });
}

export function MiniPayProvider({ children }: { children: ReactNode }) {
  if (typeof window === "undefined") return <>{children}</>;
  if (!window.ethereum) return <div className="text-sm text-zinc-500">No wallet provider detected.</div>;
  if (!window.ethereum.isMiniPay) return <div className="text-sm text-zinc-500">Open this app inside MiniPay.</div>;
  return <>{children}</>;
}
