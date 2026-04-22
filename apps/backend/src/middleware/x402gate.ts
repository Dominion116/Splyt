import { NextFunction, Request, Response } from "express";
import { settlePayment } from "../services/x402.js";

export function x402Gate(price: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      console.info(`[x402gate:${requestId}] Starting payment gate for price: ${price}`);
      
      // Accept all common proof header names used by different x402 clients.
      const proof =
        req.header("x-payment") ??
        req.header("payment-signature") ??
        req.header("x-x402-proof") ??
        req.header("x402-proof") ??
        req.header("x-payment-proof");
      
      if (proof) {
        console.info(`[x402gate:${requestId}] Payment proof found (${proof.slice(0, 20)}...)`);
      } else {
        console.info(`[x402gate:${requestId}] No payment proof — will return 402 challenge`);
      }

      const host = req.header("x-forwarded-host") ?? req.header("host") ?? "localhost:3001";
      const proto = req.header("x-forwarded-proto") ?? req.protocol;
      const resourceUrl = `${proto}://${host}${req.originalUrl}`;
      console.debug(`[x402gate:${requestId}] Resource URL: ${resourceUrl}`);

      const settlement = await settlePayment(proof, price, {
        payerHint: req.ip,
        method: req.method,
        resourceUrl
      });
      
      console.info(`[x402gate:${requestId}] Settlement result: ok=${settlement.ok}`);

      if (!settlement.ok) {
        console.info(`[x402gate:${requestId}] Returning 402 challenge`);
        
        // Parse the paymentRequirements we stashed in challengeHeaders.
        const { __paymentRequirementsJson, ...httpHeaders } = settlement.challengeHeaders ?? {};
        console.debug(`[x402gate:${requestId}] Challenge headers keys: ${Object.keys(httpHeaders).join(", ")}`);

        let paymentRequirements: unknown[];
        try {
          if (__paymentRequirementsJson) {
            console.debug(`[x402gate:${requestId}] Parsing paymentRequirements from settlement`);
            paymentRequirements = JSON.parse(__paymentRequirementsJson) as unknown[];
          } else {
            console.warn(`[x402gate:${requestId}] No paymentRequirements in settlement, building inline`);
            paymentRequirements = buildInlineRequirements(price, resourceUrl);
          }
        } catch (parseErr) {
          console.error(`[x402gate:${requestId}] Failed to parse paymentRequirements, building inline:`, parseErr);
          paymentRequirements = buildInlineRequirements(price, resourceUrl);
        }

        console.info(`[x402gate:${requestId}] Payment requirements count: ${paymentRequirements.length}`);
        if (Array.isArray(paymentRequirements) && paymentRequirements.length > 0) {
          const firstReq = (paymentRequirements[0] as Record<string, unknown>);
          console.debug(`[x402gate:${requestId}] First requirement: network=${firstReq.network}, scheme=${firstReq.scheme}, asset=${String(firstReq.asset).slice(0, 10)}...`);
        }

        // Set any real HTTP headers the runtime returned (e.g. from thirdweb).
        Object.entries(httpHeaders).forEach(([k, v]) => {
          res.setHeader(k, v);
          console.debug(`[x402gate:${requestId}] Set response header: ${k}`);
        });

        // Standard x402 v2 response body — thirdweb expects `accepts` here.
        const body = buildPaymentRequiredBody(paymentRequirements, resourceUrl);
        console.info(`[x402gate:${requestId}] Sending 402 response with x402Version=${body.x402Version}, accepts.length=${body.accepts.length}`);
        res.status(402).json(body);
        return;
      }

      req.x402Receipt = settlement.receipt;
      console.info(`[x402gate:${requestId}] Payment verified, proceeding to next handler`);
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "x402 middleware failed";
      const stack = error instanceof Error ? error.stack : "";
      console.error(`[x402gate:${requestId}] Unexpected error: ${message}\n${stack}`);
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
  const amountInAtomicUnits = decimalToAtomic(price.replace("$", "").trim(), 18);
  const cusdAddress = process.env.CUSD_ADDRESS ?? "0x765de816845861e75a25fca122bb6898b8b1282a";
  const hostWalletAddress = process.env.HOST_WALLET_ADDRESS ?? "";

  return [
    {
      scheme: "exact",
      network: "eip155:42220",
      maxAmountRequired: amountInAtomicUnits,
      resource: resourceUrl,
      description: "Splyt payment — bill split fee",
      mimeType: "application/json",
      payTo: hostWalletAddress,
      maxTimeoutSeconds: 300,
      asset: cusdAddress,
      extra: {
        // Keep this aligned with service metadata so fallback challenges remain payable.
        // Explicit transfer authorization avoids wallet-side method detection failures.
        primaryType: "TransferWithAuthorization",
        name: "Mento Dollar",
        version: "1",
        symbol: "USDm",
        // USDm uses 18 decimals on Celo.
        decimals: "18"
      }
    }
  ];
}

function decimalToAtomic(value: string, decimals: number): string {
  const normalized = value.trim();
  if (!normalized) return "0";

  const [wholePartRaw, fractionalPartRaw = ""] = normalized.split(".");
  const wholePart = wholePartRaw === "" ? "0" : wholePartRaw;
  const fractionalPadded = (fractionalPartRaw + "0".repeat(decimals)).slice(0, decimals);

  const base = 10n ** BigInt(decimals);
  const wholeAtomic = BigInt(wholePart) * base;
  const fractionalAtomic = BigInt(fractionalPadded === "" ? "0" : fractionalPadded);
  return (wholeAtomic + fractionalAtomic).toString();
}