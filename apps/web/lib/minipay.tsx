"use client";

import { Address, createPublicClient, http } from "viem";
import { celo } from "viem/chains";

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean;
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export const CUSD_ADDRESS = (process.env.NEXT_PUBLIC_CUSD_ADDRESS ?? "0x765de816845861e75a25fca122bb6898b8b1282a") as Address;
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

export function getMiniPayPublicClient() {
  const rpc = process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo.org";
  return createPublicClient({
    chain: celo,
    transport: http(rpc)
  });
}

export async function getCUSDBalance(address: Address): Promise<bigint> {
  const client = getMiniPayPublicClient();
  const raw = await client.readContract({
    address: CUSD_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address]
  });
  // Convert from 18 decimals to 6 decimals (micros)
  return raw / 1_000_000_000_000n;
}

export const getUSDCBalance = getCUSDBalance;
