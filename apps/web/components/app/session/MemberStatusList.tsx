"use client";

import { Check, Clock, Pencil, Share2 } from "lucide-react";
import { useState } from "react";
import { formatCUSD, shortAddress } from "@/lib/format";
import type { Address, LiveMember } from "@/lib/types";
import { LinkSheet } from "./LinkSheet";
import { getContactName, setContactName } from "@/lib/contacts";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState(() => getContactName(member.address) ?? "");
  const [editing, setEditing] = useState(false);
  const link = `${origin}/app/pay/${sessionId}/${member.address}`;

  const saveName = () => {
    setContactName(member.address, name);
    setEditing(false);
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4">
      <div className="flex flex-col gap-0.5">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
            placeholder="Add a name…"
            className="bg-transparent text-xs outline-none"
          />
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs">{name || shortAddress(member.address as Address)}</span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit contact name"
              className="text-muted-foreground/50 transition hover:text-muted-foreground"
            >
              <Pencil size={10} />
            </button>
          </div>
        )}
        <span className="font-mono text-[10px] text-muted-foreground/60" title={member.address}>{shortAddress(member.address as Address)}</span>
        <span className="font-mono text-xs text-muted-foreground">{formatCUSD(member.amountDue)}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill paid={member.paid} />
        {!member.paid ? (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Share pay link"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-muted-foreground transition hover:text-foreground"
          >
            <Share2 size={12} />
          </button>
        ) : null}
      </div>
      {sheetOpen ? <LinkSheet link={link} onClose={() => setSheetOpen(false)} /> : null}
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
