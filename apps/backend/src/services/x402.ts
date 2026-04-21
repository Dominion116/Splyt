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
    runtimeCache = null;
    return runtimeCache;
  }

  try {
    // Use indirect dynamic import so local development can run without installing thirdweb in backend.
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
    return runtimeCache;
  } catch {
    runtimeCache = null;
    return runtimeCache;
  }
}

function fallbackChallenge(price: string): X402Result {
  return {
    ok: false,
    challengeHeaders: {
      "x402-protocol": "x402",
      "x402-price": price,
      "x402-pay-to": process.env.HOST_WALLET_ADDRESS ?? "",
      "x402-network": "celo"
    }
  };
}

export async function settlePayment(
  x402Proof: string | undefined,
  price: string,
  context: SettleContext
): Promise<X402Result> {
  const runtime = await loadThirdwebRuntime();
  if (!runtime || !hostWalletAddress) {
    return fallbackChallenge(price);
  }

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
      challengeHeaders: result.responseHeaders
    };
  }

  const paymentReceipt = result.paymentReceipt;
  if (!paymentReceipt || !paymentReceipt.transaction) {
    return {
      ok: false,
      challengeHeaders: result.responseHeaders ?? fallbackChallenge(price).challengeHeaders
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
}
