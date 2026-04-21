import { Router } from "express";
import { x402Gate } from "../middleware/x402gate.js";
import { markMemberPaid } from "../services/contract.js";
import { getSession, markPaidLocally } from "../services/db.js";

const router = Router();

/**
 * @openapi
 * /api/pay/{sessionId}/{memberAddress}:
 *   get:
 *     tags: [payment]
 *     summary: Pay member share via x402
 *     description: Charges the exact member amount through x402 and then marks paid on-chain.
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
router.get("/:sessionId/:memberAddress", async (req, res, next) => {
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

    // Convert atomic units (stored as bigint-compatible string) to a dollar price string.
    // memberEntry.amount is in cUSD micro-units (6 decimals).
    const dollarAmount = (Number(memberEntry.amount) / 1_000_000).toFixed(6);
    const price = `$${dollarAmount}`;

    const gate = x402Gate(price);
    await gate(req, res, async () => {
      try {
        const txHash = await markMemberPaid(sessionId, memberAddress as `0x${string}`);
        await markPaidLocally(sessionId, memberAddress, txHash);
        res.json({ paid: true, txHash, amount: memberEntry.amount.toString() });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;