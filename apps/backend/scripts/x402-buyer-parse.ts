/**
 * Buyer-side smoke test for POST /api/v1/agent/parse (x402 USDC).
 *
 * Env:
 *   BUYER_PRIVATE_KEY   — wallet with USDC on the target network
 *   AGENT_PARSE_URL     — default http://localhost:3001/api/v1/agent/parse
 *   X402_NETWORK        — testnet | mainnet (default testnet)
 *   SAMPLE_IMAGE_PATH   — optional path to a receipt image (jpeg/png/webp)
 *
 * Fund testnet USDC: https://faucet.circle.com (Celo Sepolia)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

function mimeFromPath(p: string): "image/jpeg" | "image/png" | "image/webp" {
  const lower = p.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/** 1x1 PNG (valid magic bytes) — model may fail parse; payment still settles. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function main() {
  const pk = process.env.BUYER_PRIVATE_KEY;
  if (!pk?.startsWith("0x")) {
    throw new Error("BUYER_PRIVATE_KEY (0x…) is required");
  }

  const url =
    process.env.AGENT_PARSE_URL?.trim() ||
    "http://localhost:3001/api/v1/agent/parse";

  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log("[buyer] address:", account.address);
  console.log("[buyer] url:", url);

  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(account));
  const payFetch = wrapFetchWithPayment(fetch, client);

  let imageBase64 = TINY_PNG_BASE64;
  let mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/png";
  if (process.env.SAMPLE_IMAGE_PATH) {
    const buf = readFileSync(process.env.SAMPLE_IMAGE_PATH);
    imageBase64 = buf.toString("base64");
    mimeType = mimeFromPath(process.env.SAMPLE_IMAGE_PATH);
  }

  const res = await payFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType })
  });

  console.log("[buyer] status:", res.status);
  const paymentResponse =
    res.headers.get("payment-response") ||
    res.headers.get("x-payment-response") ||
    res.headers.get("PAYMENT-RESPONSE");
  if (paymentResponse) {
    console.log("[buyer] payment-response header present (len)", paymentResponse.length);
  }

  const text = await res.text();
  try {
    console.log("[buyer] body:", JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log("[buyer] body:", text);
  }

  if (!res.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[buyer] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
