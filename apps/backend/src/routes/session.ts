import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { computeSplit } from "../services/ai.js";
import { createSessionOnChain, getSessionStatus } from "../services/contract.js";
import { ParsedReceipt, putSession, getSession, listSessions, serializeSession } from "../services/db.js";

const router = Router();

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const createSchema = z.object({
  members: z.array(addressSchema).min(1),
  amounts: z.array(z.string().regex(/^\d+$/)).min(1),
  mode: z.enum(["equal", "itemised", "custom"]),
  receipt: z.object({
    items: z.array(z.object({ name: z.string(), amount: z.string() })),
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
router.get("/", (req, res) => {
  const host = typeof req.query.host === "string" ? req.query.host : undefined;
  const sessions = listSessions(host).map(serializeSession).sort((left, right) => right.createdAt - left.createdAt);
  res.json({ sessions });
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
    const id = randomUUID();
    const expiresInMinutes = req.body.expiresInMinutes ?? 60;
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
    const receipt = req.body.receipt as ParsedReceipt;
    const amountInputs = req.body.amounts.map((v: string) => BigInt(v));
    const splits = computeSplit(receipt, req.body.members, req.body.mode, amountInputs);
    const amounts = req.body.members.map((m: string) => splits.get(m) ?? 0n);
    const txHash = await createSessionOnChain(id, req.body.members, amounts, Math.floor(expiresAt / 1000));

    const session = putSession({
      id,
      createdAt: Date.now(),
      host: process.env.HOST_WALLET_ADDRESS ?? "0x0000000000000000000000000000000000000000",
      total: amounts.reduce((sum: bigint, current: bigint) => sum + current, 0n),
      members: req.body.members.map((address: string, i: number) => ({
        address,
        amount: amounts[i],
        paid: false
      })),
      expiresAt,
      mode: req.body.mode,
      receipt,
      txHash
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
    const session = getSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const chainState = await getSessionStatus(
      session.id,
      session.members.map((m) => m.address as `0x${string}`)
    );
    const withChain = {
      ...serializeSession(session),
      allPaid: chainState.allPaid
    };
    res.json(withChain);
  } catch (error) {
    next(error);
  }
});

export default router;
