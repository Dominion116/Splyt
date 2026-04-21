import { NextFunction, Request, Response } from "express";
import { settlePayment } from "../services/x402.js";

export function x402Gate(price: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Accept common proof header names used by different x402 clients.
      const proof =
        req.header("x-x402-proof") ??
        req.header("x402-proof") ??
        req.header("x-payment") ??
        req.header("x-payment-proof");
      const settlement = await settlePayment(proof, price, req.ip);
      if (!settlement.ok) {
        Object.entries(settlement.challengeHeaders ?? {}).forEach(([k, v]) => {
          res.setHeader(k, v);
        });
        res.status(402).json({
          error: "Payment Required",
          message: "x402 payment proof required",
          statusCode: 402
        });
        return;
      }
      req.x402Receipt = settlement.receipt;
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "x402 middleware failed";
      res.status(500).json({
        error: "InternalServerError",
        message: message.slice(0, 180),
        statusCode: 500
      });
    }
  };
}
