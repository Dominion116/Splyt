import { Address, Hash, Hex, createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const RPC_URL = process.env.CELO_RPC_URL ?? "https://forno.celo.org";
const CONTRACT_ADDRESS = (process.env.SPLYT_SESSION_CONTRACT ?? "0x0000000000000000000000000000000000000000") as Address;

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

export interface SessionStatus {
  allPaid: boolean;
  members: Array<{ address: Address; paid: boolean; amountDue: bigint }>;
}

function toBytes32(sessionId: string): Hex {
  const trimmed = sessionId.replace(/-/g, "");
  return (`0x${trimmed.padEnd(64, "0").slice(0, 64)}`) as Hex;
}

function normalizePrivateKey(value: string | undefined): Hex {
  if (!value) {
    throw new Error("HOST_WALLET_PRIVATE_KEY is required");
  }

  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  const hex = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;

  if (!/^0x[a-fA-F0-9]{64}$/.test(hex)) {
    throw new Error(
      "HOST_WALLET_PRIVATE_KEY must be a 32-byte hex string (64 hex characters, with or without 0x prefix)"
    );
  }

  return hex as Hex;
}

function getClients() {
  const pk = normalizePrivateKey(process.env.HOST_WALLET_PRIVATE_KEY);
  const account = privateKeyToAccount(pk);
  const transport = http(RPC_URL);
  const publicClient = createPublicClient({ chain: celo, transport });
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport
  });
  return { publicClient, walletClient, account };
}

export async function createSessionOnChain(
  sessionId: string,
  members: Address[],
  amounts: bigint[],
  expiresAt: number
): Promise<Hash> {
  const { walletClient, account, publicClient } = getClients();
  const total = amounts.reduce((sum, current) => sum + current, 0n);
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "createSession",
    args: [toBytes32(sessionId), members, amounts, total, BigInt(expiresAt)],
    chain: celo,
    account
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function markMemberPaid(sessionId: string, memberAddress: Address): Promise<Hash> {
  const { walletClient, account, publicClient } = getClients();
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "markPaid",
    args: [toBytes32(sessionId), memberAddress],
    chain: celo,
    account
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getSessionStatus(sessionId: string, members: Address[]): Promise<SessionStatus> {
  const { publicClient } = getClients();

  // Fetch real-time data from blockchain - no caching or mock data
  const [statuses, allPaid] = await Promise.all([
    Promise.all(
      members.map(async (member) => {
        const [amountDue, paid] = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "getMemberStatus",
          args: [toBytes32(sessionId), member]
        });
        return { address: member, paid, amountDue };
      })
    ),
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "allPaid",
      args: [toBytes32(sessionId)]
    })
  ]);

  return { allPaid, members: statuses };
}
