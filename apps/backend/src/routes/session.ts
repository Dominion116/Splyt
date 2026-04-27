import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { computeSplit } from "../services/ai.js";
import { ChainSessionNotFoundError, getSessionStatus, sessionExists } from "../services/contract.js";
import { ParsedReceipt, putSession, getSession, listSessions, serializeSession } from "../services/db.js";

const router = Router();

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const createSchema = z.object({
  sessionId: z.string().min(1).optional(),
  host: addressSchema,
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  members: z.array(addressSchema).min(1),
  amounts: z.array(z.string().regex(/^\d+$/)).min(1),
  mode: z.enum(["equal", "itemised", "custom"]),
  receipt: z.object({
    items: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
        quantity: z.number().int().positive().optional(),
        unitPrice: z.string().optional()
      })
    ),
    subtotal: z.string(),
    tax: z.string(),
    total: z.string(),
    currency: z.literal("cUSD")
  }),
  expiresInMinutes: z.number().int().min(1).max(240).optional()
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
router.get("/", async (req, res, next) => {
  try {
  const host = typeof req.query.host === "string" ? req.query.host : undefined;
    const sessions = (await listSessions(host)).map(serializeSession).sort((left, right) => right.createdAt - left.createdAt);
    res.json({ sessions });
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

    const id = req.body.sessionId ?? randomUUID();
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
      txHash: req.body.txHash
    });

    const paymentLinks = Object.fromEntries(
      session.members.map((m) => [m.address, `/split/${id}/pay/${m.address}`])
    );

    res.status(201).json({ sessionId: id, paymentLinks });
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
    const session = await getSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
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
        chainStatus: "live"
      };
      res.json(withChain);
    } catch (error) {
      if (error instanceof ChainSessionNotFoundError) {
        res.json({
          ...serializeSession(session),
          allPaid: session.members.every((member) => member.paid),
          chainStatus: "missing"
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
