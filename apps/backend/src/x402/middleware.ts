import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { RequestHandler } from "express";
import { getAgentParseRouteConfig } from "./config.js";
import { createFacilitatorClient } from "./facilitator.js";

/**
 * Express payment middleware protecting POST /api/v1/agent/parse.
 * Must be mounted with app.use(...) before the route handler.
 */
export function createAgentParsePaymentMiddleware(): RequestHandler {
  const { network, payTo, price } = getAgentParseRouteConfig();
  const facilitator = createFacilitatorClient();

  const server = new x402ResourceServer(facilitator);
  server.register("eip155:*", new ExactEvmScheme());

  const routes = {
    "POST /api/v1/agent/parse": {
      accepts: [
        {
          scheme: "exact" as const,
          network,
          payTo,
          price
        }
      ],
      description: "Splyt AI receipt parse (agent / machine clients)"
    }
  };

  // v2 API: paymentMiddleware(routes, server) — routes first
  return paymentMiddleware(routes, server);
}
