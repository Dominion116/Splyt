import { describe, it } from "vitest";
import type { Address, ParsedReceipt } from "./types";

const addr = (n: number): Address => `0x${n.toString().padStart(40, "0")}` as Address;

export const A = addr(1);
export const B = addr(2);
export const C = addr(3);

export function makeReceipt(
  items: { name: string; amount: string }[],
  tax = "0.000000",
  total?: string
): ParsedReceipt {
  const subtotalMicros = items.reduce((sum, item) => {
    const [whole, frac = ""] = item.amount.split(".");
    return sum + BigInt(whole) * 1_000_000n + BigInt(`${frac}000000`.slice(0, 6));
  }, 0n);
  const subtotal = `${subtotalMicros / 1_000_000n}.${(subtotalMicros % 1_000_000n).toString().padStart(6, "0")}`;
  return { items, subtotal, tax, total: total ?? subtotal, currency: "cUSD" };
}

describe("computeItemisedSplit", () => {
  // tests will be added here
});
