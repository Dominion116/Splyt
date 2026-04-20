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

export interface DashboardNotificationRecord {
  id: string;
  message: string;
  timeAgo: string;
  unread: boolean;
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

export const mockDashboardSessions: DashboardSessionRecord[] = [
  {
    id: "sess_8a21f",
    name: "Sunday brunch",
    status: "pending",
    mode: "equal",
    totalMicros: 47850000n,
    collectedMicros: 26350000n,
    memberCount: 4,
    createdAt: "Apr 20",
    updatedAt: "2m ago"
  },
  {
    id: "sess_91b10",
    name: "Office snacks",
    status: "settled",
    mode: "itemised",
    totalMicros: 12500000n,
    collectedMicros: 12500000n,
    memberCount: 3,
    createdAt: "Apr 19",
    updatedAt: "1h ago"
  },
  {
    id: "sess_71cc4",
    name: "Airport ride",
    status: "pending",
    mode: "custom",
    totalMicros: 36800000n,
    collectedMicros: 18000000n,
    memberCount: 2,
    createdAt: "Apr 18",
    updatedAt: "6h ago"
  }
];

export const mockRecentActivity: DashboardActivityRecord[] = [
  { id: "act_1", kind: "paid", description: "Alice paid her share", amountMicros: 11880000n },
  { id: "act_2", kind: "chain", description: "Session created on Celo", amountMicros: 47850000n },
  { id: "act_3", kind: "wait", description: "Bob pending approval", amountMicros: 12000000n },
  { id: "act_4", kind: "paid", description: "Receipt parsed successfully", amountMicros: 0n },
  { id: "act_5", kind: "done", description: "Settlement finalized", amountMicros: 0n }
];

export const mockNotifications: DashboardNotificationRecord[] = [
  { id: "n1", message: "Payment link copied for Sunday brunch", timeAgo: "4m ago", unread: true },
  { id: "n2", message: "Bob marked paid on-chain", timeAgo: "28m ago", unread: true },
  { id: "n3", message: "Receipt parsed: 7 line items", timeAgo: "1h ago", unread: false },
  { id: "n4", message: "Session settled on Celo", timeAgo: "yesterday", unread: false }
];

export const mockWalletAddress = "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d";
export const mockContractAddress = "0x8f2d7cb11dbe4f7f5a9f0c1d8b9c6f3f2a8c4e10";
