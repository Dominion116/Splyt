"use client";

import { Address, Hex, createPublicClient, encodeFunctionData, http } from "viem";
import { celo } from "viem/chains";
import { CUSD_ADDRESS } from "./minipay";

declare global {
  interface Window {
    ethereum?: {
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMiniPay?: boolean;
    };
  }
}

type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMiniPay?: boolean;
};

export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0x8c56C9881b1Abd2e5e18B1e76A63009f59315422"
) as Address;

const ABI = [
  {
    type: "function",
    name: "createSession",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "members", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "total", type: "uint256" },
      { name: "expiresAt", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "markPaid",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "member", type: "address" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "closeSession",
    stateMutability: "nonpayable",
    inputs: [{ name: "sessionId", type: "bytes32" }],
    outputs: []
  }
] as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

function getProvider(): WalletProvider {
  if (typeof window === "undefined" || !window.ethereum?.request) {
    throw new Error("No wallet provider detected.");
  }

  return window.ethereum as WalletProvider;
}

export function toBytes32(sessionId: string): Hex {
  const trimmed = sessionId.replace(/-/g, "");
  return `0x${trimmed.padEnd(64, "0").slice(0, 64)}` as Hex;
}

export async function requestWalletAccount(): Promise<Address> {
  const provider = getProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const list = Array.isArray(accounts) ? accounts.filter((account): account is string => typeof account === "string") : [];
  if (!list[0]) throw new Error("No wallet account returned.");
  return list[0] as Address;
}

export async function sendCreateSessionTransaction(args: {
  sessionId: string;
  from: Address;
  members: Address[];
  amounts: bigint[];
  expiresAt: number;
}): Promise<Hex> {
  const provider = getProvider();
  const total = args.amounts.reduce((sum, amount) => sum + amount, 0n);
  const data = encodeFunctionData({
    abi: ABI,
    functionName: "createSession",
    args: [toBytes32(args.sessionId), args.members, args.amounts, total, BigInt(args.expiresAt)]
  });

  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: args.from,
        to: CONTRACT_ADDRESS,
        data
      }
    ]
  });

  if (typeof hash !== "string") {
    throw new Error("Wallet did not return a transaction hash.");
  }

  return hash as Hex;
}

export async function sendMemberPaymentTransaction(args: {
  sessionId: string;
  from: Address;
  member: Address;
}): Promise<Hex> {
  const provider = getProvider();
  const data = encodeFunctionData({
    abi: ABI,
    functionName: "markPaid",
    args: [toBytes32(args.sessionId), args.member]
  });

  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: args.from,
        to: CONTRACT_ADDRESS,
        data
      }
    ]
  });

  if (typeof hash !== "string") {
    throw new Error("Wallet did not return a transaction hash.");
  }

  return hash as Hex;
}

export async function sendApproveCusdTransaction(args: {
  from: Address;
  amount: bigint;
}): Promise<Hex> {
  const provider = getProvider();
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACT_ADDRESS, args.amount]
  });

  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: args.from,
        to: CUSD_ADDRESS,
        data
      }
    ]
  });

  if (typeof hash !== "string") {
    throw new Error("Wallet did not return an approval transaction hash.");
  }

  return hash as Hex;
}

export async function sendCloseSessionTransaction(args: {
  sessionId: string;
  from: Address;
}): Promise<Hex> {
  const provider = getProvider();
  const data = encodeFunctionData({
    abi: ABI,
    functionName: "closeSession",
    args: [toBytes32(args.sessionId)]
  });

  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: args.from,
        to: CONTRACT_ADDRESS,
        data
      }
    ]
  });

  if (typeof hash !== "string") {
    throw new Error("Wallet did not return a transaction hash.");
  }

  return hash as Hex;
}

export async function waitForCeloReceipt(hash: Hex) {
  const client = createPublicClient({
    chain: celo,
    transport: http(process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo.org")
  });

  return client.waitForTransactionReceipt({ hash });
}
