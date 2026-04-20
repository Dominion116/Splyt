import { Router } from "express";
import { getSession } from "../services/db.js";
import { getSessionStatus } from "../services/contract.js";

const router = Router();

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
router.get("/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  const session = await getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const poll = async () => {
    const latestSession = await getSession(sessionId);
    if (!latestSession) {
      clearInterval(pollInterval);
      clearInterval(heartbeat);
      res.end();
      return;
    }

    const status = await getSessionStatus(
      sessionId,
      latestSession.members.map((m) => m.address as `0x${string}`)
    );
    send({
      members: status.members.map((m) => ({
        address: m.address,
        paid: m.paid,
        paidAt: latestSession.members.find((mem) => mem.address.toLowerCase() === m.address.toLowerCase())?.paidAt ?? null
      })),
      allPaid: status.allPaid
    });
    if (status.allPaid) {
      clearInterval(pollInterval);
      clearInterval(heartbeat);
      res.end();
    }
  };

  await poll();
  const pollInterval = setInterval(() => {
    void poll();
  }, 2000);
  const heartbeat = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(pollInterval);
    clearInterval(heartbeat);
  });
});

export default router;
