import { Router } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middleware/validate.js";
import { handleParseReceipt, parseBodySchema } from "../services/parseHandler.js";
import { getAgentParseRouteConfig, isX402Configured } from "../x402/config.js";

const router = Router();

// Secondary abuse limit; primary metering is x402 settlement.
const agentParseLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "RateLimitExceeded",
    message: "Too many agent parse requests. Try again in a minute.",
    statusCode: 429
  },
  handler(_req, res, _next, options) {
    res.status(429).json(options.message);
  }
});

const parseBodyParser = express.json({ limit: "3mb" });

/**
 * @openapi
 * /api/v1/agent/parse:
 *   post:
 *     tags: [agent]
 *     summary: Parse receipt (x402 paid)
 *     description: |
 *       Machine-facing parse endpoint. Requires USDC payment via Celo x402 facilitator.
 *       Without payment headers returns HTTP 402. Human UI must use free POST /api/parse.
 *     operationId: agentParseReceipt
 *     responses:
 *       200:
 *         description: Parsed receipt (after successful payment settlement)
 *       402:
 *         description: Payment required
 *       415:
 *         description: Invalid image format
 *       422:
 *         description: Parse failed
 *       503:
 *         description: x402 not configured on this server
 */
router.get("/health", (_req, res) => {
  if (!isX402Configured()) {
    res.status(503).json({
      ok: false,
      service: "splyt-agent",
      x402: false,
      message:
        "Set X402_API_KEY and SELLER_PAY_TO to enable paid agent parse (https://x402.celo.org)"
    });
    return;
  }
  try {
    const cfg = getAgentParseRouteConfig();
    res.json({
      ok: true,
      service: "splyt-agent",
      x402: true,
      network: cfg.network,
      networkName: cfg.networkName,
      payTo: cfg.payTo,
      price: cfg.price,
      parse: "POST /api/v1/agent/parse",
      freeUiParse: "POST /api/parse"
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: "splyt-agent",
      x402: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post(
  "/parse",
  agentParseLimiter,
  parseBodyParser,
  validateBody(parseBodySchema),
  (req, res, next) => {
    if (!isX402Configured()) {
      res.status(503).json({
        error: "X402NotConfigured",
        message:
          "Agent parse requires X402_API_KEY and SELLER_PAY_TO. Create a key at https://x402.celo.org",
        statusCode: 503
      });
      return;
    }
    // Payment is enforced by paymentMiddleware mounted in index.ts for this path.
    void handleParseReceipt(req, res, next, "agent-parse");
  }
);

export default router;
