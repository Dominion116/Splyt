"use client";

import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import { formatUSDm, microsFromDecimalString, microsToDecimalString } from "@/lib/format";
import type { ParsedReceipt, ReceiptItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  receipt: ParsedReceipt;
  onChange: (next: ParsedReceipt) => void;
}

export function ReviewEditor({ receipt, onChange }: Props) {
  const updateItem = (idx: number, patch: Partial<ReceiptItem>) => {
    const items = receipt.items.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    onChange({ ...receipt, items });
  };

  const removeItem = (idx: number) => {
    const items = receipt.items.filter((_, i) => i !== idx);
    onChange({ ...receipt, items });
  };

  const addItem = () => {
    onChange({
      ...receipt,
      items: [...receipt.items, { name: "Item", amount: "0.000000" }]
    });
  };

  const setTotals = (patch: Partial<Pick<ParsedReceipt, "subtotal" | "tax" | "total">>) => {
    onChange({ ...receipt, ...patch });
  };

  const sum = useMemo(() => {
    return receipt.items.reduce(
      (acc, item) => acc + microsFromDecimalString(item.amount),
      0n
    );
  }, [receipt.items]);

  const totalMicros = microsFromDecimalString(receipt.total);
  const mismatch = sum + microsFromDecimalString(receipt.tax || "0") !== totalMicros;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Items</span>
        <ul className="flex flex-col gap-2">
          {receipt.items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card p-3"
            >
              <input
                value={item.name}
                onChange={(e) => updateItem(idx, { name: e.target.value.slice(0, 200) })}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Item name"
              />
              <AmountInput
                value={item.amount}
                onChange={(value) => updateItem(idx, { amount: value })}
              />
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => removeItem(idx)}
                className="text-muted-foreground transition hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addItem}
          className="self-start rounded-full border border-dashed border-border/60 px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          + Add item
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-card p-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Totals</span>
        <TotalsRow
          label="Subtotal"
          value={receipt.subtotal}
          onChange={(v) => setTotals({ subtotal: v })}
        />
        <TotalsRow label="Tax" value={receipt.tax} onChange={(v) => setTotals({ tax: v })} />
        <TotalsRow
          label="Total"
          value={receipt.total}
          onChange={(v) => setTotals({ total: v })}
          emphasised
        />
        {mismatch ? (
          <p className="text-xs text-muted-foreground">
            Items + tax don&apos;t add up to total. Adjust until the total matches what the bill says.
          </p>
        ) : null}
      </div>

      {totalMicros === 0n ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Total is $0.00 — update the total before continuing.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Items sum to {formatUSDm(sum)}. Total is the source of truth — Splyt splits the total.
        </p>
      )}
    </div>
  );
}

function TotalsRow({
  label,
  value,
  onChange,
  emphasised
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  emphasised?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-sm", emphasised ? "font-medium" : "text-muted-foreground")}>
        {label}
      </span>
      <AmountInput value={value} onChange={onChange} emphasised={emphasised} />
    </div>
  );
}

function AmountInput({
  value,
  onChange,
  emphasised
}: {
  value: string;
  onChange: (next: string) => void;
  emphasised?: boolean;
}) {
  const display = (() => {
    try {
      return microsToDecimalString(microsFromDecimalString(value)).replace(/0+$/, "").replace(/\.$/, ".00");
    } catch {
      return value;
    }
  })();

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">$</span>
      <input
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          const next = e.target.value.replace(/[^0-9.]/g, "");
          if (!/^\d{0,12}(\.\d{0,6})?$/.test(next)) return;
          onChange(next || "0.000000");
        }}
        className={cn(
          "w-20 bg-transparent text-right font-mono text-sm tabular-nums outline-none",
          emphasised && "font-medium"
        )}
      />
    </div>
  );
}
