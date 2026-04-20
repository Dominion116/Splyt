import Anthropic from "@anthropic-ai/sdk";
import { ParsedReceipt, SplitMode } from "./db.js";

export class ParseError extends Error {}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const MICRO_MULTIPLIER = 1_000_000n;

function parseUsdToMicros(value: string | number): bigint {
  const numeric = typeof value === "number" ? value.toFixed(6) : value;
  const [whole, frac = ""] = numeric.split(".");
  const padded = `${frac}000000`.slice(0, 6);
  return BigInt(whole) * MICRO_MULTIPLIER + BigInt(padded);
}

function microsToString(value: bigint): string {
  const whole = value / MICRO_MULTIPLIER;
  const frac = (value % MICRO_MULTIPLIER).toString().padStart(6, "0");
  return `${whole.toString()}.${frac}`;
}

export async function parseReceipt(imageBase64: string, mimeType: string): Promise<ParsedReceipt> {
  if (!anthropic) {
    return {
      items: [
        { name: "Pasta", amount: "14.000000" },
        { name: "Soda", amount: "3.000000" },
        { name: "Salad", amount: "8.000000" }
      ],
      subtotal: "25.000000",
      tax: "2.000000",
      total: "27.000000",
      currency: "cUSD"
    };
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 900,
    system: "You are a receipt parser. Return ONLY valid JSON, no markdown.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Extract this receipt into JSON using schema:",
              '{"items":[{"name":"string","amount":"string"}],"subtotal":"string","tax":"string","total":"string","currency":"cUSD"}',
              "All amounts must have 6 decimals."
            ].join("\n")
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
              data: imageBase64
            }
          }
        ]
      }
    ]
  });

  const first = response.content[0];
  if (!first || first.type !== "text") {
    throw new ParseError("Claude response missing text");
  }

  try {
    const raw = JSON.parse(first.text) as ParsedReceipt;
    return {
      items: raw.items.map((item) => ({ name: item.name, amount: item.amount })),
      subtotal: raw.subtotal,
      tax: raw.tax,
      total: raw.total,
      currency: "cUSD"
    };
  } catch {
    throw new ParseError("Claude did not return valid JSON");
  }
}

export function computeSplit(
  receipt: ParsedReceipt,
  members: string[],
  mode: SplitMode,
  customAmounts?: bigint[]
): Map<string, bigint> {
  const totalMicros = parseUsdToMicros(receipt.total);
  const result = new Map<string, bigint>();

  if (mode === "custom" || mode === "itemised") {
    const arr = customAmounts ?? [];
    if (arr.length !== members.length) throw new Error("amount/member mismatch");
    arr.forEach((amount, i) => result.set(members[i], amount));
  } else {
    const base = totalMicros / BigInt(members.length);
    const remainder = totalMicros % BigInt(members.length);
    members.forEach((member, i) => {
      const bump = i < Number(remainder) ? 1n : 0n;
      result.set(member, base + bump);
    });
  }

  let sum = 0n;
  for (const amount of result.values()) sum += amount;
  const delta = sum > totalMicros ? sum - totalMicros : totalMicros - sum;
  if (delta > 1n) throw new Error("split sum mismatch");

  if (sum !== totalMicros) {
    const first = members[0];
    result.set(first, (result.get(first) ?? 0n) + (totalMicros - sum));
  }

  return result;
}

export function amountsToDisplay(amounts: bigint[]): string[] {
  return amounts.map((v) => microsToString(v));
}
