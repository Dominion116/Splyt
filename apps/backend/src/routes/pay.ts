import { Router } from "express";
import type { Address } from "viem";
import { z } from "zod";
import {
  getSessionStatus,
  InvalidPaymentTxError,
  verifyMemberPaidTransaction
} from "../services/contract.js";
import { validateBody } from "../middleware/validate.js";
import { getSession, markPaidLocally } from "../services/db.js";

const router = Router();

function asAddressArray(addresses: string[]): Address[] {
  return addresses as Address[];
}

function asParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string") return value;
  throw new Error(`Missing or invalid route parameter: ${name}`);
}

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
// UUID v4 with dashes; we don't accept arbitrary session id formats here.
const SESSION_ID_REGEX = /^[0-9a-fA-F-]{1,64}$/;

class InvalidParamError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "InvalidParamError";
  }
}

function asAddressParam(value: string | string[] | undefined, name: string): string {
  const raw = asParam(value, name);
  if (!ADDRESS_REGEX.test(raw)) {
    throw new InvalidParamError(name, `${name} must be a 0x-prefixed 40-character hex address.`);
  }
  return raw;
}

function asSessionIdParam(value: string | string[] | undefined, name: string): string {
  const raw = asParam(value, name);
  if (!SESSION_ID_REGEX.test(raw)) {
    throw new InvalidParamError(name, `${name} contains characters not permitted in a session id.`);
  }
  return raw;
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
  let sessionId: string;
  let memberAddress: string;
  try {
    sessionId = asSessionIdParam(req.params.sessionId, "sessionId");
    memberAddress = asAddressParam(req.params.memberAddress, "memberAddress");
  } catch (err) {
    if (err instanceof InvalidParamError) {
      res.status(400).json({ error: "InvalidParam", message: err.message, statusCode: 400 });
      return;
    }
    throw err;
  }

  // Fetch real-time session data from database
  const session = await getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "NotFound", message: "Session not found", statusCode: 404 });
    return;
  }

  // Don't quote a price for an expired session — payment will be rejected
  // by the contract anyway, so let the pay page short-circuit with a clear
  // error rather than walk the user up to a wallet prompt that will fail.
  if (session.expiresAt < Date.now()) {
    res.status(410).json({
      error: "SessionExpired",
      message: "This session has expired and can no longer accept payments.",
      statusCode: 410
    });
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
router.get("/:sessionId/:memberAddress", (_req, res) => {
  res.status(410).json({
    error: "DeprecatedEndpoint",
    message: "Members must now sign the payment transaction from their own wallet, then call /confirm.",
    statusCode: 410
  });
});

router.post("/:sessionId/:memberAddress/confirm", validateBody(confirmSchema), async (req, res, next) => {
  try {
    let sessionId: string;
    let memberAddress: string;
    try {
      sessionId = asSessionIdParam(req.params.sessionId, "sessionId");
      memberAddress = asAddressParam(req.params.memberAddress, "memberAddress");
    } catch (err) {
      if (err instanceof InvalidParamError) {
        res.status(400).json({ error: "InvalidParam", message: err.message, statusCode: 400 });
        return;
      }
      throw err;
    }
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

    // Reject confirms for expired sessions before paying for the on-chain
    // verification round-trip. The contract's markPaid reverts past
    // expiresAt anyway, so a tx submitted now would already have failed —
    // surfacing a clear 410 here is friendlier than a chain-error 422.
    if (session.expiresAt < Date.now()) {
      res.status(410).json({
        error: "SessionExpired",
        message: "This session has expired and can no longer accept payments.",
        statusCode: 410
      });
      return;
    }

    // Authoritative check: the txHash must be a successful markPaid call
    // emitting a MemberPaid(sessionId, memberAddress, amount) log for THIS
    // session and member. Without this an attacker could replay a txHash
    // from another session where the same address is already marked paid.
    try {
      await verifyMemberPaidTransaction(
        req.body.txHash as `0x${string}`,
        sessionId,
        memberAddress
      );
    } catch (err) {
      if (err instanceof InvalidPaymentTxError) {
        res.status(422).json({ error: "InvalidPaymentTx", message: err.message, statusCode: 422 });
        return;
      }
      throw err;
    }

    // Belt-and-braces: confirm the chain state agrees with the event we just
    // verified. If a reorg flipped the receipt this catches it.
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
