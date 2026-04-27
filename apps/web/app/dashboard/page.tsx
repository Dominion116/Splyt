"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, CreditCard, DollarSign, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { DashboardBadge } from "@/components/dashboard/badge";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";
import { getCUSDBalance } from "@/lib/minipay";
import { cn } from "@/lib/utils";
import {
  formatUsdc,
  getPendingMicros,
  getSessionProgress,
  normalizeSessionRecord,
  type DashboardActivityRecord,
  type DashboardSessionApiRecord,
  type DashboardSessionRecord
} from "@/lib/dashboard";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="font-mono text-xl text-zinc-100">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const className = "h-4 w-4 text-zinc-400";
  if (kind === "paid") return <CreditCard className={className} />;
  if (kind === "chain") return <Sparkles className={className} />;
  if (kind === "wait") return <Clock3 className={className} />;
  return <DollarSign className={className} />;
}

export default function DashboardHomePage() {
  const { address, truncatedAddress } = useDashboardWallet();
  const [balanceMicros, setBalanceMicros] = useState(0n);
  const [sessions, setSessions] = useState<DashboardSessionRecord[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [visibleActiveCount, setVisibleActiveCount] = useState(3);
  const [visibleActivityCount, setVisibleActivityCount] = useState(3);

  useEffect(() => {
    const load = async () => {
      setLoadingBalance(true);
      setLoadingSessions(true);
      if (address) {
        try {
          setBalanceMicros(await getCUSDBalance(address as `0x${string}`));
        } catch {
          setBalanceMicros(0n);
        } finally {
          setLoadingBalance(false);
        }
      }

      try {
        const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
        const response = await fetch(`${backend}/api/session?host=${address}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setSessions((data as DashboardSessionApiRecord[]).map(normalizeSessionRecord));
          } else if (Array.isArray(data.sessions)) {
            setSessions((data.sessions as DashboardSessionApiRecord[]).map(normalizeSessionRecord));
          }
        }
      } catch {
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };

    void load();
  }, [address]);

  const stats = useMemo(() => {
    if (loadingBalance || loadingSessions) {
      return [
        { label: "cUSD balance", value: <span className="inline-block h-6 w-16 animate-pulse rounded bg-zinc-700" /> },
        { label: "active sessions", value: <span className="inline-block h-6 w-8 animate-pulse rounded bg-zinc-700" /> },
        { label: "total settled", value: <span className="inline-block h-6 w-16 animate-pulse rounded bg-zinc-700" /> },
        { label: "fees paid", value: <span className="inline-block h-6 w-12 animate-pulse rounded bg-zinc-700" /> }
      ];
    }
    return [
      { label: "cUSD balance", value: `$${formatUsdc(balanceMicros)}` },
      { label: "active sessions", value: String(sessions.filter((session) => session.status === "pending").length) },
      { label: "total settled", value: `$${formatUsdc(sessions.filter((session) => session.status === "settled").reduce((sum, session) => sum + session.collectedMicros, 0n))}` },
      { label: "fees paid", value: "$0.00" }
    ];
  }, [balanceMicros, sessions, loadingBalance, loadingSessions]);

  const activeSessions = useMemo(() => sessions.filter((session) => session.status === "pending"), [sessions]);

  const recentActivity = useMemo<DashboardActivityRecord[]>(() => {
    if (!sessions.length) return [];

    return sessions.map((session, index) => ({
      id: `${session.id}-${index}`,
      kind: session.status === "settled" ? "done" : session.status === "expired" ? "wait" : "chain",
      description: `${session.name} • ${session.memberCount} members`,
      amountMicros: session.collectedMicros
    }));
  }, [sessions]);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2">
        {stats.map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} />)}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">active sessions</h2>
          <span className="font-mono text-[10px] text-zinc-600">{truncatedAddress}</span>
        </div>
        <div className="space-y-2">
          {loadingSessions ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3 animate-pulse">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="h-4 w-24 rounded bg-zinc-700 mb-1" />
                    <div className="h-3 w-16 rounded bg-zinc-700" />
                  </div>
                  <div className="h-5 w-12 rounded bg-zinc-700" />
                </div>
                <div className="h-2 w-full rounded bg-zinc-700" />
                <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500">
                  <span className="h-3 w-16 rounded bg-zinc-700" />
                  <span className="h-3 w-16 rounded bg-zinc-700" />
                </div>
              </div>
            ))
          ) : (
            <>
              {activeSessions.slice(0, visibleActiveCount).map((session) => (
            <div key={session.id} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-zinc-100">{session.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{session.memberCount} members • {session.mode}</div>
                </div>
                <DashboardBadge variant={session.status === "settled" ? "settled" : session.status === "expired" ? "expired" : "pending"}>{session.status}</DashboardBadge>
              </div>
              <ProgressBar value={getSessionProgress(session)} />
              <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500">
                <span>${formatUsdc(session.collectedMicros)} collected</span>
                <span>${formatUsdc(getPendingMicros(session))} pending</span>
              </div>
            </div>
          ))}
              {!activeSessions.length ? <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs text-zinc-600">No active sessions.</div> : null}
              {activeSessions.length > visibleActiveCount ? (
            <button type="button" onClick={() => setVisibleActiveCount((count) => count + 3)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-400 transition-colors hover:border-indigo-500 hover:text-zinc-100">
              show more
            </button>
          ) : null}
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Button className="w-full bg-indigo-600 font-mono text-sm hover:bg-indigo-500" onClick={() => window.location.assign("/dashboard/new")}>new split</Button>
        <Button variant="outline" className="w-full border-zinc-700 font-mono text-sm" onClick={() => window.location.assign("/dashboard/history")}>history</Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">recent activity</h2>
        <div className="space-y-2">
          {loadingSessions ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 animate-pulse">
                <div className="rounded-md bg-zinc-800 p-1.5 h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-32 rounded bg-zinc-700 mb-1" />
                  <div className="h-3 w-16 rounded bg-zinc-700" />
                </div>
                <div className="h-4 w-12 rounded bg-zinc-700" />
              </div>
            ))
          ) : recentActivity.length ? recentActivity.slice(0, visibleActivityCount).map((entry: DashboardActivityRecord) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="rounded-md bg-zinc-800 p-1.5"><ActivityIcon kind={entry.kind} /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-zinc-100">{entry.description}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{entry.kind}</div>
              </div>
              <div className={cn("font-mono text-xs", entry.amountMicros > 0n ? "text-zinc-100" : "text-zinc-500")}>{entry.amountMicros > 0n ? `$${formatUsdc(entry.amountMicros)}` : "—"}</div>
            </div>
          )) : <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs text-zinc-600">No recent activity yet.</div>}
          {recentActivity.length > visibleActivityCount && !loadingSessions ? (
            <button type="button" onClick={() => setVisibleActivityCount((count) => count + 3)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-400 transition-colors hover:border-indigo-500 hover:text-zinc-100">
              show more
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}