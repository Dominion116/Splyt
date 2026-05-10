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

// cUSD on Celo is an 18-decimal ERC-20. Splyt stores all off-chain amounts as
// 6-decimal micros (so $25.00 == 25_000_000n) for compactness and parity with
// the AI's parsed totals. Every value crossing the wallet/contract boundary
// must be scaled up by 10^12 so the on-chain `amountDue` and `transferFrom`
// calls operate in cUSD wei rather than dust micros.
const MICROS_TO_WEI = 10n ** 12n;

const ABI = [
  {
    type: "error",
    name: "SessionNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "SessionExpired",
    inputs: []
  },
  {
    type: "error",
    name: "SessionInactive",
    inputs: []
  },
  {
    type: "error",
    name: "MemberNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "AlreadyPaid",
    inputs: []
  },
  {
    type: "error",
    name: "NotHost",
    inputs: []
  },
  {
    type: "error",
    name: "NotMember",
    inputs: []
  },
  {
    type: "error",
    name: "NotSettled",
    inputs: []
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: []
  },
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

/**
 * Asks the connected wallet to sign a UTF-8 message via personal_sign so the
 * backend can prove the caller controls `address` before persisting a session
 * attributed to that address. Returns the 0x-prefixed 65-byte hex signature.
 */
export async function personalSign(args: { address: Address; message: string }): Promise<Hex> {
  const provider = getProvider();
  const signature = await provider.request({
    method: "personal_sign",
    params: [args.message, args.address]
  });
  if (typeof signature !== "string" || !/^0x[a-fA-F0-9]{130}$/.test(signature)) {
    throw new Error("Wallet returned an invalid signature.");
  }
  return signature as Hex;
}

/** Canonical message string the backend expects for host-of-session proofs. */
export function hostAuthMessage(sessionId: string): string {
  return `Splyt session creation: ${sessionId}`;
}

export async function sendCreateSessionTransaction(args: {
  sessionId: string;
  from: Address;
  members: Address[];
  /** Per-member shares in 6-decimal micros (off-chain unit). */
  amounts: bigint[];
  expiresAt: number;
}): Promise<Hex> {
  const provider = getProvider();
  // Scale 6-decimal micros up to 18-decimal wei before sending to the
  // contract — otherwise transferFrom/transfer move dust amounts of cUSD.
  const weiAmounts = args.amounts.map((amount) => amount * MICROS_TO_WEI);
  const total = weiAmounts.reduce((sum, amount) => sum + amount, 0n);
  const data = encodeFunctionData({
    abi: ABI,
    functionName: "createSession",
    args: [toBytes32(args.sessionId), args.members, weiAmounts, total, BigInt(args.expiresAt)]
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
  /** Approval amount in 6-decimal micros (off-chain unit). */
  amount: bigint;
}): Promise<Hex> {
  const provider = getProvider();
  // The cUSD ERC-20 contract operates in 18-decimal wei. Scale up so the
  // approval covers the actual on-chain transfer.
  const weiAmount = args.amount * MICROS_TO_WEI;
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACT_ADDRESS, weiAmount]
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

export async function assertCanCloseSession(args: {
  sessionId: string;
  from: Address;
}) {
  const client = createPublicClient({
    chain: celo,
    transport: http(process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo.org")
  });

  try {
    await client.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "closeSession",
      args: [toBytes32(args.sessionId)],
      account: args.from
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("NotHost")) {
      throw new Error("Only the host wallet can withdraw this session.");
    }
    if (message.includes("NotSettled")) {
      throw new Error("The session is not fully settled on-chain yet.");
    }
    if (message.includes("SessionInactive")) {
      throw new Error("This session has already been closed.");
    }
    if (message.includes("TransferFailed")) {
      throw new Error("The contract could not transfer the pooled cUSD to the host wallet.");
    }
    if (message.includes("SessionNotFound")) {
      throw new Error("This session was not found on the active contract.");
    }
    throw error;
  }
}

export async function waitForCeloReceipt(hash: Hex) {
  const client = createPublicClient({
    chain: celo,
    transport: http(process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo.org")
  });

  return client.waitForTransactionReceipt({ hash });
}
