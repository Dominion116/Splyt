import { Router } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middleware/validate.js";
import { handleParseReceipt, parseBodySchema } from "../services/parseHandler.js";

const router = Router();

// 5 requests / 60 s per IP — prevents Groq quota exhaustion on free UI path.
const parseLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "RateLimitExceeded",
    message: "Too many parse requests. Try again in a minute.",
    statusCode: 429
  },
  handler(_req, res, _next, options) {
    res.status(429).json(options.message);
  }
});

const parseBodyParser = express.json({ limit: "3mb" });

/**
 * @openapi
 * /api/parse:
 *   post:
 *     tags: [parse]
 *     summary: Parse receipt image (free UI)
 *     description: |
 *       Human MiniPay / browser path — free, rate-limited.
 *       Machine clients must use POST /api/v1/agent/parse (x402 paid).
 *     operationId: parseReceipt
 *     responses:
 *       200:
 *         description: Parsed receipt
 *       422:
 *         description: Parse failed
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  "/",
  parseLimiter,
  parseBodyParser,
  validateBody(parseBodySchema),
  (req, res, next) => {
    void handleParseReceipt(req, res, next, "parse");
  }
);

export default router;
