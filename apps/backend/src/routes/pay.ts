import { Router } from "express";
import { x402Gate } from "../middleware/x402gate.js";
import { markMemberPaid } from "../services/contract.js";
import { getSession, markPaidLocally } from "../services/db.js";

const router = Router();

/**
 * @openapi
 * /api/pay/{sessionId}/{memberAddress}/price:
 *   get:
 *     tags: [payment]
 *     summary: Get member share price
 *     description: Returns the price for a member's share. Call this before initiating x402 payment.
 *     operationId: getMemberPrice
 *     responses:
 *       200:
 *         description: Price returned
 *       404:
 *         description: Session/member not found
 *       409:
 *         description: Already paid
 */
router.get("/:sessionId/:memberAddress/price", async (req, res) => {
  const { sessionId, memberAddress } = req.params;

  const session = await getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "NotFound", message: "Session not found", statusCode: 404 });
    return;
  }

  const memberEntry = session.members.find(
    (m) => m.address.toLowerCase() === memberAddress.toLowerCase()
  );
  if (!memberEntry) {
    res.status(404).json({ error: "NotFound", message: "Member not found", statusCode: 404 });
    return;
  }
  if (memberEntry.paid) {
    res.status(409).json({ error: "AlreadyPaid", message: "Member already paid", statusCode: 409 });
    return;
  }

  const dollarAmount = (Number(memberEntry.amount) / 1_000_000).toFixed(6);
  res.json({ price: `$${dollarAmount}`, amount: memberEntry.amount.toString() });
});

/**
 * @openapi
 * /api/pay/{sessionId}/{memberAddress}:
 *   get:
 *     tags: [payment]
 *     summary: Pay member share via x402
 *     description: >
 *       Charges the exact member amount through x402 and then marks paid on-chain.
 *       The price must be passed as a query param ?price=$X.XXXXXX (obtained from the /price endpoint).
 *       The x402 gate runs immediately as middleware so the 402 challenge is returned fast.
 *     operationId: payMemberShare
 *     responses:
 *       200:
 *         description: Paid
 *       402:
 *         description: x402 payment required
 *       404:
 *         description: Session/member not found
 *       409:
 *         description: Already paid
 */
router.get(
  "/:sessionId/:memberAddress",
  // x402Gate runs FIRST — price comes from the query param set by the client
  // after calling the /price endpoint. This ensures the 402 challenge is
  // returned immediately without any async DB work blocking it.
  (req, res, next) => {
    const price = req.query.price as string;
    if (!price || !price.startsWith("$")) {
      res.status(400).json({
        error: "BadRequest",
        message: "Missing or invalid ?price query param. Call /price first.",
        statusCode: 400,
      });
      return;
    }
    return x402Gate(price)(req, res, next);
  },
  // Payment handler — only runs after x402 proof is verified
  async (req, res, next) => {
    try {
      const { sessionId, memberAddress } = req.params;

      const session = await getSession(sessionId);
      if (!session) {
        res.status(404).json({ error: "NotFound", message: "Session not found", statusCode: 404 });
        return;
      }

      const memberEntry = session.members.find(
        (m) => m.address.toLowerCase() === memberAddress.toLowerCase()
      );
      if (!memberEntry) {
        res.status(404).json({ error: "NotFound", message: "Member not found", statusCode: 404 });
        return;
      }
      if (memberEntry.paid) {
        res.status(409).json({ error: "AlreadyPaid", message: "Member already paid", statusCode: 409 });
        return;
      }

      const txHash = await markMemberPaid(sessionId, memberAddress as `0x${string}`);
      await markPaidLocally(sessionId, memberAddress, txHash);
      res.json({ paid: true, txHash, amount: memberEntry.amount.toString() });
    } catch (error) {
      next(error);
    }
  }
);

export default router;