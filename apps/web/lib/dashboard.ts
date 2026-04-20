export type DashboardSessionStatus = "pending" | "settled" | "expired";

export type DashboardSplitMode = "equal" | "itemised" | "custom";

export interface DashboardSessionRecord {
  id: string;
  name: string;
  status: DashboardSessionStatus;
  mode: DashboardSplitMode;
  totalMicros: bigint;
  collectedMicros: bigint;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardActivityRecord {
  id: string;
  kind: "paid" | "wait" | "chain" | "done";
  description: string;
  amountMicros: bigint;
}

export interface DashboardSessionApiMember {
  address: string;
  amount: string;
  paid: boolean;
  paidAt: number | null;
}

export interface DashboardSessionApiRecord {
  id: string;
  host: string;
  members: DashboardSessionApiMember[];
  total: string;
  createdAt: number;
  expiresAt: number;
  mode: DashboardSplitMode;
  receipt: {
    items: Array<{ name: string; amount: string }>;
    subtotal: string;
    tax: string;
    total: string;
    currency: "USDC";
  };
  allPaid: boolean;
}

const MICRO_MULTIPLIER = 1_000_000n;

export function formatUsdc(micros: bigint | number | string): string {
  const value = typeof micros === "bigint" ? micros : BigInt(micros);
  const whole = value / MICRO_MULTIPLIER;
  const fraction = (value % MICRO_MULTIPLIER).toString().padStart(6, "0");
  return `${whole.toString()}.${fraction.slice(0, 2)}`;
}

export function formatUsdcPrecise(micros: bigint | number | string): string {
  const value = typeof micros === "bigint" ? micros : BigInt(micros);
  const whole = value / MICRO_MULTIPLIER;
  const fraction = (value % MICRO_MULTIPLIER).toString().padStart(6, "0");
  return `${whole.toString()}.${fraction}`;
}

export function truncateAddress(address: string, front = 6, back = 4): string {
  if (!address) return "0x0000...0000";
  return `${address.slice(0, front)}...${address.slice(-back)}`;
}

export function isValidEthAddress(address: string): boolean {
  return address.startsWith("0x") && address.length === 42;
}

export function getSessionProgress(session: DashboardSessionRecord): number {
  if (session.totalMicros === 0n) return 0;
  const value = Number((session.collectedMicros * 100n) / session.totalMicros);
  return Math.max(0, Math.min(100, value));
}

export function getPendingMicros(session: DashboardSessionRecord): bigint {
  return session.totalMicros > session.collectedMicros ? session.totalMicros - session.collectedMicros : 0n;
}

export function normalizeSessionRecord(session: DashboardSessionApiRecord): DashboardSessionRecord {
  const createdAt = new Date(session.createdAt);
  const collectedMicros = session.members.reduce((sum, member) => sum + (member.paid ? BigInt(member.amount) : 0n), 0n);
  const status: DashboardSessionStatus = session.allPaid ? "settled" : session.expiresAt <= Date.now() ? "expired" : "pending";

  return {
    id: session.id,
    name: session.receipt.items[0]?.name ?? `Split ${session.id.slice(0, 8)}`,
    status,
    mode: session.mode,
    totalMicros: BigInt(session.total),
    collectedMicros,
    memberCount: session.members.length,
    createdAt: createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    updatedAt: status === "settled" ? "settled" : status === "expired" ? "expired" : "live"
  };
}
