"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  CreditCard,
  DollarSign,
  History as HistoryIcon,
  Plus,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

function StatCard({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <Card padding="sm" variant={accent ? "default" : "muted"} className="overflow-hidden">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">{value}</div>
    </Card>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const className = "h-4 w-4";
  if (kind === "paid") return <CreditCard className={className} />;
  if (kind === "chain") return <Sparkles className={className} />;
  if (kind === "wait") return <Clock3 className={className} />;
  return <DollarSign className={className} />;
}

function activityTone(kind: string): "primary" | "success" | "warning" | "muted" {
  if (kind === "paid" || kind === "done") return "success";
  if (kind === "wait") return "warning";
  if (kind === "chain") return "primary";
  return "muted";
}

const toneStyles: Record<"primary" | "success" | "warning" | "muted", string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  muted: "bg-surface-muted text-muted-foreground"
};

export default function DashboardHomePage() {
  const router = useRouter();
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
    const loading = loadingBalance || loadingSessions;
    if (loading) {
      return [
        { label: "cUSD balance", value: <Skeleton className="h-6 w-20" />, accent: true },
        { label: "Active sessions", value: <Skeleton className="h-6 w-8" /> },
        { label: "Total settled", value: <Skeleton className="h-6 w-20" /> },
        { label: "Fees paid", value: <Skeleton className="h-6 w-12" /> }
      ];
    }
    return [
      { label: "cUSD balance", value: `$${formatUsdc(balanceMicros)}`, accent: true },
      { label: "Active sessions", value: String(sessions.filter((s) => s.status === "pending").length) },
      {
        label: "Total settled",
        value: `$${formatUsdc(
          sessions.filter((s) => s.status === "settled").reduce((sum, s) => sum + s.collectedMicros, 0n)
        )}`
      },
      { label: "Fees paid", value: "$0.00" }
    ];
  }, [balanceMicros, sessions, loadingBalance, loadingSessions]);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "pending"),
    [sessions]
  );

  const recentActivity = useMemo<DashboardActivityRecord[]>(() => {
    if (!sessions.length) return [];
    return sessions.map((session, index) => ({
      id: `${session.id}-${index}`,
      sessionId: session.id,
      kind: session.status === "settled" ? "done" : session.status === "expired" ? "wait" : "chain",
      description: `${session.name} · ${session.memberCount} members`,
      amountMicros: session.collectedMicros
    }));
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <section className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Hey there,{" "}
          <span className="font-mono text-base text-muted-foreground">{truncatedAddress}</span>
        </h1>
      </section>

      {/* Stats grid */}
      <section aria-label="Account overview" className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} accent={stat.accent} />
        ))}
      </section>

      {/* Primary actions */}
      <section className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          block
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push("/dashboard/new")}
        >
          New split
        </Button>
        <Button
          size="lg"
          block
          variant="outline"
          leftIcon={<HistoryIcon className="h-4 w-4" />}
          onClick={() => router.push("/dashboard/history")}
        >
          History
        </Button>
      </section>

      {/* Active sessions */}
      <section aria-labelledby="active-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="active-heading" className="text-sm font-semibold tracking-tight text-foreground">
            Active sessions
          </h2>
          {activeSessions.length > 0 ? (
            <span className="text-xs text-muted-foreground">{activeSessions.length} pending</span>
          ) : null}
        </div>

        <div className="space-y-2.5">
          {loadingSessions ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} padding="sm" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </Card>
            ))
          ) : activeSessions.length ? (
            <>
              {activeSessions.slice(0, visibleActiveCount).map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => router.push(`/dashboard/session/${session.id}`)}
                  className="group block w-full text-left"
                >
                  <Card
                    padding="sm"
                    className="space-y-3 transition-shadow group-hover:shadow-md group-focus-visible:shadow-ring"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {session.name}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {session.memberCount} members · {session.mode}
                        </div>
                      </div>
                      <DashboardBadge
                        variant={
                          session.status === "settled"
                            ? "settled"
                            : session.status === "expired"
                            ? "expired"
                            : "pending"
                        }
                      >
                        {session.status}
                      </DashboardBadge>
                    </div>
                    <ProgressBar value={getSessionProgress(session)} />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        ${formatUsdc(session.collectedMicros)}{" "}
                        <span className="font-normal text-muted-foreground">collected</span>
                      </span>
                      <span className="text-muted-foreground">
                        ${formatUsdc(getPendingMicros(session))} pending
                      </span>
                    </div>
                  </Card>
                </button>
              ))}
              {activeSessions.length > visibleActiveCount ? (
                <button
                  type="button"
                  onClick={() => setVisibleActiveCount((c) => c + 3)}
                  className="w-full rounded-md border border-dashed border-border bg-transparent py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-ring"
                >
                  Show more
                </button>
              ) : null}
            </>
          ) : (
            <Card padding="md" variant="muted" className="text-center">
              <p className="text-sm text-muted-foreground">No active sessions yet.</p>
              <Button
                size="sm"
                variant="ghost"
                rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
                onClick={() => router.push("/dashboard/new")}
                className="mt-2"
              >
                Start your first split
              </Button>
            </Card>
          )}
        </div>
      </section>

      {/* Recent activity */}
      <section aria-labelledby="activity-heading" className="space-y-3">
        <h2 id="activity-heading" className="text-sm font-semibold tracking-tight text-foreground">
          Recent activity
        </h2>
        <div className="space-y-2">
          {loadingSessions ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} padding="sm" className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-12" />
              </Card>
            ))
          ) : recentActivity.length ? (
            <>
              {recentActivity.slice(0, visibleActivityCount).map((entry) => {
                const tone = activityTone(entry.kind);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/session/${entry.sessionId}`)}
                    className="group block w-full text-left"
                  >
                    <Card
                      padding="sm"
                      className="flex items-center gap-3 transition-shadow group-hover:shadow-md group-focus-visible:shadow-ring"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                          toneStyles[tone]
                        )}
                      >
                        <ActivityIcon kind={entry.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {entry.description}
                        </div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {entry.kind}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          entry.amountMicros > 0n ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {entry.amountMicros > 0n ? `$${formatUsdc(entry.amountMicros)}` : "··"}
                      </div>
                    </Card>
                  </button>
                );
              })}
              {recentActivity.length > visibleActivityCount ? (
                <button
                  type="button"
                  onClick={() => setVisibleActivityCount((c) => c + 3)}
                  className="w-full rounded-md border border-dashed border-border bg-transparent py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-ring"
                >
                  Show more
                </button>
              ) : null}
            </>
          ) : (
            <Card padding="md" variant="muted" className="text-center">
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
