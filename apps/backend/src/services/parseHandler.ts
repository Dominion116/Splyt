import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ParseError, parseReceipt } from "./ai.js";

/** Shared body schema for UI and agent parse routes. */
export const parseBodySchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"])
});

export type ParseBody = z.infer<typeof parseBodySchema>;

const MAGIC: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]]
};

export function validateImageMagicBytes(base64: string, mimeType: string): boolean {
  try {
    const bytes = Buffer.from(base64.slice(0, 8), "base64");
    const signatures = MAGIC[mimeType];
    if (!signatures) return false;
    return signatures.some((sig) => sig.every((byte, i) => bytes[i] === byte));
  } catch {
    return false;
  }
}

/**
 * Shared receipt parse handler used by free UI route and paid agent route.
 * Assumes body already validated by Zod middleware.
 */
export async function handleParseReceipt(
  req: Request,
  res: Response,
  next: NextFunction,
  logPrefix = "parse"
): Promise<void> {
  const parseId = `${logPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  try {
    const { imageBase64, mimeType } = req.body as ParseBody;

    if (!validateImageMagicBytes(imageBase64, mimeType)) {
      res.status(415).json({
        error: "InvalidImageFormat",
        message: "Image bytes do not match the declared MIME type.",
        statusCode: 415
      });
      return;
    }

    console.info(
      `[${parseId}] Parsing receipt: mimeType=${mimeType}, imageSize=${imageBase64.length}`
    );

    const parsed = await parseReceipt(imageBase64, mimeType);

    console.info(
      `[${parseId}] ✓ Parse succeeded: ${parsed.items.length} items, total=$${parsed.total}`
    );
    res.json(parsed);
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(`[${parseId}] Parse error: ${error.message}`);
      res.status(422).json({
        error: "ParseError",
        message: error.message,
        statusCode: 422
      });
      return;
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${parseId}] Unexpected error: ${errMsg}`);
    next(error);
  }
}
