"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type Member = { address: string; paid: boolean; paidAt: number | null };

export function PaymentStatus({ sessionId }: { sessionId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [allPaid, setAllPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
    const es = new EventSource(`${base}/api/status/${sessionId}`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as { members: Member[]; allPaid: boolean };
      setMembers(data.members);
      setAllPaid(data.allPaid);
      setLoading(false);
      if (data.allPaid) es.close();
    };
    return () => es.close();
  }, [sessionId]);

  const paidCount = useMemo(() => members.filter((m) => m.paid).length, [members]);
  const progress = members.length === 0 ? 0 : (paidCount / members.length) * 100;

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Payment status</h2>
        {!loading ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {paidCount}/{members.length} paid
          </span>
        ) : null}
      </div>

      {loading ? (
        <>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-32 rounded-full" />
            ))}
          </div>
        </>
      ) : (
        <>
          <Progress value={progress} tone={allPaid ? "success" : "primary"} />
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li key={m.address}>
                <Badge variant={m.paid ? "success" : "secondary"} dot className="font-mono text-[11px]">
                  {m.address.slice(0, 6)}…{m.address.slice(-4)}
                </Badge>
              </li>
            ))}
          </ul>
          {allPaid ? (
            <Card padding="sm" className="border-success/30 bg-success/5 text-sm text-success">
              Session settled. All payments confirmed on Celo.
            </Card>
          ) : null}
        </>
      )}
    </Card>
  );
}
