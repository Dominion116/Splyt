import type { Address, ParsedReceipt, SplitMode } from "./types";
import { microsFromDecimalString } from "./format";

export function computeItemisedSplit(
  receipt: ParsedReceipt,
  members: Address[],
  assignments: Record<number, Address[]>
): Map<Address, bigint> {
  const out = new Map<Address, bigint>(members.map((addr) => [addr, 0n]));

  for (let i = 0; i < receipt.items.length; i++) {
    const itemMicros = microsFromDecimalString(receipt.items[i].amount);
    const assigned = assignments[i]?.length > 0 ? assignments[i] : members;
    const share = itemMicros / BigInt(assigned.length);
    const remainder = itemMicros % BigInt(assigned.length);
    assigned.forEach((addr, j) => {
      const bump = j < Number(remainder) ? 1n : 0n;
      out.set(addr, (out.get(addr) ?? 0n) + share + bump);
    });
  }

  // Any gap between item totals and the receipt total (tax, fees, rounding)
  // is distributed equally among all members.
  let itemsTotal = 0n;
  for (const v of out.values()) itemsTotal += v;
  const gap = microsFromDecimalString(receipt.total) - itemsTotal;

  if (gap !== 0n) {
    const share = gap / BigInt(members.length);
    const remainder = gap % BigInt(members.length);
    members.forEach((addr, i) => {
      const bump = i < Number(remainder) ? 1n : 0n;
      out.set(addr, (out.get(addr) ?? 0n) + share + bump);
    });
  }

  return out;
}

export function computeSplit(
  receipt: ParsedReceipt,
  members: Address[],
  mode: SplitMode,
  customAmountsMicros?: bigint[]
): Map<Address, bigint> {
  const totalMicros = microsFromDecimalString(receipt.total);
  const out = new Map<Address, bigint>();

  if (mode === "custom" || mode === "itemised") {
    const arr = customAmountsMicros ?? [];
    if (arr.length !== members.length) {
      throw new Error("amount / member length mismatch");
    }
    members.forEach((address, idx) => out.set(address, arr[idx]));
  } else {
    const base = totalMicros / BigInt(members.length);
    const remainder = totalMicros % BigInt(members.length);
    members.forEach((address, idx) => {
      const bump = idx < Number(remainder) ? 1n : 0n;
      out.set(address, base + bump);
    });
  }

  let sum = 0n;
  for (const value of out.values()) sum += value;
  if (sum !== totalMicros) {
    const delta = totalMicros - sum;
    if (delta < -1n || delta > 1n) {
      throw new Error("split sum mismatch");
    }
    const first = members[0];
    out.set(first, (out.get(first) ?? 0n) + delta);
  }

  return out;
}
