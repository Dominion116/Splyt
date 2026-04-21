import { Router } from "express";
import { z } from "zod";
import { x402Gate } from "../middleware/x402gate.js";
import { validateBody } from "../middleware/validate.js";
import { ParseError, parseReceipt } from "../services/ai.js";

const router = Router();

const schema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"])
});

/**
 * @openapi
 * /api/parse:
 *   post:
 *     tags: [parse]
 *     summary: Parse receipt image
 *     description: x402-gated receipt parsing with Groq Vision.
 *     operationId: parseReceipt
 *     responses:
 *       200:
 *         description: Parsed receipt
 *       402:
 *         description: x402 payment required
 *       422:
 *         description: Parse failed
 */
router.post("/", x402Gate("$0.01"), validateBody(schema), async (req, res, next) => {
  const parseId = `parse-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  try {
    const imageSize = req.body.imageBase64.length;
    console.info(`[parse:${parseId}] Parsing receipt: mimeType=${req.body.mimeType}, imageSize=${imageSize}`);
    
    const parsed = await parseReceipt(req.body.imageBase64, req.body.mimeType);
    
    console.info(`[parse:${parseId}] ✓ Parse succeeded: ${parsed.items.length} items, total=$${parsed.total}`);
    res.json(parsed);
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(`[parse:${parseId}] Parse error: ${error.message}`);
      res.status(422).json({
        error: "ParseError",
        message: error.message,
        statusCode: 422
      });
      return;
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[parse:${parseId}] Unexpected error: ${errMsg}`);
    next(error);
  }
});

export default router;
