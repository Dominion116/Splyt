"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Member = { address: string; paid: boolean; paidAt: number | null };

export function PaymentStatus({ sessionId }: { sessionId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [allPaid, setAllPaid] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
    const es = new EventSource(`${base}/api/status/${sessionId}`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as { members: Member[]; allPaid: boolean };
      setMembers(data.members);
      setAllPaid(data.allPaid);
      if (data.allPaid) es.close();
    };
    return () => es.close();
  }, [sessionId]);

  const paidCount = useMemo(() => members.filter((m) => m.paid).length, [members]);
  const progress = members.length === 0 ? 0 : (paidCount / members.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} />
        <div className="space-y-2">
          {members.map((m) => (
            <Badge key={m.address} variant={m.paid ? "outline" : "secondary"} className="mr-2">
              <span className={`mr-2 h-1.5 w-1.5 rounded-full ${m.paid ? "bg-emerald-400" : "bg-zinc-500"}`} />
              <span className="font-mono text-xs text-zinc-500">
                {m.address.slice(0, 6)}...{m.address.slice(-4)}
              </span>
            </Badge>
          ))}
        </div>
        {allPaid ? <p className="text-sm text-emerald-400">Session settled. All payments confirmed on Celo.</p> : null}
      </CardContent>
    </Card>
  );
}
