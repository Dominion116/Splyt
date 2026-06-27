import { Router } from "express";
import { z } from "zod";
import { verifyMessage } from "viem/utils";
import { validateBody } from "../middleware/validate.js";
import { computeSplit } from "../services/ai.js";
import { ChainSessionNotFoundError, InvalidCloseTxError, getSessionStatus, sessionExists, verifyCloseTransaction } from "../services/contract.js";
import { ParsedReceipt, putSession, getSession, listSessions, markSessionClosedLocally, serializeSession, ListSessionsOptions } from "../services/db.js";

const router = Router();

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const signatureSchema = z.string().regex(/^0x[a-fA-F0-9]{130}$/);

/** Canonical message the host signs to prove ownership of the host wallet. */
export function hostAuthMessage(sessionId: string): string {
  return `Splyt session creation: ${sessionId}`;
}

const createSchema = z.object({
  sessionId: z.string().uuid(),
  host: addressSchema,
  hostSignature: signatureSchema,
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  members: z.array(addressSchema).min(1).max(50),
  amounts: z.array(z.string().regex(/^\d{1,30}$/)).min(1).max(50),
  mode: z.enum(["equal", "itemised", "custom"]),
  receipt: z.object({
    // Bound every field below: a prompt-injected Groq response or a malicious
    // client can otherwise stuff thousands of items / megabytes of names into
    // a single session document (MED-02).
    items: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          amount: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/),
          quantity: z.number().int().positive().max(10_000).optional(),
          unitPrice: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/).optional()
        })
      )
      .max(100),
    subtotal: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/),
    tax: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/),
    total: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/),
    currency: z.literal("USDm")
  }),
  // 10 080 min = 7 days maximum; no contract change required.
  expiresInMinutes: z.number().int().min(1).max(10_080).optional()
});

/**
 * @openapi
 * /api/session:
 *   post:
 *     tags: [session]
 *     summary: Create on-chain split session
 *     operationId: createSession
 *     responses:
 *       201:
 *         description: Session created
 */
const HOST_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

router.get("/", async (req, res, next) => {
  try {
    const hostRaw = typeof req.query.host === "string" ? req.query.host : undefined;
    if (hostRaw !== undefined && !HOST_ADDRESS_REGEX.test(hostRaw)) {
      res.status(400).json({
        error: "InvalidHost",
        message: "host query parameter must be a 0x-prefixed 40-character hex address.",
        statusCode: 400
      });
      return;
    }

    const limitRaw = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 20;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;

    const beforeRaw = typeof req.query.before === "string" ? parseInt(req.query.before, 10) : undefined;
    const before = beforeRaw !== undefined && Number.isFinite(beforeRaw) && beforeRaw > 0 ? beforeRaw : undefined;

    const paginationOptions: ListSessionsOptions = { limit: limit + 1, before };
    const records = await listSessions(hostRaw, paginationOptions);
    const hasMore = records.length > limit;
    const page = records.slice(0, limit);
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].createdAt : null;

    const sessions = page.map(serializeSession);
    // nextCursor is the createdAt of the last returned record; null means no further pages.
    res.json({ sessions, nextCursor });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/session:
 *   get:
 *     tags: [session]
 *     summary: List split sessions
 *     operationId: listSessions
 *     responses:
 *       200:
 *         description: Session list
 */
router.post("/", validateBody(createSchema), async (req, res, next) => {
  try {
    if (req.body.amounts.length !== req.body.members.length) {
      res.status(400).json({
        error: "InvalidSplit",
        message: "The number of amounts must match the number of members.",
        statusCode: 400
      });
      return;
    }

    const id = req.body.sessionId;

    // Authoritatively prove the caller controls the host wallet by verifying
    // a signature over the canonical message bound to this sessionId. Without
    // this check anyone could register a session attributed to any address
    // (HIGH-02) and pollute that user's dashboard with fake receipts.
    const isHost = await verifyMessage({
      address: req.body.host as `0x${string}`,
      message: hostAuthMessage(id),
      signature: req.body.hostSignature as `0x${string}`
    });
    if (!isHost) {
      res.status(401).json({
        error: "InvalidHostSignature",
        message: "Signature does not recover to the declared host address for this session id.",
        statusCode: 401
      });
      return;
    }

    const expiresInMinutes = req.body.expiresInMinutes ?? 60;
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
    const receipt = req.body.receipt as ParsedReceipt;
    const amountInputs = req.body.amounts.map((v: string) => BigInt(v));
    const splits = computeSplit(receipt, req.body.members, req.body.mode, amountInputs);
    const amounts = req.body.members.map((m: string) => splits.get(m) ?? 0n);

    const existing = await getSession(id);
    if (existing) {
      res.status(409).json({
        error: "SessionExists",
        message: "A session with this id is already stored.",
        statusCode: 409
      });
      return;
    }

    const existsOnChain = await sessionExists(id, req.body.members as `0x${string}`[]);
    if (!existsOnChain) {
      res.status(400).json({
        error: "SessionNotOnChain",
        message: "The wallet transaction was not found on-chain for this session.",
        statusCode: 400
      });
      return;
    }

    const session = await putSession({
      id,
      createdAt: Date.now(),
      host: req.body.host,
      total: amounts.reduce((sum: bigint, current: bigint) => sum + current, 0n),
      members: req.body.members.map((address: string, i: number) => ({
        address,
        amount: amounts[i],
        paid: false
      })),
      expiresAt,
      mode: req.body.mode,
      receipt,
      txHash: req.body.txHash,
      createTxHash: req.body.txHash
    });

    const paymentLinks = Object.fromEntries(
      session.members.map((m) => [m.address, `/split/${id}/pay/${m.address}`])
    );

    res.status(201).json({ sessionId: id, paymentLinks });
  } catch (error) {
    next(error);
  }
});

const closeSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

router.post("/:sessionId/close", validateBody(closeSchema), async (req, res, next) => {
  try {
    const sessionId = String(req.params.sessionId);
    const txHash = req.body.txHash as `0x${string}`;

    const session = await getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "NotFound", message: "Session not found", statusCode: 404 });
      return;
    }

    // Verify on-chain: receipt must succeed, target our contract, and contain
    // a SessionClosed event for exactly this session id.
    let payoutAmount: bigint;
    try {
      ({ payoutAmount } = await verifyCloseTransaction(txHash, sessionId));
    } catch (err) {
      if (err instanceof InvalidCloseTxError) {
        res.status(422).json({
          error: "InvalidCloseTx",
          message: err.message,
          statusCode: 422
        });
        return;
      }
      throw err;
    }

    const updated = await markSessionClosedLocally(session.id, txHash);
    res.json({
      sessionId: session.id,
      closeTxHash: txHash,
      payoutAmount: payoutAmount.toString(),
      closedAt: updated?.closedAt ?? Date.now()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/session/{sessionId}:
 *   get:
 *     tags: [session]
 *     summary: Get session details
 *     operationId: getSession
 *     responses:
 *       200:
 *         description: Session detail
 *       404:
 *         description: Session not found
 */
router.get("/:sessionId", async (req, res, next) => {
  try {
    const session = await getSession(String(req.params.sessionId));
    if (!session) {
      res.status(404).json({ error: "NotFound", message: "Session not found", statusCode: 404 });
      return;
    }
    try {
      const chainState = await getSessionStatus(
        session.id,
        session.members.map((m) => m.address as `0x${string}`)
      );
      const withChain = {
        ...serializeSession(session),
        allPaid: chainState.allPaid,
        chainStatus: "live",
        chainActive: chainState.active
      };
      res.json(withChain);
    } catch (error) {
      if (error instanceof ChainSessionNotFoundError) {
        res.json({
          ...serializeSession(session),
          allPaid: session.members.every((member) => member.paid),
          chainStatus: "missing",
          chainActive: false
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
