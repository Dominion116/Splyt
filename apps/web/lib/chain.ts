import {
  createPublicClient,
  http,
  maxUint256,
  type Address,
  type Hex,
  type WalletClient
} from "viem";
import { celo } from "viem/chains";

export const RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo.org";
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as Address;
export const CUSD_ADDRESS = (process.env.NEXT_PUBLIC_CUSD_ADDRESS ??
  "0x765de816845861e75a25fca122bb6898b8b1282a") as Address;

export const MICROS_TO_WEI = 10n ** 12n;
export const CELO_CHAIN = celo;

export const SPLYT_ABI = [
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
  },
  {
    type: "function",
    name: "allPaid",
    stateMutability: "view",
    inputs: [{ name: "sessionId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "getMemberStatus",
    stateMutability: "view",
    inputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "member", type: "address" }
    ],
    outputs: [
      { name: "amountDue", type: "uint256" },
      { name: "paid", type: "bool" }
    ]
  }
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
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

const _publicClient = createPublicClient({
  chain: celo,
  transport: http(RPC_URL)
});

export function getPublicClient() {
  return _publicClient;
}

export function toBytes32(sessionId: string): Hex {
  const trimmed = sessionId.replace(/-/g, "");
  if (!/^[0-9a-fA-F]+$/.test(trimmed) || trimmed.length === 0 || trimmed.length > 32) {
    throw new Error(`Invalid session id "${sessionId}"`);
  }
  return `0x${trimmed.padEnd(64, "0")}` as Hex;
}

export function microsToWei(micros: bigint): bigint {
  return micros * MICROS_TO_WEI;
}

export function weiToMicros(wei: bigint): bigint {
  return wei / MICROS_TO_WEI;
}

export const MAX_UINT256 = maxUint256;

export function hostAuthMessage(sessionId: string): string {
  return `Splyt session creation: ${sessionId}`;
}

export interface CreateSessionTxInput {
  sessionId: string;
  members: Address[];
  amountsMicros: bigint[];
  expiresAt: number;
}

export async function signHostMessage(
  walletClient: WalletClient,
  sessionId: string
): Promise<Hex> {
  return walletClient.signMessage({
    account: walletClient.account!,
    message: hostAuthMessage(sessionId)
  });
}

export async function createSessionTx(
  walletClient: WalletClient,
  input: CreateSessionTxInput
): Promise<Hex> {
  const amountsWei = input.amountsMicros.map(microsToWei);
  const totalWei = amountsWei.reduce((acc, current) => acc + current, 0n);
  return walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: SPLYT_ABI,
    functionName: "createSession",
    account: walletClient.account!,
    chain: celo,
    args: [
      toBytes32(input.sessionId),
      input.members,
      amountsWei,
      totalWei,
      BigInt(Math.floor(input.expiresAt / 1000))
    ]
  });
}

export async function closeSessionTx(
  walletClient: WalletClient,
  sessionId: string
): Promise<Hex> {
  return walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: SPLYT_ABI,
    functionName: "closeSession",
    account: walletClient.account!,
    chain: celo,
    args: [toBytes32(sessionId)]
  });
}

export async function markPaidTx(
  walletClient: WalletClient,
  sessionId: string
): Promise<Hex> {
  const member = walletClient.account!.address;
  return walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: SPLYT_ABI,
    functionName: "markPaid",
    account: walletClient.account!,
    chain: celo,
    args: [toBytes32(sessionId), member]
  });
}

export async function approveCusdTx(
  walletClient: WalletClient,
  amountWei: bigint
): Promise<Hex> {
  return walletClient.writeContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "approve",
    account: walletClient.account!,
    chain: celo,
    args: [CONTRACT_ADDRESS, amountWei]
  });
}

export async function getCusdAllowance(owner: Address): Promise<bigint> {
  const allowance = await getPublicClient().readContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, CONTRACT_ADDRESS]
  });
  return allowance as bigint;
}
