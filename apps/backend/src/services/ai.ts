import Groq from "groq-sdk";
import { ParsedReceipt, SplitMode } from "./db.js";

export class ParseError extends Error {}

const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
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

function normalizeParsedReceipt(raw: ParsedReceipt): ParsedReceipt {
  return {
    items: raw.items.map((item) => {
      const quantity = item.quantity && Number.isFinite(item.quantity) ? Math.max(1, Math.trunc(item.quantity)) : undefined;
      const unitPrice = item.unitPrice;

      let amount = item.amount;
      if (quantity && unitPrice) {
        amount = microsToString(parseUsdToMicros(unitPrice) * BigInt(quantity));
      }

      return {
        name: item.name,
        amount,
        quantity,
        unitPrice
      };
    }),
    subtotal: raw.subtotal,
    tax: raw.tax,
    total: raw.total,
    currency: "cUSD"
  };
}

export async function parseReceipt(imageBase64: string, mimeType: string): Promise<ParsedReceipt> {
  const aiId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (!groq) {
    throw new ParseError("AI service not configured - GROQ_API_KEY environment variable is required");
  }

    console.info(`[ai:${aiId}] Starting Groq Vision parse: mimeType=${mimeType}, imageSize=${imageBase64.length}`);
    const startTime = Date.now();

    const response = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      max_tokens: 900,
      response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a receipt parser. Return only a valid JSON object matching the requested schema."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Extract this receipt into JSON using schema:",
              '{"items":[{"name":"string","amount":"string","quantity":"number?","unitPrice":"string?"}],"subtotal":"string","tax":"string","total":"string","currency":"cUSD"}',
              "All amounts must have 6 decimals.",
              "For each line item, `amount` must be the line total, not the per-unit price.",
              "If the receipt shows a quantity like `2 x Coffee @ $0.01`, return `name` as `Coffee`, `quantity` as 2, `unitPrice` as `0.010000`, and `amount` as `0.020000`."
            ].join("\n")
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`
            }
          }
        ] as any
      }
    ]
  });

  const elapsed = Date.now() - startTime;
      console.info(`[ai:${aiId}] Groq API response received (${elapsed}ms), processing...`);
  
  const first = response.choices[0]?.message;
    if (!first || !first.content) {
      throw new ParseError(`Groq API returned empty response (choices=${response.choices.length})`);
    }

  console.debug(`[ai:${aiId}] Response content length: ${first.content.length}`);
  
  try {
    const raw = JSON.parse(first.content) as ParsedReceipt;
    const normalized = normalizeParsedReceipt(raw);
    console.info(`[ai:${aiId}] ✓ Parse successful: ${normalized.items.length} items, subtotal=$${normalized.subtotal}, total=$${normalized.total}`);
    return normalized;
  } catch (jsonErr) {
    console.error(`[ai:${aiId}] ✗ Failed to parse Groq JSON response: ${jsonErr}`);
    console.debug(`[ai:${aiId}] Response content:\n${first.content.slice(0, 500)}...`);
    throw new ParseError(`Invalid JSON response from Groq API: ${jsonErr}`);
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
