/**
 * ERC-8004 Identity Registry — register (or update URI for) the Splyt agent.
 *
 * Usage (from monorepo root):
 *   npm run register-agent -w apps/backend
 *   npm run register-agent -w apps/backend -- --embed-metadata
 *   npm run register-agent -w apps/backend -- --set-uri --agent-id 42
 *
 * Required env:
 *   AGENT_OWNER_PRIVATE_KEY
 *   AGENT_URI   (unless --embed-metadata)
 *
 * Optional env:
 *   AGENT_NETWORK=sepolia|mainnet
 *   ERC8004_IDENTITY_REGISTRY
 *   CELO_RPC_URL / CELO_SEPOLIA_RPC_URL
 *   AGENT_ID    (for --set-uri if not passed as flag)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  type Address,
  type Hex,
  type Log
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";

const IDENTITY_REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }]
  },
  {
    type: "function",
    name: "setAgentURI",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "agentURI", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true }
    ]
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "agentURI", type: "string", indexed: false }
    ]
  }
] as const;

const REGISTRY = {
  mainnet: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
  sepolia: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address
};

const DEFAULT_RPC = {
  mainnet: "https://forno.celo.org",
  sepolia: "https://forno.celo-sepolia.celo-testnet.org"
};

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const get = (name: string): string | undefined => {
    const idx = argv.indexOf(name);
    if (idx === -1) return undefined;
    return argv[idx + 1];
  };
  return {
    embedMetadata: flags.has("--embed-metadata"),
    setUri: flags.has("--set-uri"),
    agentId: get("--agent-id") ?? process.env.AGENT_ID
  };
}

function loadMetadataPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // apps/backend/scripts -> repo root agent/metadata.json
  return resolve(here, "../../../agent/metadata.json");
}

function embedMetadataAsDataUri(): string {
  const raw = readFileSync(loadMetadataPath(), "utf8");
  // Validate JSON + compliance checks before spending gas
  const meta = JSON.parse(raw) as Record<string, unknown>;
  assertMetadataCompliant(meta);
  const b64 = Buffer.from(JSON.stringify(meta)).toString("base64");
  return `data:application/json;base64,${b64}`;
}

function assertMetadataCompliant(meta: Record<string, unknown>): void {
  const typeOk =
    meta.type === "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  if (!typeOk) {
    throw new Error(
      'metadata.type must be "https://eips.ethereum.org/EIPS/eip-8004#registration-v1" (not "Agent")'
    );
  }
  if ("endpoints" in meta) {
    throw new Error('metadata must use "services", not deprecated "endpoints"');
  }
  if (!Array.isArray(meta.services)) {
    throw new Error('metadata.services must be an array');
  }
  for (const [i, s] of meta.services.entries()) {
    const entry = s as Record<string, unknown>;
    if (typeof entry.name !== "string" || typeof entry.endpoint !== "string") {
      throw new Error(
        `services[${i}] must have string "name" and "endpoint" (not "url")`
      );
    }
    if ("url" in entry) {
      throw new Error(`services[${i}] must not use deprecated "url" field`);
    }
  }
  console.log("[register-agent] ✓ metadata compliance checks passed");
}

function resolveAgentUri(embed: boolean): string {
  if (embed) {
    const uri = embedMetadataAsDataUri();
    console.log(
      `[register-agent] embedded metadata data: URI (${uri.length} chars)`
    );
    return uri;
  }
  const uri = process.env.AGENT_URI?.trim();
  if (!uri) {
    throw new Error(
      "AGENT_URI is required (ipfs://… or data:…), or pass --embed-metadata"
    );
  }
  if (uri.startsWith("https://")) {
    console.warn(
      "[register-agent] WARNING: https:// agentURI is not content-addressed; validators prefer ipfs:// or data:"
    );
  }
  if (uri.startsWith("ipfs://") || uri.startsWith("data:")) {
    // ok
  } else {
    console.warn(
      "[register-agent] WARNING: agentURI should be ipfs:// or data: for ERC-8004 compliance"
    );
  }
  // If pointing at local file metadata for sanity, still validate file if present
  try {
    const raw = readFileSync(loadMetadataPath(), "utf8");
    assertMetadataCompliant(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    // optional local check only
  }
  return uri;
}

function resolveNetwork(): "mainnet" | "sepolia" {
  const n = (process.env.AGENT_NETWORK ?? "sepolia").toLowerCase();
  if (n === "mainnet" || n === "celo") return "mainnet";
  if (n === "sepolia" || n === "testnet") return "sepolia";
  throw new Error(`Unknown AGENT_NETWORK="${n}" (use sepolia|mainnet)`);
}

function extractAgentId(logs: Log[], registry: Address): bigint | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== registry.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: IDENTITY_REGISTRY_ABI,
        data: log.data,
        topics: log.topics
      });
      if (decoded.eventName === "Registered") {
        return decoded.args.agentId as bigint;
      }
      if (decoded.eventName === "Transfer") {
        const from = (decoded.args.from as string).toLowerCase();
        if (from === "0x0000000000000000000000000000000000000000") {
          return decoded.args.tokenId as bigint;
        }
      }
    } catch {
      // not our event
    }
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const network = resolveNetwork();
  const chain = network === "mainnet" ? celo : celoSepolia;
  const rpc =
    process.env.CELO_RPC_URL ||
    (network === "sepolia"
      ? process.env.CELO_SEPOLIA_RPC_URL
      : undefined) ||
    DEFAULT_RPC[network];
  const registry = (process.env.ERC8004_IDENTITY_REGISTRY ||
    REGISTRY[network]) as Address;

  const pk = process.env.AGENT_OWNER_PRIVATE_KEY;
  if (!pk?.startsWith("0x") || pk.length < 66) {
    throw new Error(
      "AGENT_OWNER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex private key"
    );
  }

  const account = privateKeyToAccount(pk as Hex);
  const publicClient = createPublicClient({ chain, transport: http(rpc) });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpc)
  });

  const agentURI = resolveAgentUri(args.embedMetadata);

  console.log("[register-agent] network:", network, `(chainId ${chain.id})`);
  console.log("[register-agent] registry:", registry);
  console.log("[register-agent] owner:", account.address);
  console.log(
    "[register-agent] agentURI:",
    agentURI.length > 120 ? `${agentURI.slice(0, 120)}…` : agentURI
  );

  if (args.setUri) {
    if (!args.agentId) {
      throw new Error("--set-uri requires --agent-id <n> or AGENT_ID env");
    }
    const agentId = BigInt(args.agentId);
    console.log("[register-agent] setAgentURI agentId:", agentId.toString());
    const hash = await walletClient.writeContract({
      address: registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "setAgentURI",
      args: [agentId, agentURI]
    });
    console.log("[register-agent] tx:", hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("[register-agent] status:", receipt.status);
    const uri = await publicClient.readContract({
      address: registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenURI",
      args: [agentId]
    });
    console.log("[register-agent] tokenURI now:", uri);
    return;
  }

  const hash = await walletClient.writeContract({
    address: registry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentURI]
  });
  console.log("[register-agent] register tx:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("[register-agent] status:", receipt.status);
  if (receipt.status !== "success") {
    throw new Error("Registration transaction failed");
  }

  const agentId = extractAgentId(receipt.logs, registry);
  if (agentId === null) {
    console.warn(
      "[register-agent] could not decode agentId from logs — check explorer for Transfer/Registered"
    );
  } else {
    console.log("[register-agent] ✓ agentId:", agentId.toString());
    const owner = await publicClient.readContract({
      address: registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "ownerOf",
      args: [agentId]
    });
    const uri = await publicClient.readContract({
      address: registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenURI",
      args: [agentId]
    });
    console.log("[register-agent] ownerOf:", owner);
    console.log("[register-agent] tokenURI:", uri);
  }

  console.log("\n# Save for docs / env:");
  console.log(`AGENT_ID=${agentId?.toString() ?? ""}`);
  console.log(`AGENT_URI=${agentURI.startsWith("data:") ? "<data:…>" : agentURI}`);
  console.log(`REGISTER_TX=${hash}`);
  console.log(
    network === "mainnet"
      ? `https://celoscan.io/tx/${hash}`
      : `https://sepolia.celoscan.io/tx/${hash}`
  );
}

main().catch((err) => {
  console.error("[register-agent] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
