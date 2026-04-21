import { NextFunction, Request, Response } from "express";
import { settlePayment } from "../services/x402.js";

export function x402Gate(price: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Accept all common proof header names used by different x402 clients.
      const proof =
        req.header("x-payment") ??
        req.header("payment-signature") ??
        req.header("x-x402-proof") ??
        req.header("x402-proof") ??
        req.header("x-payment-proof");

      const host = req.header("x-forwarded-host") ?? req.header("host") ?? "localhost:3001";
      const proto = req.header("x-forwarded-proto") ?? req.protocol;
      const resourceUrl = `${proto}://${host}${req.originalUrl}`;

      const settlement = await settlePayment(proof, price, {
        payerHint: req.ip,
        method: req.method,
        resourceUrl
      });

      if (!settlement.ok) {
        // Parse the paymentRequirements we stashed in challengeHeaders.
        const { __paymentRequirementsJson, ...httpHeaders } = settlement.challengeHeaders ?? {};

        let paymentRequirements: unknown[];
        try {
          paymentRequirements = __paymentRequirementsJson
            ? (JSON.parse(__paymentRequirementsJson) as unknown[])
            : buildInlineRequirements(price, resourceUrl);
        } catch {
          paymentRequirements = buildInlineRequirements(price, resourceUrl);
        }

        // Set any real HTTP headers the runtime returned (e.g. from thirdweb).
        Object.entries(httpHeaders).forEach(([k, v]) => {
          res.setHeader(k, v);
        });

        // Standard x402 v2 response body — thirdweb expects `accepts` here.
        res.status(402).json(buildPaymentRequiredBody(paymentRequirements, resourceUrl));
        return;
      }

      req.x402Receipt = settlement.receipt;
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "x402 middleware failed";
      console.error("[x402gate] Unexpected error:", message);
      res.status(500).json({
        error: "InternalServerError",
        message: message.slice(0, 180),
        statusCode: 500
      });
    }
  };
}

function buildPaymentRequiredBody(paymentRequirements: unknown[], resourceUrl: string) {
  return {
    x402Version: 2,
    error: "Payment required",
    accepts: paymentRequirements,
    resource: {
      url: resourceUrl
    }
  };
}

/**
 * Inline fallback in case challengeHeaders didn't carry paymentRequirements.
 * Mirrors the logic in x402.ts buildPaymentRequirements.
 */
function buildInlineRequirements(price: string, resourceUrl: string) {
  const numericAmount = parseFloat(price.replace("$", ""));
  const amountInAtomicUnits = String(Math.round(numericAmount * 1_000_000));
  const cusdAddress = process.env.CUSD_ADDRESS ?? "0x765de816845861e75a25fca122bb6898b8b1282a";
  const hostWalletAddress = process.env.HOST_WALLET_ADDRESS ?? "";

  return [
    {
      scheme: "exact",
      network: "celo",
      maxAmountRequired: amountInAtomicUnits,
      resource: resourceUrl,
      description: "Splyt payment — bill split fee",
      mimeType: "application/json",
      payTo: hostWalletAddress,
      maxTimeoutSeconds: 300,
      asset: cusdAddress,
      extra: {
        name: "cUSD",
        decimals: "6"
      }
    }
  ];
}