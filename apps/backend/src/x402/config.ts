import type { Address } from "viem";

export type X402NetworkName = "testnet" | "mainnet";

function asAddress(value: string): Address {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return value as Address;
}

/** CAIP-2 network ids used by x402 v2 */
export const X402_CAIP = {
  mainnet: "eip155:42220",
  testnet: "eip155:11142220"
} as const;

export const USDC = {
  mainnet: asAddress("0xcebA9300f2b948710d2653dD7B07f33A8B32118C"),
  testnet: asAddress("0x01C5C0122039549AD1493B8220cABEdD739BC44E")
} as const;

export const FACILITATOR_URL = {
  mainnet: "https://api.x402.celo.org",
  testnet: "https://api.x402.sepolia.celo.org"
} as const;

/** Default $0.01 USDC (6 decimals) as atomic string. */
export const DEFAULT_PARSE_AMOUNT = "10000";

export function resolveX402Network(): X402NetworkName {
  const raw = (process.env.X402_NETWORK ?? "testnet").toLowerCase();
  if (raw === "mainnet" || raw === "celo") return "mainnet";
  if (raw === "testnet" || raw === "sepolia") return "testnet";
  throw new Error(`Invalid X402_NETWORK="${raw}" (use testnet|mainnet)`);
}

export function isX402Configured(): boolean {
  return Boolean(process.env.X402_API_KEY?.trim() && process.env.SELLER_PAY_TO?.trim());
}

export function getSellerPayTo(): Address {
  const raw = process.env.SELLER_PAY_TO?.trim();
  if (!raw) {
    throw new Error("SELLER_PAY_TO is required for x402 agent routes");
  }
  return asAddress(raw);
}

export function getParsePrice(network: X402NetworkName) {
  const amount = process.env.X402_PARSE_AMOUNT?.trim() || DEFAULT_PARSE_AMOUNT;
  if (!/^\d+$/.test(amount)) {
    throw new Error(`X402_PARSE_AMOUNT must be a decimal integer string, got "${amount}"`);
  }
  return {
    amount,
    asset: USDC[network],
    // EIP-712 domain for USDC EIP-3009 on Celo
    extra: { name: "USDC", version: "2" as const }
  };
}

export function getAgentParseRouteConfig() {
  const network = resolveX402Network();
  return {
    networkName: network,
    network: X402_CAIP[network],
    payTo: getSellerPayTo(),
    price: getParsePrice(network),
    facilitatorUrl: FACILITATOR_URL[network]
  };
}
