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
  try {
    const parsed = await parseReceipt(req.body.imageBase64, req.body.mimeType);
    res.json(parsed);
  } catch (error) {
    if (error instanceof ParseError) {
      res.status(422).json({
        error: "ParseError",
        message: error.message,
        statusCode: 422
      });
      return;
    }
    next(error);
  }
});

export default router;
