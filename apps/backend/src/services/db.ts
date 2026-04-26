import { getCollection } from "./mongo.js";

export type SplitMode = "equal" | "itemised" | "custom";

export interface ParsedReceiptItem {
  name: string;
  amount: string;
  quantity?: number;
  unitPrice?: string;
}

export interface ParsedReceipt {
  items: ParsedReceiptItem[];
  subtotal: string;
  tax: string;
  total: string;
  currency: "cUSD";
}

export interface SessionMember {
  address: string;
  amount: bigint;
  paid: boolean;
  paidAt?: number;
}

export interface SessionRecord {
  id: string;
  host: string;
  members: SessionMember[];
  total: bigint;
  createdAt: number;
  expiresAt: number;
  mode: SplitMode;
  receipt: ParsedReceipt;
  txHash?: string;
}

const REQUIRED_ENV_VARS = [
  "SPLYT_SESSION_CONTRACT",
  "MONGODB_URI"
] as const;

interface StoredSessionMember {
  address: string;
  amount: string;
  paid: boolean;
  paidAt?: number;
}

interface StoredSessionRecord {
  id: string;
  host: string;
  members: StoredSessionMember[];
  total: string;
  createdAt: number;
  expiresAt: number;
  mode: SplitMode;
  receipt: ParsedReceipt;
  txHash?: string;
}

function toStoredSession(session: SessionRecord): StoredSessionRecord {
  return {
    ...session,
    total: session.total.toString(),
    members: session.members.map((member) => ({
      ...member,
      amount: member.amount.toString()
    }))
  };
}

function fromStoredSession(session: StoredSessionRecord): SessionRecord {
  return {
    ...session,
    total: BigInt(session.total),
    members: session.members.map((member) => ({
      ...member,
      amount: BigInt(member.amount)
    }))
  };
}

async function getSessionsCollection() {
  return getCollection<StoredSessionRecord>("sessions");
}

export function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return !value || !value.trim();
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export async function listSessions(host?: string): Promise<SessionRecord[]> {
  const collection = await getSessionsCollection();
  const filter = host ? { host: new RegExp(`^${host}$`, "i") } : {};
  const items = await collection.find(filter).toArray();
  return items.map(fromStoredSession);
}

export async function putSession(session: SessionRecord): Promise<SessionRecord> {
  const collection = await getSessionsCollection();
  const stored = toStoredSession(session);
  await collection.updateOne({ id: session.id }, { $set: stored }, { upsert: true });
  return session;
}

export async function getSession(sessionId: string): Promise<SessionRecord | undefined> {
  const collection = await getSessionsCollection();
  const session = await collection.findOne({ id: sessionId });
  return session ? fromStoredSession(session) : undefined;
}

export async function markPaidLocally(sessionId: string, memberAddress: string, txHash: string): Promise<SessionRecord | undefined> {
  const collection = await getSessionsCollection();
  const result = await collection.updateOne(
    { id: sessionId, "members.address": { $regex: `^${memberAddress}$`, $options: "i" } },
    {
      $set: {
        txHash,
        "members.$.paid": true,
        "members.$.paidAt": Date.now()
      }
    }
  );

  if (!result.matchedCount) return undefined;
  return getSession(sessionId);
}

export function serializeSession(session: SessionRecord) {
  return {
    id: session.id,
    host: session.host,
    members: session.members.map((m) => ({
      address: m.address,
      amount: m.amount.toString(),
      paid: m.paid,
      paidAt: m.paidAt ?? null
    })),
    total: session.total.toString(),
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    mode: session.mode,
    receipt: session.receipt,
    allPaid: session.members.every((m) => m.paid)
  };
}
