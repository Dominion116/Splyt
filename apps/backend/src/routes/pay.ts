import { Router } from "express";
import { markMemberPaid } from "../services/contract.js";
import { getSession, markPaidLocally } from "../services/db.js";

const router = Router();

/**
 * @openapi
 * /api/pay/{sessionId}/{memberAddress}/price:
 *   get:
 *     tags: [payment]
 *     summary: Get member share price
 *     description: Returns the price for a member's share. Shows the amount due in micro-units.
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

  // Return the price in micro-units
  res.json({ price: memberEntry.amount.toString(), currency: "cUSD", decimals: 6 });
});

/**
 * @openapi
 * /api/pay/{sessionId}/{memberAddress}:
 *   get:
 *     tags: [payment]
 *     summary: Pay member share (direct contract)
 *     description: >
 *       Marks the member as paid on-chain. Frontend must handle payment transaction directly.
 *       Call /price first to get the amount due, then send payment to the contract.
 *     operationId: payMemberShareDirect
 *     responses:
 *       200:
 *         description: Paid
 *       404:
 *         description: Session/member not found
 *       409:
 *         description: Already paid
 */
router.get(
  "/:sessionId/:memberAddress",
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

      // Direct contract call to mark as paid
      const txHash = await markMemberPaid(sessionId, memberAddress as `0x${string}`);
      await markPaidLocally(sessionId, memberAddress, txHash);
      res.json({ paid: true, txHash, amount: memberEntry.amount.toString() });
    } catch (error) {
      next(error);
    }
  }
);

export default router;