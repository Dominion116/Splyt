import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getSession } from "../services/db.js";
import { ChainSessionNotFoundError, getSessionStatus } from "../services/contract.js";

const router = Router();

// Per-process accounting for active SSE connections.
const MAX_PER_SESSION = 10;
const MAX_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes
const activeBySession = new Map<string, number>();

// Cap connection-open requests to /api/status — on top of the per-session
// counter — so a single IP can't exhaust the global pool by cycling sessions.
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "RateLimitExceeded", message: "Too many status connection requests.", statusCode: 429 },
  handler(req, res, _next, options) {
    res.status(429).json(options.message);
  }
});

/**
 * @openapi
 * /api/status/{sessionId}:
 *   get:
 *     tags: [status]
 *     summary: Stream payment status
 *     description: SSE endpoint that emits member payment status every 2 seconds.
 *     operationId: streamSessionStatus
 *     responses:
 *       200:
 *         description: Event stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get("/:sessionId", statusLimiter, async (req, res) => {
  const sessionId = String(req.params.sessionId);

  // Reject if the per-session connection cap is already saturated. This
  // prevents a single client (or a script across many tabs) from spinning
  // up unbounded RPC pollers against the same session.
  const current = activeBySession.get(sessionId) ?? 0;
  if (current >= MAX_PER_SESSION) {
    res.status(429).json({
      error: "TooManyConnections",
      message: `Reached the per-session limit of ${MAX_PER_SESSION} concurrent status streams.`,
      statusCode: 429
    });
    return;
  }

  const session = await getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Reserve a slot before any async work; release it whenever the connection
  // closes for any reason (poll detected stale session, lifetime expiry,
  // client disconnect, all-paid).
  activeBySession.set(sessionId, current + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const next = (activeBySession.get(sessionId) ?? 1) - 1;
    if (next <= 0) {
      activeBySession.delete(sessionId);
    } else {
      activeBySession.set(sessionId, next);
    }
  };

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let pollInterval: NodeJS.Timeout | undefined;
  let heartbeat: NodeJS.Timeout | undefined;
  let lifetime: NodeJS.Timeout | undefined;

  const closeStream = () => {
    if (pollInterval) clearInterval(pollInterval);
    if (heartbeat) clearInterval(heartbeat);
    if (lifetime) clearTimeout(lifetime);
    release();
    if (!res.writableEnded) res.end();
  };

  const poll = async () => {
    const latestSession = await getSession(sessionId);
    if (!latestSession) {
      closeStream();
      return;
    }

    let status;
    try {
      status = await getSessionStatus(
        sessionId,
        latestSession.members.map((m) => m.address as `0x${string}`)
      );
    } catch (error) {
      if (error instanceof ChainSessionNotFoundError) {
        send({
          members: latestSession.members.map((m) => ({
            address: m.address,
            amountDue: m.amount.toString(),
            paid: m.paid,
            paidAt: m.paidAt ?? null
          })),
          allPaid: latestSession.members.every((m) => m.paid),
          active: false,
          chainStatus: "missing"
        });
        closeStream();
        return;
      }
      // Surface a sanitized error event instead of leaking internals; the
      // client can show "Live updates unavailable" without us crashing the
      // request handler and leaving the slot leaked.
      send({ error: "ChainReadError" });
      closeStream();
      return;
    }
    send({
      members: status.members.map((m) => ({
        address: m.address,
        amountDue: m.amountDue.toString(),
        paid: m.paid,
        paidAt:
          latestSession.members.find((mem) => mem.address.toLowerCase() === m.address.toLowerCase())
            ?.paidAt ?? null
      })),
      allPaid: status.allPaid,
      active: status.active
    });
    if (status.allPaid) {
      closeStream();
    }
  };

  // Force-close the connection after the lifetime expires so long-lived
  // browser tabs (or pinned scripts) don't pin RPC capacity indefinitely.
  // Clients can reconnect; the per-session counter will reaccept them.
  lifetime = setTimeout(closeStream, MAX_LIFETIME_MS);

  await poll();
  pollInterval = setInterval(() => {
    void poll();
  }, 2000);
  heartbeat = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", closeStream);
});

export default router;
