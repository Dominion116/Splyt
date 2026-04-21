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
    console.warn("[x402] Missing THIRDWEB_SECRET_KEY or HOST_WALLET_ADDRESS — falling back to challenge-only mode.");
    runtimeCache = null;
    return runtimeCache;
  }

  try {
    // Use indirect dynamic import so local development can run without thirdweb installed.
    const importModule = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
    const [{ createThirdwebClient }, { celo }, x402] = await Promise.all([
      importModule("thirdweb"),
      importModule("thirdweb/chains"),
      importModule("thirdweb/x402")
    ]);

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
    console.log("[x402] Thirdweb runtime loaded successfully.");
    return runtimeCache;
  } catch (err) {
    console.error("[x402] Failed to load thirdweb runtime — falling back to challenge-only mode:", err);
    runtimeCache = null;
    return runtimeCache;
  }
}

/**
 * Builds a standard x402-compliant paymentRequirements object.
 * This is what thirdweb's useFetchWithPayment hook reads from a 402 response body.
 */
function buildPaymentRequirements(price: string, resourceUrl: string) {
  const numericAmount = parseFloat(price.replace("$", ""));
  // cUSD has 6 decimal places (same as USDC)
  const amountInAtomicUnits = String(Math.round(numericAmount * 1_000_000));

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
        name: "cUSD",
        decimals: "6"
      }
    }
  ];
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
  const runtime = await loadThirdwebRuntime();

  // No proof provided — always return a challenge regardless of runtime availability.
  if (!x402Proof) {
    return fallbackChallenge(price, context.resourceUrl);
  }

  // No runtime (missing env vars or import failed) — can't settle, return challenge.
  if (!runtime || !hostWalletAddress) {
    console.warn("[x402] Runtime unavailable, returning challenge for resource:", context.resourceUrl);
    return fallbackChallenge(price, context.resourceUrl);
  }

  try {
    const result = await runtime.settlePayment({
      resourceUrl: context.resourceUrl,
      method: context.method,
      paymentData: x402Proof,
      payTo: hostWalletAddress,
      network: runtime.chain,
      price,
      facilitator: runtime.facilitator
    });

    if (result.status !== 200) {
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
      return {
        ok: false,
        challengeHeaders: {
          ...(result.responseHeaders ?? {}),
          "__paymentRequirementsJson": JSON.stringify(buildPaymentRequirements(price, context.resourceUrl))
        }
      };
    }

    return {
      ok: true,
      receipt: {
        id: paymentReceipt.transaction,
        amount: price,
        payer: paymentReceipt.payer ?? context.payerHint ?? "unknown"
      }
    };
  } catch (err) {
    console.error("[x402] settlePayment threw:", err);
    return fallbackChallenge(price, context.resourceUrl);
  }
}