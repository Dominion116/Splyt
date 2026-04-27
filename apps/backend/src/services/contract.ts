import { Address, Hex, createPublicClient, http } from "viem";
import { celo } from "viem/chains";

const RPC_URL = process.env.CELO_RPC_URL ?? "https://forno.celo.org";
const CONTRACT_ADDRESS = (process.env.SPLYT_SESSION_CONTRACT ?? "0x0000000000000000000000000000000000000000") as Address;

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

export class ChainSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} was not found on the configured contract.`);
    this.name = "ChainSessionNotFoundError";
  }
}

function toBytes32(sessionId: string): Hex {
  const trimmed = sessionId.replace(/-/g, "");
  return (`0x${trimmed.padEnd(64, "0").slice(0, 64)}`) as Hex;
}

function getPublicClient() {
  return createPublicClient({
    chain: celo,
    transport: http(RPC_URL)
  });
}

export async function waitForTransactionReceipt(hash: Hex) {
  const publicClient = getPublicClient();
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function sessionExists(sessionId: string, members: Address[]): Promise<boolean> {
  if (members.length === 0) return false;

  const publicClient = getPublicClient();
  try {
    await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "getMemberStatus",
      args: [toBytes32(sessionId), members[0]]
    });
    return true;
  } catch {
    return false;
  }
}

export async function getSessionStatus(sessionId: string, members: Address[]): Promise<SessionStatus> {
  const publicClient = getPublicClient();

  // Fetch real-time data from blockchain - no caching or mock data
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("SessionNotFound")) {
      throw new ChainSessionNotFoundError(sessionId);
    }
    throw error;
  }
}
