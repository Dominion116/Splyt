"use client";

import { Check, Clock, Copy } from "lucide-react";
import { useState } from "react";
import { formatCUSD, shortAddress } from "@/lib/format";
import type { Address, LiveMember } from "@/lib/types";

interface Props {
  members: LiveMember[];
  sessionId: string;
  origin: string;
}

export function MemberStatusList({ members, sessionId, origin }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {members.map((member) => (
        <MemberRow key={member.address} member={member} sessionId={sessionId} origin={origin} />
      ))}
    </ul>
  );
}

function MemberRow({
  member,
  sessionId,
  origin
}: {
  member: LiveMember;
  sessionId: string;
  origin: string;
}) {
  const [copied, setCopied] = useState(false);
  const link = `${origin}/app/pay/${sessionId}/${member.address}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4">
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs">{shortAddress(member.address as Address)}</span>
        <span className="text-xs text-muted-foreground">{formatCUSD(member.amountDue)}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill paid={member.paid} />
        {!member.paid ? (
          <button
            type="button"
            onClick={copy}
            aria-label="Copy pay link"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-muted-foreground transition hover:text-foreground"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function StatusPill({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
        <Check size={10} /> Paid
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      <Clock size={10} /> Pending
    </span>
  );
}
