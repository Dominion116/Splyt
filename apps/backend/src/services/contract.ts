import { Address, Hex, createPublicClient, http } from "viem";
import { celo } from "viem/chains";

const RPC_URL = process.env.CELO_RPC_URL ?? "https://forno.celo.org";
const CONTRACT_ADDRESS = (process.env.SPLYT_SESSION_CONTRACT ?? "0x0000000000000000000000000000000000000000") as Address;

// cUSD on Celo is an 18-decimal ERC-20. The off-chain backend works in
// 6-decimal micros, so every uint256 amount that crosses the chain boundary
// (amountDue, payoutAmount) must be divided by 10^12 to land in micros.
// Frontend wallet calls scale the inverse direction before sending.
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
    name: "allPaid",
    stateMutability: "view",
    inputs: [{ name: "sessionId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "getSession",
    stateMutability: "view",
    inputs: [{ name: "sessionId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "bytes32" },
          { name: "host", type: "address" },
          { name: "total", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "active", type: "bool" },
          {
            name: "members",
            type: "tuple[]",
            components: [
              { name: "addr", type: "address" },
              { name: "amountDue", type: "uint256" },
              { name: "paid", type: "bool" }
            ]
          }
        ]
      }
    ]
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
  active: boolean;
  members: Array<{ address: Address; paid: boolean; amountDue: bigint }>;
}

export class ChainSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} was not found on the configured contract.`);
    this.name = "ChainSessionNotFoundError";
  }
}

// UUIDs without dashes are exactly 32 hex characters, which fit in a single
// bytes32 with zero padding. Reject anything longer up-front: if the caller
// supplies a 64+ character custom id, the previous implementation silently
// truncated to the first 32 bytes, allowing two distinct ids to collide on
// the same on-chain key (MED-01). The session route's Zod schema already
// enforces UUIDv4 format; this is defence-in-depth for any other call site.
function toBytes32(sessionId: string): Hex {
  const trimmed = sessionId.replace(/-/g, "");
  if (!/^[0-9a-fA-F]+$/.test(trimmed) || trimmed.length === 0 || trimmed.length > 32) {
    throw new Error(
      `Invalid session id "${sessionId}": expected a hex/UUID string up to 32 hex characters.`
    );
  }
  return (`0x${trimmed.padEnd(64, "0")}`) as Hex;
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

// keccak256("SessionClosed(bytes32,uint256)") — precomputed, immutable for this ABI.
const SESSION_CLOSED_TOPIC = "0x1d8ada2ed73dcd9599105b1206ea1d3aa9e687b4e8f3b49940a4b03b6360585e";
// keccak256("MemberPaid(bytes32,address,uint256)") — precomputed, immutable.
const MEMBER_PAID_TOPIC = "0x5d2b0b90cc08e943ce3566b9dc2e5216427f96f66e6a81294f1158f4468d30b1";

/** Right-pad an Ethereum address into a 32-byte ABI-encoded hex string. */
function addressToTopic(address: string): string {
  return `0x000000000000000000000000${address.slice(2).toLowerCase()}`;
}

export class InvalidCloseTxError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidCloseTxError";
  }
}

export class InvalidPaymentTxError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidPaymentTxError";
  }
}

/**
 * Fetches the on-chain receipt for `txHash` and verifies it contains a
 * genuine `SessionClosed(sessionId, payoutAmount)` log emitted by the
 * Splyt contract for the specific `sessionId`. Throws `InvalidCloseTxError`
 * if the transaction failed, targeted a different contract, or does not
 * contain the expected event for this session.
 */
type MinimalReceipt = {
  status: string;
  to: string | null | undefined;
  logs: Array<{
    address: string;
    topics: readonly (string | undefined)[];
    data: string;
  }>;
};

export async function verifyCloseTransaction(
  txHash: Hex,
  sessionId: string
): Promise<{ payoutAmount: bigint }> {
  const receipt = (await waitForTransactionReceipt(txHash)) as MinimalReceipt;

  if (receipt.status !== "success") {
    throw new InvalidCloseTxError("Transaction did not succeed on-chain.");
  }

  if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
    throw new InvalidCloseTxError("Transaction was not sent to the Splyt contract.");
  }

  const expectedBytes32 = toBytes32(sessionId).toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
    if (log.topics[0]?.toLowerCase() !== SESSION_CLOSED_TOPIC) continue;
    // topics[1] is the ABI-encoded indexed bytes32 sessionId
    if (log.topics[1]?.toLowerCase() !== expectedBytes32) continue;
    // data is the ABI-encoded uint256 payoutAmount (32 bytes, big-endian, in
    // 18-decimal wei). Convert back to 6-decimal micros for the API response.
    const payoutAmount = BigInt(log.data) / MICROS_TO_WEI;
    return { payoutAmount };
  }

  throw new InvalidCloseTxError(
    "Transaction does not contain a SessionClosed event for this session."
  );
}

/**
 * Verifies that `txHash` is a successful `markPaid` call against the Splyt
 * contract that emitted a `MemberPaid(sessionId, member, amount)` log for the
 * exact (sessionId, memberAddress) pair. Without this check a member could
 * confirm a payment in session B by submitting a txHash from session A where
 * they happened to already be marked paid on-chain.
 */
export async function verifyMemberPaidTransaction(
  txHash: Hex,
  sessionId: string,
  memberAddress: string
): Promise<{ amount: bigint }> {
  const receipt = (await waitForTransactionReceipt(txHash)) as MinimalReceipt;

  if (receipt.status !== "success") {
    throw new InvalidPaymentTxError("Payment transaction did not succeed on-chain.");
  }

  if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
    throw new InvalidPaymentTxError("Transaction was not sent to the Splyt contract.");
  }

  const expectedSessionId = toBytes32(sessionId).toLowerCase();
  const expectedMember = addressToTopic(memberAddress);

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
    if (log.topics[0]?.toLowerCase() !== MEMBER_PAID_TOPIC) continue;
    // topics[1] = indexed bytes32 sessionId, topics[2] = indexed address member
    if (log.topics[1]?.toLowerCase() !== expectedSessionId) continue;
    if (log.topics[2]?.toLowerCase() !== expectedMember) continue;
    // data = uint256 amount in 18-decimal wei → convert to micros
    const amount = BigInt(log.data) / MICROS_TO_WEI;
    return { amount };
  }

  throw new InvalidPaymentTxError(
    "Transaction does not contain a MemberPaid event for this session and member."
  );
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
    const [statuses, allPaid, session] = await Promise.all([
      Promise.all(
        members.map(async (member) => {
          const [amountDue, paid] = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: "getMemberStatus",
            args: [toBytes32(sessionId), member]
          });
          // Scale 18-decimal wei back to 6-decimal micros for off-chain
          // consumers. All callers (db.ts, /price endpoint, dashboard) work
          // in micros and would otherwise display wei-scale numbers.
          return { address: member, paid, amountDue: amountDue / MICROS_TO_WEI };
        })
      ),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "allPaid",
        args: [toBytes32(sessionId)]
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "getSession",
        args: [toBytes32(sessionId)]
      })
    ]);

    return { allPaid, active: session.active, members: statuses };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("SessionNotFound")) {
      throw new ChainSessionNotFoundError(sessionId);
    }
    throw error;
  }
}
