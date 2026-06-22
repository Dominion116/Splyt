"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { ApiRequestError, listSessions } from "@/lib/api";
import { formatCUSD, formatRelativeTime } from "@/lib/format";
import type { SessionSummary } from "@/lib/types";

type SessionFilter = "all" | "open" | "settled" | "expired";

function applyFilter(sessions: SessionSummary[], filter: SessionFilter): SessionSummary[] {
  if (filter === "all") return sessions;
  return sessions.filter((session) => {
    const settled = Boolean(session.closeTxHash);
    const expired = !settled && session.expiresAt < Date.now();
    const open = !settled && !expired;
    if (filter === "settled") return settled;
    if (filter === "expired") return expired;
    if (filter === "open") return open;
    return true;
  });
}

interface Props {
  host: Address;
  filter?: SessionFilter;
}

export function SessionList({ host, filter = "all" }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    listSessions(host)
      .then((items) => {
        if (!cancelled) setSessions(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError) setError(err.message);
        else setError("Couldn't load sessions.");
        setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [host]);

  if (sessions === null) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card p-5 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        Loading recent splits…
      </div>
    );
  }

  const visible = applyFilter(sessions, filter);

  if (visible.length === 0) {
    return <EmptySessions filter={filter} />;
  }

  const heading =
    filter === "all"
      ? "Recent splits"
      : `${filter.charAt(0).toUpperCase() + filter.slice(1)} splits`;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{heading}</span>
      <ul className="flex flex-col gap-2">
        {visible.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </ul>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SessionRow({ session }: { session: SessionSummary }) {
  const paidCount = session.members.filter((m) => m.paid).length;
  const total = session.members.length;
  const settled = Boolean(session.closeTxHash);
  const allPaid = paidCount === total;
  const expired = !settled && session.expiresAt < Date.now();

  return (
    <li>
      <Link
        href={`/app/session/${session.id}`}
        className="group flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4 transition hover:border-border"
      >
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{formatCUSD(session.total)}</span>
          <span className="text-xs text-muted-foreground">
            {paidCount}/{total} paid · {formatRelativeTime(session.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip settled={settled} expired={expired} paid={allPaid} />
          <ArrowUpRight
            size={14}
            className="text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </div>
      </Link>
    </li>
  );
}

function StatusChip({ settled, expired, paid }: { settled: boolean; expired: boolean; paid: boolean }) {
  if (settled) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
        <Check size={10} /> Settled
      </span>
    );
  }
  if (paid) {
    return (
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
        Ready to close
      </span>
    );
  }
  if (expired) {
    return (
      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
        Expired
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      Open
    </span>
  );
}

const EMPTY_MESSAGES: Record<SessionFilter, string> = {
  all: "Snap a receipt to create your first one. Members get a link — they pay from their own wallet.",
  open: "No open splits right now.",
  settled: "No settled splits yet.",
  expired: "No expired splits."
};

function EmptySessions({ filter }: { filter: SessionFilter }) {
  const title = filter === "all" ? "No splits yet" : `No ${filter} splits`;
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-border/60 bg-card/40 p-5">
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{EMPTY_MESSAGES[filter]}</span>
    </div>
  );
}
