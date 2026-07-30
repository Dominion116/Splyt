import "dotenv/config";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import parseRoute from "./routes/parse.js";
import agentParseRoute from "./routes/agentParse.js";
import payRoute from "./routes/pay.js";
import sessionRoute from "./routes/session.js";
import statusRoute from "./routes/status.js";
import { openApiDocument } from "./swagger.js";
import { isX402Configured, resolveX402Network } from "./x402/config.js";
import { createAgentParsePaymentMiddleware } from "./x402/middleware.js";

const app = express();
const port = Number(process.env.PORT ?? "3001");

// ---------------------------------------------------------------------------
// Startup env checks — strict validation, no mock data fallbacks allowed.
// ---------------------------------------------------------------------------
import { validateEnvironment } from "./services/db.js";

try {
  validateEnvironment();
  console.log("[startup] ✓ All required environment variables are configured");
} catch (error) {
  console.error(`[startup] ✗ Environment validation failed: ${error}`);
  process.exit(1);
}
if (!process.env.USDM_ADDRESS) {
  console.info(
    "[startup] USDM_ADDRESS not set — defaulting to mainnet USDm: 0x765de816845861e75a25fca122bb6898b8b1282a"
  );
}

if (isX402Configured()) {
  try {
    const network = resolveX402Network();
    console.log(
      `[startup] ✓ x402 agent parse enabled (network=${network}, payTo=${process.env.SELLER_PAY_TO})`
    );
  } catch (error) {
    console.error(`[startup] ✗ x402 config invalid: ${error}`);
    process.exit(1);
  }
} else {
  console.warn(
    "[startup] ⚠ x402 not configured — POST /api/v1/agent/parse returns 503 until X402_API_KEY + SELLER_PAY_TO are set"
  );
}

// ---------------------------------------------------------------------------
// CORS — browser clients + x402 payment headers for agent tooling UIs.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(requestOrigin, callback) {
      if (!requestOrigin || ALLOWED_ORIGINS.includes(requestOrigin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-PAYMENT",
      "X-PAYMENT-RESPONSE",
      "PAYMENT-SIGNATURE",
      "X-Api-Key"
    ],
    exposedHeaders: [
      "X-PAYMENT-RESPONSE",
      "PAYMENT-RESPONSE",
      "payment-response",
      "PAYMENT-REQUIRED",
      "payment-required"
    ],
    credentials: false
  })
);

// Conservative global body limit — parse routes mount their own 3mb json parser.
app.use(express.json({ limit: "512kb" }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "splyt-backend",
    x402Configured: isX402Configured()
  });
});

// Mount the Swagger UI only outside of production.
if (process.env.NODE_ENV !== "production") {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

// Free human UI parse — never attach x402 here.
app.use("/api/parse", parseRoute);

// Agent path: x402 payment middleware (when configured) then handlers.
// Must run before the agent router so unpaid requests get 402.
if (isX402Configured()) {
  app.use(createAgentParsePaymentMiddleware());
}
app.use("/api/v1/agent", agentParseRoute);

app.use("/api/session", sessionRoute);
app.use("/api/pay", payRoute);
app.use("/api/status", statusRoute);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[global error handler]", error);
  res.status(500).json({
    error: "InternalServerError",
    message: "An unexpected error occurred. Please try again.",
    statusCode: 500
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`SPLYT backend running on :${port}`);
});
