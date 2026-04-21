export interface X402Result {
  ok: boolean;
  receipt?: {
    id: string;
    amount: string;
    payer: string;
  };
  challengeHeaders?: Record<string, string>;
}

type SettleContext = {
  resourceUrl: string;
  method: string;
  payerHint?: string;
};

const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const hostWalletAddress = process.env.HOST_WALLET_ADDRESS;
// mainnet cUSD — override via CUSD_ADDRESS env var if needed
const cusdAddress = process.env.CUSD_ADDRESS ?? "0x765de816845861e75a25fca122bb6898b8b1282a";

type ThirdwebRuntime = {
  chain: unknown;
  settlePayment: (args: Record<string, unknown>) => Promise<{
    status: number;
    responseHeaders?: Record<string, string>;
    paymentReceipt?: { transaction?: string; payer?: string };
  }>;
  facilitator: unknown;
};

let runtimeCache: ThirdwebRuntime | null | undefined;

async function loadThirdwebRuntime(): Promise<ThirdwebRuntime | null> {
  if (runtimeCache !== undefined) return runtimeCache;
  if (!thirdwebSecretKey || !hostWalletAddress) {
    console.warn("[x402] Missing env vars (THIRDWEB_SECRET_KEY=" + (thirdwebSecretKey ? "set" : "missing") + ", HOST_WALLET_ADDRESS=" + (hostWalletAddress ? "set" : "missing") + ") — falling back to challenge-only mode.");
    runtimeCache = null;
    return runtimeCache;
  }

  try {
    console.info("[x402] Loading thirdweb runtime...");
    // Use indirect dynamic import so local development can run without thirdweb installed.
    const importModule = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
    console.debug("[x402] Starting parallel imports (thirdweb, chains, x402)...");
    const [{ createThirdwebClient }, { celo }, x402] = await Promise.all([
      importModule("thirdweb"),
      importModule("thirdweb/chains"),
      importModule("thirdweb/x402")
    ]);
    console.debug("[x402] Imports successful, creating client and facilitator...");

    const client = createThirdwebClient({ secretKey: thirdwebSecretKey });
    const facilitatorInstance = x402.facilitator({
      client,
      serverWalletAddress: hostWalletAddress,
      waitUntil: "submitted"
    });

    runtimeCache = {
      chain: celo,
      settlePayment: x402.settlePayment,
      facilitator: facilitatorInstance
    };
    console.log("[x402] ✓ Thirdweb runtime loaded successfully (celo chain, facilitator ready).");
    return runtimeCache;
  } catch (err) {
    console.error("[x402] ✗ Failed to load thirdweb runtime (falling back to challenge-only):", err instanceof Error ? err.message : err);
    runtimeCache = null;
    return runtimeCache;
  }
}

/**
 * Builds a standard x402-compliant paymentRequirements object.
 * This is what thirdweb's useFetchWithPayment hook reads from a 402 response body.
 */
function buildPaymentRequirements(price: string, resourceUrl: string) {
  // cUSD has 18 decimals on Celo.
  // Use string math to avoid IEEE float issues when scaling to 1e18.
  const amountInAtomicUnits = decimalToAtomic(price.replace("$", "").trim(), 18);

  return [
    {
      scheme: "exact",
      network: "eip155:42220",
      maxAmountRequired: amountInAtomicUnits,
      resource: resourceUrl,
      description: "Splyt payment — bill split fee",
      mimeType: "application/json",
      payTo: hostWalletAddress ?? "",
      maxTimeoutSeconds: 300,
      asset: cusdAddress,
      extra: {
        // thirdweb uses this to build EIP-2612 permit typed data (EIP-712 domain).
        // The token at 0x765d… reports name="Mento Dollar" and symbol="USDm" on-chain.
        // Permit signatures are domain-separated by token name, so this must match.
        name: "Mento Dollar",
        version: "1",
        symbol: "USDm",
        // Keep as string for compatibility with some x402 clients.
        decimals: "18"
      }
    }
  ];
}

function decimalToAtomic(value: string, decimals: number): string {
  const normalized = value.trim();
  if (!normalized) return "0";

  const [wholePartRaw, fractionalPartRaw = ""] = normalized.split(".");
  const wholePart = wholePartRaw === "" ? "0" : wholePartRaw;
  const fractionalPadded = (fractionalPartRaw + "0".repeat(decimals)).slice(0, decimals);

  const base = 10n ** BigInt(decimals);
  const wholeAtomic = BigInt(wholePart) * base;
  const fractionalAtomic = BigInt(fractionalPadded === "" ? "0" : fractionalPadded);
  return (wholeAtomic + fractionalAtomic).toString();
}

function fallbackChallenge(price: string, resourceUrl: string): X402Result {
  return {
    ok: false,
    // Store serialized paymentRequirements so x402gate can include it in the 402 body.
    challengeHeaders: {
      "__paymentRequirementsJson": JSON.stringify(buildPaymentRequirements(price, resourceUrl))
    }
  };
}

export async function settlePayment(
  x402Proof: string | undefined,
  price: string,
  context: SettleContext
): Promise<X402Result> {
  const settleId = `settle-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  console.info(`[x402:${settleId}] settlePayment called: price=${price}, hasProof=${!!x402Proof}, resource=${context.resourceUrl}`);

  // No proof provided — always return a challenge regardless of runtime availability.
  if (!x402Proof) {
    console.info(`[x402:${settleId}] No payment proof provided -> returning challenge`);
    return fallbackChallenge(price, context.resourceUrl);
  }
  console.info(`[x402:${settleId}] Payment proof found (${x402Proof.slice(0, 30)}...)`);

  // Only load the thirdweb runtime when we actually have a proof to settle.
  // This keeps the initial 402 challenge fast and avoids client-side timeouts.
  const runtime = await loadThirdwebRuntime();

  // No runtime (missing env vars or import failed) — can't settle, return challenge.
  if (!runtime || !hostWalletAddress) {
    console.warn(`[x402:${settleId}] Runtime unavailable (runtime=${!!runtime}, hostWallet=${!!hostWalletAddress}) -> returning challenge`);
    return fallbackChallenge(price, context.resourceUrl);
  }
  console.info(`[x402:${settleId}] Runtime available, attempting to settle payment...`);

  try {
    console.debug(`[x402:${settleId}] Calling runtime.settlePayment with price=${price}, method=${context.method}`);
    const result = await runtime.settlePayment({
      resourceUrl: context.resourceUrl,
      method: context.method,
      paymentData: x402Proof,
      payTo: hostWalletAddress,
      network: runtime.chain,
      price,
      facilitator: runtime.facilitator
    });

    console.info(`[x402:${settleId}] settlePayment response: status=${result.status}`);
    
    if (result.status !== 200) {
      console.warn(`[x402:${settleId}] Settlement rejected (status ${result.status}), returning challenge`);
      return {
        ok: false,
        challengeHeaders: {
          ...result.responseHeaders,
          "__paymentRequirementsJson": JSON.stringify(buildPaymentRequirements(price, context.resourceUrl))
        }
      };
    }

    const paymentReceipt = result.paymentReceipt;
    if (!paymentReceipt?.transaction) {
      console.warn(`[x402:${settleId}] No transaction in receipt, returning challenge`);
      return {
        ok: false,
        challengeHeaders: {
          ...(result.responseHeaders ?? {}),
          "__paymentRequirementsJson": JSON.stringify(buildPaymentRequirements(price, context.resourceUrl))
        }
      };
    }

    console.info(`[x402:${settleId}] ✓ Payment settled: tx=${paymentReceipt.transaction.slice(0, 20)}..., payer=${paymentReceipt.payer ?? "unknown"}`);
    return {
      ok: true,
      receipt: {
        id: paymentReceipt.transaction,
        amount: price,
        payer: paymentReceipt.payer ?? context.payerHint ?? "unknown"
      }
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[x402:${settleId}] ✗ settlePayment threw error: ${errMsg}`);
    console.debug(`[x402:${settleId}] Error stack:`, err instanceof Error ? err.stack : "(no stack)");
    return fallbackChallenge(price, context.resourceUrl);
  }
}