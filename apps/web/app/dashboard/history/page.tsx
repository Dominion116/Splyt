"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBadge } from "@/components/dashboard/badge";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import {
  formatUsdc,
  getPendingMicros,
  getSessionProgress,
  normalizeSessionRecord,
  type DashboardSessionApiRecord,
  type DashboardSessionRecord,
  type DashboardSessionStatus
} from "@/lib/dashboard";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: DashboardSessionStatus }) {
  if (status === "settled") return <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />;
  if (status === "pending") return <Clock3 className="h-4 w-4 text-warning" aria-hidden="true" />;
  return <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />;
}

function statusToneBg(status: DashboardSessionStatus) {
  if (status === "settled") return "bg-success/10";
  if (status === "pending") return "bg-warning/10";
  return "bg-danger/10";
}

const filters = ["all", "settled", "pending"] as const;
type Filter = (typeof filters)[number];

export default function DashboardHistoryPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(3);
  const { address } = useDashboardWallet();
  const [sessions, setSessions] = useState<DashboardSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [address]);

  const filteredSessions = useMemo(
    () => (filter === "all" ? sessions : sessions.filter((session) => session.status === filter)),
    [filter, sessions]
  );
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
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">History</h1>
        <p className="text-sm text-muted-foreground">
          Every split you&apos;ve hosted, settled or still in flight.
        </p>
      </header>

      {/* Filter pill bar */}
      <section aria-label="Status filter">
        <div role="tablist" className="grid grid-cols-3 gap-1.5 rounded-full bg-surface-muted p-1">
          {filters.map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(item);
                  setVisibleCount(3);
                }}
                className={cn(
                  "h-9 rounded-full text-xs font-medium capitalize transition-all",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
      </section>

      {/* Sessions list */}
      <section aria-labelledby="sessions-heading" className="space-y-2.5">
        <h2 id="sessions-heading" className="sr-only">
          Sessions
        </h2>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="sm" className="flex items-stretch gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
              <div className="flex flex-col items-end justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </Card>
          ))
        ) : visibleSessions.length ? (
          <>
            {visibleSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => router.push(`/dashboard/session/${session.id}`)}
                className="group block w-full text-left"
              >
                <Card
                  padding="sm"
                  className="flex items-stretch gap-3 transition-shadow group-hover:shadow-md group-focus-visible:shadow-ring"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                      statusToneBg(session.status)
                    )}
                  >
                    <StatusIcon status={session.status} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">{session.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {session.memberCount} members · {session.createdAt} · {session.mode}
                    </p>
                    <ProgressBar
                      value={getSessionProgress(session)}
                      tone={session.status === "settled" ? "success" : "primary"}
                    />
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-between gap-1.5">
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      ${formatUsdc(session.totalMicros)}
                    </span>
                    <DashboardBadge
                      variant={
                        session.status === "settled"
                          ? "settled"
                          : session.status === "pending"
                          ? "pending"
                          : "expired"
                      }
                    >
                      {session.status}
                    </DashboardBadge>
                  </div>
                </Card>
              </button>
            ))}

            {filteredSessions.length > visibleCount ? (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + 3)}
                className="w-full rounded-md border border-dashed border-border bg-transparent py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-ring"
              >
                Show more
              </button>
            ) : null}
          </>
        ) : (
          <Card padding="md" variant="muted" className="text-center">
            <p className="text-sm text-foreground">
              {filter === "all" ? "No sessions yet." : `No ${filter} sessions.`}
            </p>
            {filter === "all" ? (
              <Button
                size="sm"
                variant="ghost"
                rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
                onClick={() => router.push("/dashboard/new")}
                className="mt-2"
              >
                Start your first split
              </Button>
            ) : null}
          </Card>
        )}
      </section>

      {/* Totals */}
      <Card padding="md">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Totals</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {[
            { label: "Total ever split", value: totals.totalEver },
            { label: "Total settled on Celo", value: totals.totalSettled },
            { label: "Total pending", value: totals.totalPending }
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {loading ? <Skeleton className="h-4 w-16" /> : `$${formatUsdc(value)}`}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Fees</dt>
            <dd className="font-mono tabular-nums text-foreground">$0.00</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
