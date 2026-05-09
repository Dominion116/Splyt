import { Router } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { ParseError, parseReceipt } from "../services/ai.js";

const router = Router();

// 5 requests / 60 s per IP — prevents Groq quota exhaustion.
const parseLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "RateLimitExceeded", message: "Too many parse requests. Try again in a minute.", statusCode: 429 },
  handler(req, res, _next, options) {
    res.status(429).json(options.message);
  }
});

// Tighter body limit for this route only — overrides the global 2 MB cap.
// Base64-encoded image at 1.5 MB = ~2 MB on the wire; 3 MB gives headroom
// for a large receipt photo while still bounding Groq token costs.
const parseBodyParser = express.json({ limit: "3mb" });

// Known MIME types and their magic byte signatures (first 3–4 bytes, base64-decoded).
const MAGIC: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png":  [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]] // "RIFF"
};

function validateImageMagicBytes(base64: string, mimeType: string): boolean {
  try {
    const bytes = Buffer.from(base64.slice(0, 8), "base64");
    const signatures = MAGIC[mimeType];
    if (!signatures) return false;
    return signatures.some((sig) =>
      sig.every((byte, i) => bytes[i] === byte)
    );
  } catch {
    return false;
  }
}

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
 *     description: Direct receipt parsing with Groq Vision (no payment required).
 *     operationId: parseReceipt
 *     responses:
 *       200:
 *         description: Parsed receipt
 *       422:
 *         description: Parse failed
 *       429:
 *         description: Rate limit exceeded
 */
router.post("/", parseLimiter, parseBodyParser, validateBody(schema), async (req, res, next) => {
  const parseId = `parse-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  try {
    const { imageBase64, mimeType } = req.body as { imageBase64: string; mimeType: string };

    // Reject before hitting Groq if the image header doesn't match the declared MIME type.
    if (!validateImageMagicBytes(imageBase64, mimeType)) {
      res.status(415).json({
        error: "InvalidImageFormat",
        message: "Image bytes do not match the declared MIME type.",
        statusCode: 415
      });
      return;
    }

    const imageSize = imageBase64.length;
    console.info(`[parse:${parseId}] Parsing receipt: mimeType=${mimeType}, imageSize=${imageSize}`);

    const parsed = await parseReceipt(imageBase64, mimeType);

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
