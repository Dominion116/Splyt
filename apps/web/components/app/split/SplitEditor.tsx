"use client";

import { useMemo } from "react";
import { computeSplit, computeItemisedSplit } from "@/lib/split";
import { formatCUSD, microsFromDecimalString, microsToDecimalString, shortAddress } from "@/lib/format";
import type { Address, DraftSession, SplitMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = [
  { label: "15m", value: 15 },
  { label: "1h", value: 60 },
  { label: "4h", value: 240 }
];

interface Props {
  draft: DraftSession;
  onChange: (next: DraftSession) => void;
}

export function SplitEditor({ draft, onChange }: Props) {
  const totalMicros = microsFromDecimalString(draft.receipt.total);
  const customMicros = useMemo(() => {
    if (draft.mode !== "custom") return null;
    return draft.amounts.length === draft.members.length
      ? draft.amounts.map((value) => microsFromDecimalString(value || "0.000000"))
      : draft.members.map(() => 0n);
  }, [draft.amounts, draft.members, draft.mode]);

  const computed = useMemo(() => {
    if (draft.members.length === 0) return new Map<Address, bigint>();
    if (draft.mode === "equal") {
      return computeSplit(draft.receipt, draft.members, "equal");
    }
    if (draft.mode === "custom" && customMicros) {
      try {
        return computeSplit(draft.receipt, draft.members, "custom", customMicros);
      } catch {
        return new Map(draft.members.map((address, idx) => [address, customMicros[idx] ?? 0n]));
      }
    }
    if (draft.mode === "itemised") {
      return computeItemisedSplit(draft.receipt, draft.members, draft.assignments ?? {});
    }
    return computeSplit(draft.receipt, draft.members, "equal");
  }, [draft.mode, draft.members, draft.receipt, draft.assignments, customMicros]);

  const sum = useMemo(() => {
    let total = 0n;
    for (const value of computed.values()) total += value;
    return total;
  }, [computed]);

  const setMode = (mode: SplitMode) => {
    if (mode === "custom") {
      const seeded = draft.members.map((address) =>
        microsToDecimalString(computed.get(address) ?? 0n)
      );
      onChange({ ...draft, mode, amounts: seeded });
    } else {
      onChange({ ...draft, mode, amounts: [] });
    }
  };

  const setCustomAmount = (idx: number, value: string) => {
    const next = [...(draft.amounts.length === draft.members.length
      ? draft.amounts
      : draft.members.map(() => "0.000000"))];
    next[idx] = value;
    onChange({ ...draft, amounts: next });
  };

  const setAssignments = (assignments: Record<number, Address[]>) => {
    onChange({ ...draft, assignments });
  };

  const setExpiry = (value: number) => {
    onChange({ ...draft, expiresInMinutes: value });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Mode</span>
        <div className="flex gap-1 rounded-full border border-border/40 bg-muted/50 p-0.5">
          {(["equal", "itemised", "custom"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-xs capitalize transition",
                draft.mode === mode
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {draft.mode === "itemised" && draft.members.length > 0 ? (
        <ItemAssignmentSection
          receipt={draft.receipt}
          members={draft.members}
          assignments={draft.assignments ?? {}}
          onChange={setAssignments}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Expires in</span>
        <div className="flex gap-1.5">
          {EXPIRY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setExpiry(option.value)}
              className={cn(
                "flex-1 rounded-full border border-border/40 bg-card px-3 py-2 text-xs transition",
                draft.expiresInMinutes === option.value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Per-member ({draft.members.length})
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            Total {formatCUSD(totalMicros)}
          </span>
        </div>
        <ul className="flex flex-col divide-y divide-border/40">
          {draft.members.map((address, idx) => (
            <li key={address} className="flex items-center justify-between gap-3 py-2.5">
              <span className="font-mono text-xs">{shortAddress(address)}</span>
              {draft.mode === "custom" ? (
                <CustomAmountInput
                  value={
                    draft.amounts[idx] ??
                    microsToDecimalString(computed.get(address) ?? 0n)
                  }
                  onChange={(value) => setCustomAmount(idx, value)}
                />
              ) : (
                <span className="font-mono text-sm tabular-nums">
                  {formatCUSD(computed.get(address) ?? 0n)}
                </span>
              )}
            </li>
          ))}
        </ul>
        {draft.mode === "custom" ? (
          <p
            className={cn(
              "text-xs",
              sum === totalMicros ? "text-muted-foreground" : "text-destructive"
            )}
          >
            Sum {formatCUSD(sum)} {sum === totalMicros ? "matches total" : "must equal total"}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface ItemAssignmentSectionProps {
  receipt: DraftSession["receipt"];
  members: Address[];
  assignments: Record<number, Address[]>;
  onChange: (next: Record<number, Address[]>) => void;
}

function ItemAssignmentSection({ receipt, members, assignments, onChange }: ItemAssignmentSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">Assign items</span>
      <ul className="flex flex-col gap-2">
        {receipt.items.map((item, idx) => (
          <li
            key={idx}
            className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-card p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm">{item.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatCUSD(microsFromDecimalString(item.amount))}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CustomAmountInput({
  value,
  onChange
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">$</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) => {
          const next = event.target.value.replace(/[^0-9.]/g, "");
          if (!/^\d{0,12}(\.\d{0,6})?$/.test(next)) return;
          onChange(next || "0.000000");
        }}
        className="w-24 bg-transparent text-right font-mono text-sm tabular-nums outline-none"
      />
    </div>
  );
}
