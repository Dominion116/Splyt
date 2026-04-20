"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { DashboardBadge } from "@/components/dashboard/badge";
import { TerminalLog, type TerminalLine } from "@/components/dashboard/terminal-log";
import { formatUsdcPrecise, mockWalletAddress, truncateAddress } from "@/lib/dashboard";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";

type MemberStatus = { address: string; paid: boolean; amountDue: bigint };

export default function DashboardSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { address } = useDashboardWallet();
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [allPaid, setAllPaid] = useState(false);
  const [logLines, setLogLines] = useState<TerminalLine[]>([{ tag: "[chain]", tagColor: "text-indigo-400", text: "Waiting for payment updates..." }]);
  const [streamOpen, setStreamOpen] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  const sessionId = params.id;
  const shareAddress = address || mockWalletAddress;

  useEffect(() => {
    const source = new EventSource(`${backendUrl}/api/status/${sessionId}`);
    setStreamOpen(true);

    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as { members: MemberStatus[]; allPaid: boolean };
      setMembers(data.members);
      setAllPaid(data.allPaid);
      setLogLines((current) => [...current, { tag: data.allPaid ? "[done ]" : "[wait ]", tagColor: data.allPaid ? "text-green-500" : "text-amber-500", text: `${data.members.filter((member) => member.paid).length}/${data.members.length} members paid` }]);
      if (data.allPaid) {
        source.close();
        setStreamOpen(false);
      }
    };

    source.onerror = () => setStreamOpen(false);

    return () => {
      source.close();
      setStreamOpen(false);
    };
  }, [backendUrl, sessionId]);

  const progress = useMemo(() => {
    if (!members.length) return 0;
    return (members.filter((member) => member.paid).length / members.length) * 100;
  }, [members]);

  const collectedMicros = members.reduce((sum, member) => sum + (member.paid ? member.amountDue : 0n), 0n);
  const pendingMicros = members.reduce((sum, member) => sum + (member.paid ? 0n : member.amountDue), 0n);

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-medium text-zinc-100">Session {sessionId.slice(0, 8)}</div>
            <div className="font-mono text-[10px] text-zinc-600">{truncateAddress(sessionId)}</div>
          </div>
          <DashboardBadge variant={allPaid ? "settled" : "pending"}>{allPaid ? "settled" : "pending"}</DashboardBadge>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">celo mainnet</div>
        <ProgressBar value={progress} label={`${Math.round(progress)}% paid`} />
        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500">
          <span>${formatUsdcPrecise(collectedMicros)} collected</span>
          <span>${formatUsdcPrecise(pendingMicros)} pending</span>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="font-medium text-zinc-100">Live members</div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500"><span className={`h-2 w-2 rounded-md ${streamOpen ? "bg-green-500" : "bg-zinc-700"}`} />{streamOpen ? "live" : "idle"}</div>
        </div>
        <div className="space-y-2 pt-1">
          {members.length ? members.map((member) => (
            <div key={member.address} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <Avatar className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-[10px] font-mono text-zinc-400">{member.address.slice(2, 4)}</Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="truncate font-mono text-[10px] text-zinc-400">{member.address}</div>
                <div className="font-mono text-xs text-zinc-100">${formatUsdcPrecise(member.amountDue)}</div>
              </div>
              <DashboardBadge variant={member.paid ? "paid" : "pending"}>{member.paid ? "paid" : "pending"}</DashboardBadge>
            </div>
          )) : <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-600">waiting for status feed...</div>}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <TerminalLog lines={logLines} live className="max-h-64" />
        {allPaid ? <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100">Session settled. All payments confirmed on Celo.</div> : null}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Button type="button" className="bg-indigo-600 font-mono text-sm hover:bg-indigo-500" onClick={async () => navigator.clipboard.writeText(`${window.location.origin}/dashboard/session/${sessionId}`)}>
          <ClipboardCopy className="mr-2 h-4 w-4" /> share link
        </Button>
        <Button type="button" variant="outline" className="border-zinc-700 font-mono text-sm" onClick={() => router.push("/dashboard/new")}>
          <Play className="mr-2 h-4 w-4" /> new split
        </Button>
      </section>
    </div>
  );
}
