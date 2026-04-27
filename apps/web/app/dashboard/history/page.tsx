"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { DashboardBadge } from "@/components/dashboard/badge";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { formatUsdc, getPendingMicros, getSessionProgress, normalizeSessionRecord, type DashboardSessionApiRecord, type DashboardSessionRecord, type DashboardSessionStatus } from "@/lib/dashboard";
import { useEffect } from "react";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";

function StatusIcon({ status }: { status: DashboardSessionStatus }) {
  if (status === "settled") return <CheckCircle2 size={16} className="text-green-500" />;
  if (status === "pending") return <Clock3 size={16} className="text-amber-500" />;
  return <AlertTriangle size={16} className="text-red-400" />;
}

export default function DashboardHistoryPage() {
  const [filter, setFilter] = useState<"all" | DashboardSessionStatus>("all");
  const [visibleCount, setVisibleCount] = useState(3);
  const { address } = useDashboardWallet();
  const [sessions, setSessions] = useState<DashboardSessionRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
        const response = await fetch(`${backend}/api/session?host=${address}`);
        if (!response.ok) return;

        const data = await response.json();
        if (Array.isArray(data)) {
          setSessions((data as DashboardSessionApiRecord[]).map(normalizeSessionRecord));
        } else if (Array.isArray(data.sessions)) {
          setSessions((data.sessions as DashboardSessionApiRecord[]).map(normalizeSessionRecord));
        }
      } catch {
        setSessions([]);
      }
    };

    void load();
  }, [address]);

  const filteredSessions = useMemo(() => (filter === "all" ? sessions : sessions.filter((session) => session.status === filter)), [filter, sessions]);
  const visibleSessions = useMemo(() => filteredSessions.slice(0, visibleCount), [filteredSessions, visibleCount]);

  const totals = useMemo(
    () =>
      sessions.reduce(
        (acc, session) => ({
          totalEver: acc.totalEver + session.totalMicros,
          totalSettled: acc.totalSettled + (session.status === "settled" ? session.collectedMicros : 0n),
          totalPending: acc.totalPending + getPendingMicros(session)
        }),
        { totalEver: 0n, totalSettled: 0n, totalPending: 0n }
      ),
    [sessions]
  );

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-zinc-800">
          {(["all", "settled", "pending"] as const).map((item) => (
            <button key={item} type="button" onClick={() => { setFilter(item); setVisibleCount(3); }} className={`border-r border-zinc-800 px-3 py-2 font-mono text-[10px] uppercase tracking-widest last:border-r-0 ${filter === item ? "bg-indigo-600 text-white" : "bg-transparent text-zinc-500"}`}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        {visibleSessions.length ? visibleSessions.map((session) => (
          <div key={session.id} className="flex items-stretch gap-3 border-b border-zinc-800 py-3 last:border-b-0 last:pb-0 first:pt-0">
            <div className="flex items-center justify-center rounded-md bg-zinc-800 p-2">
              <StatusIcon status={session.status} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-sm text-zinc-100">{session.name}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{session.memberCount} members • {session.createdAt} • {session.mode}</div>
              <ProgressBar value={getSessionProgress(session)} />
            </div>
            <div className="flex flex-col items-end justify-between">
              <div className="font-mono text-sm text-zinc-100">${formatUsdc(session.totalMicros)}</div>
              <DashboardBadge variant={session.status === "settled" ? "settled" : session.status === "pending" ? "pending" : "expired"}>{session.status}</DashboardBadge>
            </div>
          </div>
        )) : <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-600">No sessions yet.</div>}
        {filteredSessions.length > visibleCount ? (
          <button type="button" onClick={() => setVisibleCount((count) => count + 3)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-400 transition-colors hover:border-indigo-500 hover:text-zinc-100">
            show more
          </button>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="font-medium text-zinc-100">Totals</div>
        <div className="space-y-2 font-mono text-[10px] text-zinc-500">
          <div className="flex items-center justify-between"><span>Total ever split</span><span>${formatUsdc(totals.totalEver)}</span></div>
          <div className="flex items-center justify-between"><span>Total settled on Celo</span><span>${formatUsdc(totals.totalSettled)}</span></div>
          <div className="flex items-center justify-between"><span>Total pending</span><span>${formatUsdc(totals.totalPending)}</span></div>
          <div className="flex items-center justify-between"><span>Fees</span><span>$0.00</span></div>
        </div>
      </section>
    </div>
  );
}