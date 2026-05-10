"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { ArrowRight, Camera, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";
import { TerminalLog, type TerminalLine } from "@/components/dashboard/terminal-log";
import { formatUsdcPrecise, isValidEthAddress } from "@/lib/dashboard";
import {
  hostAuthMessage,
  personalSign,
  requestWalletAccount,
  sendCreateSessionTransaction,
  waitForCeloReceipt
} from "@/lib/celo-contract";
import { cn } from "@/lib/utils";

type ParsedReceipt = {
  items: Array<{ name: string; amount: string; quantity?: number; unitPrice?: string }>;
  subtotal: string;
  tax: string;
  total: string;
};
type MemberAllocation = { address: string; percentage: number };

const splitModes = ["equal", "itemised", "custom"] as const;

const tagColor = {
  agent: "text-primary",
  vision: "text-primary",
  done: "text-success",
  wait: "text-warning"
} as const;

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
  const router = useRouter();
  const { address: connectedAddress } = useDashboardWallet();
  const [splitMode, setSplitMode] = useState<(typeof splitModes)[number]>("equal");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [members, setMembers] = useState<MemberAllocation[]>([{ address: "", percentage: 100 }]);
  const [itemAssignments, setItemAssignments] = useState<number[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { tag: "[agent]", tagColor: tagColor.agent, text: "Awaiting receipt upload." }
  ]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

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
      setTerminalLines([{ tag: "[agent]", tagColor: tagColor.agent, text: "Receipt image received." }]);
    }
  };

  const onParse = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSessionMessage(null);
    setTerminalLines([
      { tag: "[agent]", tagColor: tagColor.agent, text: "Receipt image received" },
      { tag: "[vision]", tagColor: tagColor.vision, text: "Connecting to AI service..." },
      { tag: "[agent]", tagColor: tagColor.agent, text: "Processing receipt data..." }
    ]);

    try {
      const imageBase64 = await fileToBase64(file);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 90_000);
      const response = await fetch(`${backendUrl}/api/parse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: file.type || "image/jpeg" }),
        signal: controller.signal
      });
      window.clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Parse failed (${response.status})`);
      }

      const parsed = (await response.json()) as ParsedReceipt;
      setParsedReceipt(parsed);
      setItemAssignments(parsed.items.map(() => 0));
      setTerminalLines([
        { tag: "[agent]", tagColor: tagColor.agent, text: "Receipt image received" },
        { tag: "[vision]", tagColor: tagColor.vision, text: `AI processed ${parsed.items.length} line items` },
        { tag: "[done ]", tagColor: tagColor.done, text: `Total: $${parsed.total}  Tax: $${parsed.tax}` }
      ]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Parse request timed out. Please check your internet connection and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to parse receipt. Please try again.");
      }
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
    setError(null);

    try {
      const hostAddress = isValidEthAddress(connectedAddress) ? connectedAddress : await requestWalletAccount();
      const sessionId = crypto.randomUUID();
      const expiresAtSeconds = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);
      const txHash = await sendCreateSessionTransaction({
        sessionId,
        from: hostAddress as `0x${string}`,
        members: activeMembers as `0x${string}`[],
        amounts: computedShares,
        expiresAt: expiresAtSeconds
      });

      setSessionMessage(`Waiting for wallet transaction · ${txHash.slice(0, 10)}...`);
      await waitForCeloReceipt(txHash);

      // Prove ownership of the host wallet to the backend by signing a
      // message bound to this sessionId. Without this signature anyone could
      // register a session attributed to any address.
      setSessionMessage("Sign the host confirmation in your wallet…");
      const hostSignature = await personalSign({
        address: hostAddress as `0x${string}`,
        message: hostAuthMessage(sessionId)
      });

      const response = await fetch(`${backendUrl}/api/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          host: hostAddress,
          hostSignature,
          txHash,
          members: activeMembers,
          amounts: computedShares.map((share) => share.toString()),
          mode: splitMode,
          receipt: parsedReceipt,
          expiresInMinutes: 60
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Create session failed (${response.status})`);
      }

      const data = (await response.json()) as { sessionId: string };
      setSessionMessage(`Session created · ${data.sessionId.slice(0, 8)}`);
      router.push(`/dashboard/session/${data.sessionId}`);
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError(`Could not reach the backend at ${backendUrl}. Check NEXT_PUBLIC_BACKEND_URL and make sure the backend is deployed over HTTPS.`);
      } else {
        setError(err instanceof Error ? err.message : "Unknown session error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New split</h1>
        <p className="text-sm text-muted-foreground">
          Snap a receipt, choose how to split, and ship payment links to your group.
        </p>
      </header>

      {/* Split mode segmented control */}
      <section aria-labelledby="mode-heading" className="space-y-2">
        <h2 id="mode-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Split mode
        </h2>
        <div role="tablist" aria-label="Split mode" className="grid grid-cols-3 gap-1.5 rounded-full bg-surface-muted p-1">
          {splitModes.map((mode) => {
            const active = splitMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSplitMode(mode)}
                className={cn(
                  "h-9 rounded-full text-xs font-medium capitalize transition-all",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode === "custom" ? "Custom %" : mode}
              </button>
            );
          })}
        </div>
      </section>

      {/* Receipt upload */}
      <section aria-labelledby="upload-heading" className="space-y-3">
        <h2 id="upload-heading" className="sr-only">Upload receipt</h2>
        <label className="block cursor-pointer">
          <Card
            padding="lg"
            variant="outline"
            className="border-2 border-dashed text-center transition-colors hover:border-primary hover:bg-primary-soft/30"
          >
            <span aria-hidden="true" className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Camera className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <p className="text-sm font-medium text-foreground">
              {file ? file.name : "Upload receipt"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {file ? "Tap to choose a different photo" : "Photo, PDF, or screenshot · free parsing"}
            </p>
            <input type="file" accept="image/*" capture="environment" onChange={onFileSelect} className="sr-only" />
          </Card>
        </label>

        {preview ? (
          <Card padding="none" className="overflow-hidden">
            <img src={preview} alt="Receipt preview" className="max-h-40 w-full object-cover" />
          </Card>
        ) : null}

        <Button
          block
          size="lg"
          onClick={onParse}
          disabled={!file}
          loading={loading}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          {loading ? "Parsing receipt" : "Submit to agent"}
        </Button>
      </section>

      {/* Agent terminal */}
      {loading || terminalLines.length > 1 ? (
        <TerminalLog lines={terminalLines} animateIn={loading} live={loading} />
      ) : null}

      {/* Parsed items */}
      {parsedReceipt ? (
        <Card padding="md">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Parsed items</h2>
            <span className="text-xs text-muted-foreground">{parsedReceipt.items.length} items</span>
          </div>
          <Separator className="my-3" />
          <ul className="space-y-2 text-sm">
            {parsedReceipt.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate text-foreground">
                  {item.quantity && item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name}
                </span>
                <span className="font-mono tabular-nums text-foreground">${item.amount}</span>
              </li>
            ))}
          </ul>
          <Separator className="my-3" />
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="font-mono tabular-nums">${parsedReceipt.subtotal}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Tax</dt>
              <dd className="font-mono tabular-nums">${parsedReceipt.tax}</dd>
            </div>
            <div className="mt-2 flex justify-between text-base font-semibold text-primary">
              <dt>Total</dt>
              <dd className="font-mono tabular-nums">${parsedReceipt.total}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {/* Members */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Members</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setMembers((current) => [...current, { address: "", percentage: 0 }])}
          >
            Add member
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {members.map((member, index) => (
            <div key={index} className="space-y-2">
              <Field id={`member-${index}`} label={`Member ${index + 1}`}>
                <Input
                  value={member.address}
                  onChange={(event) =>
                    setMembers((current) =>
                      current.map((entry, itemIndex) =>
                        itemIndex === index ? { ...entry, address: event.target.value } : entry
                      )
                    )
                  }
                  placeholder="0x..."
                  className="font-mono text-xs"
                />
              </Field>
              {splitMode === "custom" ? (
                <div className="space-y-1.5 px-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={member.percentage}
                    onChange={(event) =>
                      setMembers((current) =>
                        current.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, percentage: Number(event.target.value) } : entry
                        )
                      )
                    }
                    className="h-2 w-full accent-primary"
                    aria-label={`Member ${index + 1} percentage`}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{member.percentage}%</span>
                    <span className="font-mono tabular-nums">
                      ${formatUsdcPrecise((receiptMicros * BigInt(member.percentage)) / 100n)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {splitMode === "itemised" && parsedReceipt ? (
          <>
            <Separator className="my-4" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Item assignments
            </h3>
            <div className="mt-2 space-y-2">
              {parsedReceipt.items.map((item, itemIndex) => (
                <div key={`${item.name}-${itemIndex}`} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {item.quantity && item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name}
                  </span>
                  <select
                    value={itemAssignments[itemIndex] ?? 0}
                    onChange={(event) =>
                      setItemAssignments((current) =>
                        current.map((entry, idx) => (idx === itemIndex ? Number(event.target.value) : entry))
                      )
                    }
                    aria-label={`Assign ${item.name}`}
                    className="rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:shadow-ring"
                  >
                    {members.map((memberOption, memberIndex) => (
                      <option key={`${memberOption.address}-${memberIndex}`} value={memberIndex}>
                        {memberOption.address ? memberOption.address.slice(0, 8) : `Member ${memberIndex + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      {/* Summary */}
      <Card padding="md" variant="muted">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Split summary</h2>
          <span className="text-xs capitalize text-muted-foreground">{splitMode}</span>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {members.map((member, index) => (
            <li key={`${member.address}-${index}`} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                {member.address || "Unassigned"}
              </span>
              <span className="font-mono tabular-nums text-foreground">
                ${formatUsdcPrecise(computedShares[index] ?? 0n)}
              </span>
            </li>
          ))}
        </ul>
        <Separator className="my-3" />
        <div className="flex items-center justify-between text-sm font-semibold text-foreground">
          <span>Total</span>
          <span className="font-mono tabular-nums">${parsedReceipt ? parsedReceipt.total : "0.00"}</span>
        </div>
      </Card>

      {error ? (
        <Card role="alert" padding="sm" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : null}
      {sessionMessage ? (
        <Card padding="sm" variant="muted" className="text-xs text-muted-foreground">
          {sessionMessage}
        </Card>
      ) : null}

      <Button
        type="button"
        block
        size="lg"
        onClick={onCreateSession}
        disabled={!parsedReceipt}
        loading={submitLoading}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        {submitLoading ? "Creating session" : "Create session"}
      </Button>
    </div>
  );
}
