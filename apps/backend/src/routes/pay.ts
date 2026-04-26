import { Router } from "express";
import type { Address } from "viem";
import { z } from "zod";
import { getSessionStatus, waitForTransactionReceipt } from "../services/contract.js";
import { validateBody } from "../middleware/validate.js";
import { getSession, markPaidLocally } from "../services/db.js";

const router = Router();

function asAddressArray(addresses: string[]): Address[] {
  return addresses as Address[];
}

const confirmSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

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

  // Fetch real-time session data from database
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

  // Check real-time payment status from blockchain
  const { members: memberStatuses } = await getSessionStatus(
    sessionId,
    asAddressArray(session.members.map((m) => m.address))
  );
  const blockchainStatus = memberStatuses.find(
    (m) => m.address.toLowerCase() === memberAddress.toLowerCase()
  );

  if (!blockchainStatus) {
    res.status(500).json({ error: "BlockchainError", message: "Could not verify payment status", statusCode: 500 });
    return;
  }

  if (blockchainStatus.paid) {
    res.status(409).json({ error: "AlreadyPaid", message: "Member already paid", statusCode: 409 });
    return;
  }

  // Return real-time price data
  res.json({
    price: memberEntry.amount.toString(),
    currency: "cUSD",
    decimals: 6,
    blockchainAmount: blockchainStatus.amountDue.toString()
  });
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
      res.status(410).json({
        error: "DeprecatedEndpoint",
        message: "Members must now sign the payment transaction from their own wallet, then call /confirm.",
        statusCode: 410
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/:sessionId/:memberAddress/confirm", validateBody(confirmSchema), async (req, res, next) => {
  try {
    const { sessionId, memberAddress } = req.params;
    const session = await getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "NotFound", message: "Session not found", statusCode: 404 });
      return;
    }

    const memberEntry = session.members.find((m) => m.address.toLowerCase() === memberAddress.toLowerCase());
    if (!memberEntry) {
      res.status(404).json({ error: "NotFound", message: "Member not found", statusCode: 404 });
      return;
    }

    await waitForTransactionReceipt(req.body.txHash as `0x${string}`);

    const { members: updatedStatuses } = await getSessionStatus(
      sessionId,
      asAddressArray(session.members.map((m) => m.address))
    );
    const updatedMember = updatedStatuses.find((m) => m.address.toLowerCase() === memberAddress.toLowerCase());

    if (!updatedMember?.paid) {
      res.status(400).json({
        error: "PaymentNotConfirmed",
        message: "The member payment transaction is not confirmed on-chain yet.",
        statusCode: 400
      });
      return;
    }

    await markPaidLocally(sessionId, memberAddress, req.body.txHash);

    res.json({
      paid: true,
      txHash: req.body.txHash,
      amount: memberEntry.amount.toString(),
      verified: true
    });
  } catch (error) {
    next(error);
  }
});

export default router;
