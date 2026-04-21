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

// Keep CORS open by default so the app can be used from MiniPay and regular browsers.
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "splyt-backend" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/api/parse", parseRoute);
app.use("/api/session", sessionRoute);
app.use("/api/pay", payRoute);
app.use("/api/status", statusRoute);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = 500;
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(statusCode).json({
    error: "InternalServerError",
    message,
    statusCode
  });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`SPLYT backend running on :${port}`);
});
