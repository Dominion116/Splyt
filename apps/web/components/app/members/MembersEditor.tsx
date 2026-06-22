"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { Address } from "@/lib/types";
import { shortAddress } from "@/lib/format";
import { getContactName } from "@/lib/contacts";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

interface Props {
  members: Address[];
  hostAddress: Address | null;
  onChange: (next: Address[]) => void;
}

export function MembersEditor({ members, hostAddress, onChange }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const includesHost = hostAddress
    ? members.some((m) => m.toLowerCase() === hostAddress.toLowerCase())
    : false;

  const add = () => {
    const candidate = input.trim();
    if (!ADDRESS_REGEX.test(candidate)) {
      setError("Enter a 0x-prefixed 40-character address.");
      return;
    }
    const normalized = candidate as Address;
    if (members.some((m) => m.toLowerCase() === normalized.toLowerCase())) {
      setError("Already added.");
      return;
    }
    if (members.length >= 50) {
      setError("Maximum 50 members per session.");
      return;
    }
    onChange([...members, normalized]);
    setInput("");
    setError(null);
  };

  const remove = (address: Address) => {
    onChange(members.filter((m) => m.toLowerCase() !== address.toLowerCase()));
  };

  const toggleHost = () => {
    if (!hostAddress) return;
    if (includesHost) {
      remove(hostAddress);
    } else {
      onChange([hostAddress, ...members.filter((m) => m.toLowerCase() !== hostAddress.toLowerCase())]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground" htmlFor="member-address">
          Add by address
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card p-1 pl-3">
          <input
            id="member-address"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="0x…"
            className="flex-1 bg-transparent py-2 font-mono text-sm outline-none placeholder:text-muted-foreground"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={add}
            className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Add
          </button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      {hostAddress ? (
        <button
          type="button"
          onClick={toggleHost}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-3 text-left transition hover:border-border"
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium">Include me in the split</span>
            <span className="font-mono text-xs text-muted-foreground">{shortAddress(hostAddress)}</span>
          </div>
          <span
            className={`flex h-6 w-10 items-center rounded-full p-0.5 transition ${
              includesHost ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-background transition ${
                includesHost ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Members ({members.length})
        </span>
        {members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-4 text-xs text-muted-foreground">
            Add at least one member to continue.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {members.map((address) => {
              const contactName = getContactName(address);
              return (
                <li
                  key={address}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs">{shortAddress(address)}</span>
                    {contactName ? (
                      <span className="text-xs italic text-muted-foreground">{contactName}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(address)}
                    className="text-muted-foreground transition hover:text-destructive"
                    aria-label={`Remove ${address}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
