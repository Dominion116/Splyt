import "dotenv/config";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import parseRoute from "./routes/parse.js";
import payRoute from "./routes/pay.js";
import sessionRoute from "./routes/session.js";
import statusRoute from "./routes/status.js";
import { openApiDocument } from "./swagger.js";

const app = express();
const port = Number(process.env.PORT ?? "3001");

// ---------------------------------------------------------------------------
// Startup env checks — log warnings early so Render logs make issues obvious.
// ---------------------------------------------------------------------------
const requiredEnvVars = [
  "THIRDWEB_SECRET_KEY",
  "ANTHROPIC_API_KEY",
  "HOST_WALLET_ADDRESS",
  "HOST_WALLET_PRIVATE_KEY",
  "SPLYT_SESSION_CONTRACT",
  "CELO_RPC_URL"
];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.warn(`[startup] WARNING: env var ${key} is not set`);
  }
}
if (!process.env.CUSD_ADDRESS) {
  console.info("[startup] CUSD_ADDRESS not set — defaulting to mainnet cUSD: 0x765de816845861e75a25fca122bb6898b8b1282a");
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Keep CORS open so the app works from MiniPay and regular browsers.
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "splyt-backend" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/api/parse", parseRoute);
app.use("/api/session", sessionRoute);
app.use("/api/pay", payRoute);
app.use("/api/status", statusRoute);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error("[global error handler]", message);
  res.status(500).json({
    error: "InternalServerError",
    message,
    statusCode: 500
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`SPLYT backend running on :${port}`);
});