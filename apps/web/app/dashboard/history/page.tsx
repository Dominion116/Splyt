"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { DashboardBadge } from "@/components/dashboard/badge";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { formatUsdc, getPendingMicros, getSessionProgress, mockDashboardSessions, type DashboardSessionStatus } from "@/lib/dashboard";

function StatusIcon({ status }: { status: DashboardSessionStatus }) {
  if (status === "settled") return <CheckCircle2 size={16} className="text-green-500" />;
  if (status === "pending") return <Clock3 size={16} className="text-amber-500" />;
  return <AlertTriangle size={16} className="text-red-400" />;
}

export default function DashboardHistoryPage() {
  const [filter, setFilter] = useState<"all" | DashboardSessionStatus>("all");
  const sessions = mockDashboardSessions;

  const filteredSessions = useMemo(() => (filter === "all" ? sessions : sessions.filter((session) => session.status === filter)), [filter, sessions]);

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
            <button key={item} type="button" onClick={() => setFilter(item)} className={`border-r border-zinc-800 px-3 py-2 font-mono text-[10px] uppercase tracking-widest last:border-r-0 ${filter === item ? "bg-indigo-600 text-white" : "bg-transparent text-zinc-500"}`}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        {filteredSessions.map((session) => (
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
        ))}
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
