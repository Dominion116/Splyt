import { HTTPFacilitatorClient } from "@x402/core/server";
import { FACILITATOR_URL, resolveX402Network } from "./config.js";

/**
 * Hosted Celo x402 facilitator client.
 * API key is sent only to the facilitator (verify/settle/supported), never to buyers.
 */
export function createFacilitatorClient(): HTTPFacilitatorClient {
  const apiKey = process.env.X402_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("X402_API_KEY is required for x402 agent routes");
  }

  const network = resolveX402Network();
  const url = FACILITATOR_URL[network];

  return new HTTPFacilitatorClient({
    url,
    createAuthHeaders: async () => {
      const h = { "X-API-Key": apiKey };
      return { verify: h, settle: h, supported: h };
    }
  });
}
