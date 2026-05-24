import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  maxUint256,
  type Address,
  type Hex
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

export function getWalletClient(provider: unknown, account: Address) {
  return createWalletClient({
    chain: celo,
    transport: custom(provider as Parameters<typeof custom>[0]),
    account
  });
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
