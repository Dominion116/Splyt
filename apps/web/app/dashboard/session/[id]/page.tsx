"use client";

import { use } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCopy, Link2, Play, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";
import { DashboardBadge } from "@/components/dashboard/badge";
import { TerminalLog, type TerminalLine } from "@/components/dashboard/terminal-log";
import { assertCanCloseSession, requestWalletAccount, sendCloseSessionTransaction, waitForCeloReceipt } from "@/lib/celo-contract";
import { formatUsdcPrecise, truncateAddress } from "@/lib/dashboard";

type MemberStatus = { address: string; paid: boolean; amountDue: string; paidAt?: number | null };
type SessionRecord = {
  id: string;
  host: string;
  chainStatus?: "live" | "missing";
  chainActive?: boolean;
  createTxHash?: string | null;
  closeTxHash?: string | null;
  closedAt?: number | null;
  members: Array<{ address: string; amount: string; paid: boolean; paidAt: number | null; paymentTxHash?: string | null }>;
};

const tagColor = {
  chain: "text-primary",
  done: "text-success",
  wait: "text-warning"
} as const;

export default function DashboardSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { address: connectedAddress } = useDashboardWallet();
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [allPaid, setAllPaid] = useState(false);
  const [logLines, setLogLines] = useState<TerminalLine[]>([
    { tag: "[chain]", tagColor: tagColor.chain, text: "Waiting for payment updates..." }
  ]);
  const [streamOpen, setStreamOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionRecord, setSessionRecord] = useState<SessionRecord | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeTxHash, setCloseTxHash] = useState<string | null>(null);
  const [copiedPayLinkFor, setCopiedPayLinkFor] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  const { id: sessionId } = use(params);
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    let source: EventSource | null = null;

    const openStream = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/session/${sessionId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Session lookup failed (${response.status})`);
        }
        const sessionData = (await response.json()) as SessionRecord;
        setSessionRecord(sessionData);

        setError(null);
        source = new EventSource(`${backendUrl}/api/status/${sessionId}`);
        setStreamOpen(true);

        source.onmessage = (event) => {
          const data = JSON.parse(event.data) as { members: MemberStatus[]; allPaid: boolean; active?: boolean };
          setMembers(data.members);
          setAllPaid(data.allPaid);
          setSessionRecord((current) =>
            current
              ? {
                  ...current,
                  chainActive: data.active ?? current.chainActive,
                  members: current.members.map((entry) => {
                    const liveMember = data.members.find((member) => member.address.toLowerCase() === entry.address.toLowerCase());
                    return liveMember
                      ? {
                          ...entry,
                          amount: liveMember.amountDue,
                          paid: liveMember.paid,
                          paidAt: liveMember.paidAt ?? null
                        }
                      : entry;
                  })
                }
              : current
          );
          setLogLines((current) => {
            const nextLine = {
              tag: data.allPaid ? "[done ]" : "[wait ]",
              tagColor: data.allPaid ? tagColor.done : tagColor.wait,
              text: `${data.members.filter((member) => member.paid).length}/${data.members.length} members paid`
            };
            const lastLine = current[current.length - 1];
            if (lastLine?.tag === nextLine.tag && lastLine?.text === nextLine.text) {
              return current;
            }
            return [...current, nextLine];
          });
          if (data.allPaid) {
            source?.close();
            setStreamOpen(false);
          }
        };

        source.onerror = () => {
          setStreamOpen(false);
          setError("Live session updates are temporarily unavailable.");
        };
      } catch (err) {
        setStreamOpen(false);
        setError(err instanceof Error ? err.message : "Failed to load session.");
      }
    };

    void openStream();

    return () => {
      source?.close();
      setStreamOpen(false);
    };
  }, [backendUrl, sessionId]);

  const progress = useMemo(() => {
    if (!members.length) return 0;
    return (members.filter((member) => member.paid).length / members.length) * 100;
  }, [members]);

  const isHost = useMemo(
    () => !!sessionRecord?.host && !!connectedAddress && sessionRecord.host.toLowerCase() === connectedAddress.toLowerCase(),
    [connectedAddress, sessionRecord]
  );
  const isLiveOnCurrentContract = sessionRecord?.chainStatus !== "missing";
  const isClosed = sessionRecord?.chainActive === false || !!closeTxHash || !!sessionRecord?.closeTxHash;

  const collectedMicros = members.reduce((sum, member) => sum + (member.paid ? BigInt(member.amountDue) : 0n), 0n);
  const pendingMicros = members.reduce((sum, member) => sum + (member.paid ? 0n : BigInt(member.amountDue)), 0n);
  const paidCount = members.filter((m) => m.paid).length;

  const onCloseSession = async () => {
    try {
      setClosing(true);
      setError(null);
      if (!isLiveOnCurrentContract) {
        throw new Error("This session belongs to an older or unavailable contract, so it cannot be withdrawn from this page.");
      }
      const hostAddress = isHost ? connectedAddress : await requestWalletAccount();
      if (!sessionRecord?.host || hostAddress.toLowerCase() !== sessionRecord.host.toLowerCase()) {
        throw new Error("Connect the host wallet to close this session.");
      }
      await assertCanCloseSession({ sessionId, from: hostAddress as `0x${string}` });

      const txHash = await sendCloseSessionTransaction({ sessionId, from: hostAddress as `0x${string}` });
      const receipt = await waitForCeloReceipt(txHash);
      if (receipt.status !== "success") {
        throw new Error("The close session transaction did not succeed on-chain.");
      }
      const confirmResponse = await fetch(`${backendUrl}/api/session/${sessionId}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txHash })
      });
      if (!confirmResponse.ok) {
        const confirmData = (await confirmResponse.json().catch(() => ({}))) as { message?: string };
        throw new Error(confirmData.message || `Close confirmation failed (${confirmResponse.status})`);
      }
      setCloseTxHash(txHash);
      setSessionRecord((current) =>
        current
          ? { ...current, chainActive: false, closeTxHash: txHash, closedAt: Date.now() }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close session.");
    } finally {
      setClosing(false);
    }
  };

  const onCopyPayLink = async (payLink: string, memberAddress: string) => {
    await navigator.clipboard.writeText(payLink);
    setCopiedPayLinkFor(memberAddress);
    window.setTimeout(() => {
      setCopiedPayLinkFor((current) => (current === memberAddress ? null : current));
    }, 1600);
  };

  const onCopyShareLink = async () => {
    await navigator.clipboard.writeText(`${appOrigin}/dashboard/session/${sessionId}`);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1600);
  };

  const closeHelpText = isClosed
    ? "Session closed on-chain. The payout was transferred to the host wallet in this transaction."
    : isLiveOnCurrentContract
    ? isHost
      ? allPaid
        ? "All members have paid. You can withdraw by closing the session on-chain."
        : "Withdraw unlocks once every member has paid."
      : "Only the host wallet can withdraw by closing this session."
    : "This session is in history but not on the currently configured contract. Withdraw is unavailable here.";

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Session</p>
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
              {sessionId.slice(0, 8)}
            </h1>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {truncateAddress(sessionId)} · Celo mainnet
            </p>
          </div>
          <DashboardBadge variant={allPaid ? "settled" : "pending"}>
            {allPaid ? "Settled" : "Pending"}
          </DashboardBadge>
        </div>

        <div>
          <ProgressBar value={progress} tone={allPaid ? "success" : "primary"} />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              {paidCount} of {members.length || "—"} paid
            </span>
            <span className="text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-success/10 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-success/80">Collected</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-success">
              ${formatUsdcPrecise(collectedMicros)}
            </p>
          </div>
          <div className="rounded-md bg-surface-muted p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pending</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
              ${formatUsdcPrecise(pendingMicros)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            block
            variant={isClosed ? "outline" : "primary"}
            onClick={onCloseSession}
            loading={closing}
            disabled={!isHost || !allPaid || !isLiveOnCurrentContract || isClosed}
            leftIcon={<Wallet className="h-4 w-4" />}
          >
            {closing ? "Closing session" : isClosed ? "Withdrawn" : "Withdraw to wallet"}
          </Button>
          <p className="text-xs text-muted-foreground">{closeHelpText}</p>
        </div>
      </Card>

      {/* Live members */}
      <section aria-labelledby="members-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="members-heading" className="text-sm font-semibold tracking-tight text-foreground">
            Live members
          </h2>
          <Badge variant={streamOpen ? "success" : "secondary"} dot className="text-[10px]">
            {streamOpen ? "Live" : "Idle"}
          </Badge>
        </div>

        <div className="space-y-2">
          {members.length ? (
            members.map((member) => (
              <Card key={member.address} padding="sm" className="flex items-center gap-3">
                <Avatar size="md" name={member.address.slice(2, 4)} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {member.address}
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    ${formatUsdcPrecise(member.amountDue)}
                  </p>
                </div>
                <DashboardBadge variant={member.paid ? "paid" : "pending"}>
                  {member.paid ? "Paid" : "Pending"}
                </DashboardBadge>
              </Card>
            ))
          ) : (
            <Card padding="md" variant="muted" className="text-center">
              <p className="text-sm text-muted-foreground">Waiting for status feed…</p>
            </Card>
          )}
        </div>
      </section>

      {/* Activity log */}
      <section aria-labelledby="log-heading" className="space-y-3">
        <h2 id="log-heading" className="sr-only">Activity log</h2>
        <TerminalLog lines={logLines} live={streamOpen} className="max-h-64" />
        {error ? (
          <Card role="alert" padding="sm" className="border-danger/30 bg-danger/5 text-sm text-danger">
            {error}
          </Card>
        ) : null}
        {allPaid && !error ? (
          <Card padding="sm" className="border-success/30 bg-success/5 text-sm text-success">
            Session settled. All payments confirmed on Celo.
          </Card>
        ) : null}
        {sessionRecord?.closeTxHash || closeTxHash ? (
          <Card padding="sm" className="border-success/30 bg-success/5 text-sm text-success">
            <p className="font-medium">Close transaction confirmed</p>
            <p className="mt-1 break-all font-mono text-xs">
              {sessionRecord?.closeTxHash ?? closeTxHash}
            </p>
          </Card>
        ) : null}
      </section>

      {/* Transaction trail */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Transaction trail</h2>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Audit</span>
        </div>
        <Separator className="my-3" />
        <ul className="space-y-2.5 text-xs">
          <li>
            <p className="text-muted-foreground">Session create</p>
            <p className="mt-0.5 break-all font-mono text-foreground">
              {sessionRecord?.createTxHash ?? "Not tracked for this session"}
            </p>
          </li>
          {sessionRecord?.members.map((member) => (
            <li key={`${member.address}-tx`}>
              <p className="text-muted-foreground">
                Member payment <span className="font-mono">{truncateAddress(member.address)}</span>
              </p>
              <p className="mt-0.5 break-all font-mono text-foreground">
                {member.paymentTxHash ?? (member.paid ? "Paid on-chain, tx hash not stored." : "Pending")}
              </p>
            </li>
          ))}
          <li>
            <p className="text-muted-foreground">Host withdraw</p>
            <p className="mt-0.5 break-all font-mono text-foreground">
              {sessionRecord?.closeTxHash ?? closeTxHash ?? "Not withdrawn yet"}
            </p>
          </li>
        </ul>
      </Card>

      {/* Pay links */}
      {sessionRecord?.members?.length ? (
        <Card padding="md">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Pay links</h2>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Share</span>
          </div>
          <Separator className="my-3" />
          <ul className="space-y-2">
            {sessionRecord.members.map((member) => {
              const payLink = `${appOrigin}/split/${sessionId}/pay/${member.address}`;
              const copied = copiedPayLinkFor === member.address;
              return (
                <li
                  key={member.address}
                  className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {member.address}
                    </p>
                    <p className="font-mono text-xs font-semibold tabular-nums text-foreground">
                      ${formatUsdcPrecise(member.amount)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={copied ? "outline" : "outline"}
                    size="sm"
                    onClick={() => void onCopyPayLink(payLink, member.address)}
                    leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    aria-label={`Copy pay link for ${member.address}`}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {/* Footer actions */}
      <section className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          block
          onClick={() => void onCopyShareLink()}
          leftIcon={shareCopied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
        >
          {shareCopied ? "Link copied" : "Share link"}
        </Button>
        <Button
          type="button"
          block
          variant="outline"
          onClick={() => router.push("/dashboard/new")}
          leftIcon={<Play className="h-4 w-4" />}
        >
          New split
        </Button>
      </section>
    </div>
  );
}
