export type SplitMode = "equal" | "itemised" | "custom";

export interface ParsedReceiptItem {
  name: string;
  amount: string;
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

const sessions = new Map<string, SessionRecord>();

export function listSessions(host?: string): SessionRecord[] {
  const items = Array.from(sessions.values());
  if (!host) return items;
  return items.filter((session) => session.host.toLowerCase() === host.toLowerCase());
}

export function putSession(session: SessionRecord): SessionRecord {
  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): SessionRecord | undefined {
  return sessions.get(sessionId);
}

export function markPaidLocally(sessionId: string, memberAddress: string, txHash: string): SessionRecord | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  const member = session.members.find((m) => m.address.toLowerCase() === memberAddress.toLowerCase());
  if (!member) return undefined;
  member.paid = true;
  member.paidAt = Date.now();
  session.txHash = txHash;
  return session;
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
