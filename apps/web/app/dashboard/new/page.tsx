"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { ArrowRight, Camera, Loader2, Plus } from "lucide-react";
import { createThirdwebClient } from "thirdweb";
import { useFetchWithPayment } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TerminalLog, type TerminalLine } from "@/components/dashboard/terminal-log";
import { formatUsdcPrecise, isValidEthAddress } from "@/lib/dashboard";
import { isMiniPay } from "@/lib/minipay";
import { cn } from "@/lib/utils";

type ParsedReceipt = { items: Array<{ name: string; amount: string }>; subtotal: string; tax: string; total: string };
type MemberAllocation = { address: string; percentage: number };

const splitModes = ["equal", "itemised", "custom"] as const;

function fileToBase64(input: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(input);
  });
}

function equalSplit(totalMicros: bigint, memberCount: number) {
  if (!memberCount) return [] as bigint[];
  const base = totalMicros / BigInt(memberCount);
  const remainder = totalMicros % BigInt(memberCount);
  return Array.from({ length: memberCount }, (_, index) => base + (index < Number(remainder) ? 1n : 0n));
}

export default function DashboardNewSplitPage() {
  const [splitMode, setSplitMode] = useState<(typeof splitModes)[number]>("equal");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [members, setMembers] = useState<MemberAllocation[]>([{ address: "", percentage: 100 }]);
  const [itemAssignments, setItemAssignments] = useState<number[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([{ tag: "[agent]", tagColor: "text-indigo-400", text: "Awaiting receipt upload." }]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const thirdwebClient = useMemo(() => createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? "demo-client-id" }), []);
  const { fetchWithPayment } = useFetchWithPayment(thirdwebClient);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  const receiptMicros = parsedReceipt ? BigInt(Math.round(Number(parsedReceipt.total) * 1_000_000)) : 0n;

  const computedShares = useMemo(() => {
    if (!parsedReceipt) return members.map(() => 0n);
    const validMembers = members.filter((member) => isValidEthAddress(member.address));
    if (!validMembers.length) return [];

    if (splitMode === "equal") return equalSplit(receiptMicros, validMembers.length);

    if (splitMode === "custom") {
      const totalPercentage = Math.max(1, members.reduce((sum, member) => sum + member.percentage, 0));
      return members.map((member) => (receiptMicros * BigInt(member.percentage)) / BigInt(totalPercentage));
    }

    const totals = new Map<string, bigint>();
    validMembers.forEach((member) => totals.set(member.address, 0n));
    parsedReceipt.items.forEach((item, index) => {
      const member = validMembers[itemAssignments[index] ?? 0] ?? validMembers[0];
      const amountMicros = BigInt(Math.round(Number(item.amount) * 1_000_000));
      totals.set(member.address, (totals.get(member.address) ?? 0n) + amountMicros);
    });
    return validMembers.map((member) => totals.get(member.address) ?? 0n);
  }, [itemAssignments, members, parsedReceipt, receiptMicros, splitMode]);

  const onFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
    if (selected) {
      setTerminalLines([{ tag: "[agent]", tagColor: "text-indigo-400", text: "Receipt image received." }]);
    }
  };

  const onParse = async () => {
    if (!file) return;
    if (!isMiniPay()) {
      setError("Open this page in MiniPay to parse and pay with x402.");
      return;
    }

    setLoading(true);
    setError(null);
    setSessionMessage(null);
    setTerminalLines([
      { tag: "[agent]", tagColor: "text-indigo-400", text: "Receipt image received" },
      { tag: "[vision]", tagColor: "text-indigo-400", text: "Parsing receipt image..." },
      { tag: "[agent]", tagColor: "text-indigo-400", text: "Validating JSON response..." }
    ]);

    try {
      const imageBase64 = await fileToBase64(file);
      const response = (await fetchWithPayment(`${backendUrl}/api/parse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: file.type || "image/jpeg" })
      })) as Response;

      if (!response.ok) throw new Error(`Parse failed (${response.status})`);

      const parsed = (await response.json()) as ParsedReceipt;
      setParsedReceipt(parsed);
      setItemAssignments(parsed.items.map(() => 0));
      setTerminalLines([
        { tag: "[agent]", tagColor: "text-indigo-400", text: "Receipt image received" },
        { tag: "[vision]", tagColor: "text-indigo-400", text: `Parsing ${parsed.items.length} line items...` },
        { tag: "[done ]", tagColor: "text-green-500", text: `Total: $${parsed.total}  Tax: $${parsed.tax}` }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown parse error");
    } finally {
      setLoading(false);
    }
  };

  const onCreateSession = async () => {
    if (!parsedReceipt) {
      setError("Parse a receipt before creating a session.");
      return;
    }

    const activeMembers = members.map((member) => member.address.trim()).filter((member) => isValidEthAddress(member));
    if (!activeMembers.length) {
      setError("Add at least one valid member wallet.");
      return;
    }

    setSubmitLoading(true);
    setSessionMessage(null);

    try {
      const response = await fetch(`${backendUrl}/api/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          members: activeMembers,
          amounts: computedShares.map((share) => share.toString()),
          mode: splitMode,
          receipt: parsedReceipt,
          expiresInMinutes: 60
        })
      });

      if (!response.ok) throw new Error(`Create session failed (${response.status})`);

      const data = (await response.json()) as { sessionId: string };
      setSessionMessage(`tx queued • session ${data.sessionId.slice(0, 8)}`);
      window.location.assign(`/dashboard/session/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown session error");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">split mode</div>
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-zinc-800">
          {splitModes.map((mode) => <button key={mode} type="button" onClick={() => setSplitMode(mode)} className={cn("border-r border-zinc-800 px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors last:border-r-0", splitMode === mode ? "bg-indigo-600 text-white" : "bg-transparent text-zinc-500")}>{mode === "custom" ? "custom %" : mode}</button>)}
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center hover:border-indigo-500">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-zinc-800"><Camera size={24} className="text-zinc-600" strokeWidth={1.8} /></div>
          <div className="text-sm text-zinc-100">Upload receipt</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-600">$0.01 USDC via x402</div>
          <div className="mt-4"><Input type="file" accept="image/*" capture="environment" onChange={onFileSelect} /></div>
        </div>

        {preview ? <img src={preview} alt="Receipt preview" className="max-h-32 w-full rounded-lg object-cover" /> : null}

        <Button className="w-full bg-indigo-600 font-mono text-sm hover:bg-indigo-500" onClick={onParse} disabled={!file || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "parsing..." : "submit to agent"}
        </Button>
      </section>

      {loading || terminalLines.length > 1 ? <TerminalLog lines={terminalLines} animateIn={loading} className="shadow-none" /> : null}

      {parsedReceipt ? (
        <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2"><div className="font-medium text-zinc-100">Parsed items</div><div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{parsedReceipt.items.length} items</div></div>
          <div className="space-y-2 pt-1">
            {parsedReceipt.items.map((item) => <div key={item.name} className="flex items-center justify-between font-mono text-sm text-zinc-100"><span>{item.name}</span><span>${item.amount}</span></div>)}
            <div className="h-px bg-zinc-800" />
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500"><span>subtotal</span><span>${parsedReceipt.subtotal}</span></div>
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500"><span>tax</span><span>${parsedReceipt.tax}</span></div>
            <div className="flex items-center justify-between font-mono text-sm font-medium text-indigo-400"><span>total</span><span>${parsedReceipt.total}</span></div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">members</div>
          <Button type="button" variant="outline" size="sm" className="border-zinc-700 font-mono text-[10px] uppercase tracking-widest" onClick={() => setMembers((current) => [...current, { address: "", percentage: 0 }])}><Plus size={14} className="mr-1" /> add member</Button>
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          {members.map((member, index) => (
            <div key={`${index}-${member.address}`} className="space-y-2">
              <label className="block font-mono text-[9px] uppercase tracking-widest text-zinc-500">member {index + 1}</label>
              <Input value={member.address} onChange={(event) => setMembers((current) => current.map((entry, itemIndex) => (itemIndex === index ? { ...entry, address: event.target.value } : entry)))} placeholder="0x..." className="font-mono text-xs" />
              {splitMode === "custom" ? (
                <div className="space-y-1">
                  <input type="range" min={0} max={100} value={member.percentage} onChange={(event) => setMembers((current) => current.map((entry, itemIndex) => (itemIndex === index ? { ...entry, percentage: Number(event.target.value) } : entry)))} className="h-2 w-full accent-indigo-500" />
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500"><span>{member.percentage}%</span><span>${formatUsdcPrecise((receiptMicros * BigInt(member.percentage)) / 100n)}</span></div>
                </div>
              ) : null}
            </div>
          ))}

          {splitMode === "itemised" && parsedReceipt ? (
            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">item assignments</div>
              {parsedReceipt.items.map((item, itemIndex) => (
                <div key={`${item.name}-${itemIndex}`} className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-zinc-300">{item.name}</div>
                  <select value={itemAssignments[itemIndex] ?? 0} onChange={(event) => setItemAssignments((current) => current.map((entry, idx) => (idx === itemIndex ? Number(event.target.value) : entry)))} className="rounded-md border border-zinc-800 bg-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-100">
                    {members.map((member, memberIndex) => <option key={`${member.address}-${memberIndex}`} value={memberIndex}>{member.address.slice(0, 8)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs">
        <div className="flex items-center justify-between text-zinc-500"><span>split summary</span><span>{splitMode}</span></div>
        <div className="space-y-1 pt-1 text-zinc-100">
          {members.map((member, index) => <div key={`${member.address}-${index}`} className="flex items-center justify-between"><span className="truncate pr-3 text-zinc-400">{member.address || "unassigned"}</span><span>${formatUsdcPrecise(computedShares[index] ?? 0n)}</span></div>)}
        </div>
        <div className="h-px bg-zinc-800" />
        <div className="flex items-center justify-between text-zinc-100"><span>Total</span><span>${parsedReceipt ? parsedReceipt.total : "0.00"}</span></div>
      </section>

      {error ? <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs text-red-400">{error}</div> : null}
      {sessionMessage ? <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs text-zinc-400">{sessionMessage}</div> : null}

      <Button type="button" className="w-full bg-indigo-600 font-mono text-sm hover:bg-indigo-500" onClick={onCreateSession} disabled={submitLoading || !parsedReceipt}>
        {submitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
        create session
      </Button>
    </div>
  );
}
