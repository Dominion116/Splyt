import { Address, Hash, Hex, createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const USDC_ADAPTER = "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as Address;
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

function getClients() {
  const pk = process.env.HOST_WALLET_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("HOST_WALLET_PRIVATE_KEY is required");
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
    account,
    kzg: undefined,
    // feeCurrency adapter enables paying fees in USDC-like token on Celo.
    fees: { gasPrice: parseEther("0.000000001"), maxFeePerGas: undefined, maxPriorityFeePerGas: undefined },
    feeCurrency: USDC_ADAPTER
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
    account,
    feeCurrency: USDC_ADAPTER
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getSessionStatus(sessionId: string, members: Address[]): Promise<SessionStatus> {
  const { publicClient } = getClients();
  const statuses = await Promise.all(
    members.map(async (member) => {
      const [amountDue, paid] = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "getMemberStatus",
        args: [toBytes32(sessionId), member]
      });
      return { address: member, paid, amountDue };
    })
  );
  const allPaid = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "allPaid",
    args: [toBytes32(sessionId)]
  });
  return { allPaid, members: statuses };
}
