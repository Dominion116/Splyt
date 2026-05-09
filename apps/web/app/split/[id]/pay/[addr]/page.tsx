"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";
import {
  requestWalletAccount,
  sendApproveCusdTransaction,
  sendMemberPaymentTransaction,
  waitForCeloReceipt
} from "@/lib/celo-contract";
import { formatUsdcPrecise, truncateAddress } from "@/lib/dashboard";

type SessionMember = {
  address: string;
  amount: string;
  paid: boolean;
  paidAt: number | null;
};

type SessionRecord = {
  id: string;
  host: string;
  members: SessionMember[];
  total: string;
  receipt: {
    items: Array<{ name: string; amount: string; quantity?: number }>;
    subtotal: string;
    tax: string;
    total: string;
    currency: "cUSD";
  };
  allPaid: boolean;
};

type PriceResponse = {
  price: string;
  currency: "cUSD";
  decimals: number;
  blockchainAmount: string;
};

function isSameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

export default function PayPage({ params }: { params: Promise<{ id: string; addr: string }> }) {
  const { id: sessionId, addr } = use(params);
  const { address: connectedAddress } = useDashboardWallet();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [price, setPrice] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txHash: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
  const memberAddress = addr.toLowerCase();

  const member = useMemo(
    () => session?.members.find((entry) => entry.address.toLowerCase() === memberAddress) ?? null,
    [memberAddress, session]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [sessionResponse, priceResponse] = await Promise.all([
          fetch(`${backendUrl}/api/session/${sessionId}`),
          fetch(`${backendUrl}/api/pay/${sessionId}/${addr}/price`)
        ]);

        const sessionData = (await sessionResponse.json().catch(() => ({}))) as SessionRecord & { message?: string };
        if (!sessionResponse.ok) {
          throw new Error(sessionData.message || `Session lookup failed (${sessionResponse.status})`);
        }
        setSession(sessionData);

        if (priceResponse.status === 409) {
          setPrice(null);
          return;
        }

        const priceData = (await priceResponse.json().catch(() => ({}))) as PriceResponse & { message?: string };
        if (!priceResponse.ok) {
          throw new Error(priceData.message || `Price lookup failed (${priceResponse.status})`);
        }
        setPrice(priceData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment details.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [addr, backendUrl, sessionId]);

  const onPay = async () => {
    try {
      setPaying(true);
      setError(null);
      const walletAddress = isSameAddress(connectedAddress, addr) ? connectedAddress : await requestWalletAccount();
      if (!isSameAddress(walletAddress, addr)) {
        throw new Error("Connect the same wallet address that was added as this session member.");
      }

      const amountToApprove = BigInt(price?.blockchainAmount ?? member?.amount ?? "0");
      const approvalTxHash = await sendApproveCusdTransaction({
        from: walletAddress as `0x${string}`,
        amount: amountToApprove
      });
      await waitForCeloReceipt(approvalTxHash);

      const txHash = await sendMemberPaymentTransaction({
        sessionId,
        from: walletAddress as `0x${string}`,
        member: addr as `0x${string}`
      });
      await waitForCeloReceipt(txHash);

      const response = await fetch(`${backendUrl}/api/pay/${sessionId}/${addr}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txHash })
      });
      const data = (await response.json().catch(() => ({}))) as { txHash?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.message || `Payment failed (${response.status})`);
      }

      setSuccess({ txHash: data.txHash ?? "" });
      setSession((current) =>
        current
          ? {
              ...current,
              members: current.members.map((entry) =>
                entry.address.toLowerCase() === memberAddress ? { ...entry, paid: true, paidAt: Date.now() } : entry
              ),
              allPaid: current.members.every((entry) => entry.address.toLowerCase() === memberAddress || entry.paid)
            }
          : current
      );
      setPrice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1600);
  };

  const isConnectedMember = !connectedAddress || isSameAddress(connectedAddress, addr);
  const alreadyPaid = !!member?.paid;

  return (
    <main className="relative min-h-screen bg-background">
      <div aria-hidden="true" className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] opacity-70" />

      {/* Top bar */}
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-base">splyt</span>
          </Link>
          <Badge variant="primary" dot className="text-[10px]">
            Celo · cUSD
          </Badge>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-10 space-y-8">
        {/* Title */}
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Member payment</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Pay your share
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Session {truncateAddress(sessionId, 10, 6)}
          </p>
        </section>

        {/* Loading skeleton */}
        {loading ? (
          <Card padding="md" className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ) : null}

        {/* Member not found */}
        {!loading && !member && !error ? (
          <Card padding="md" variant="muted" className="text-center">
            <p className="text-sm text-foreground">This payment link doesn&apos;t match a member in this session.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Double-check the URL with whoever shared it with you.
            </p>
          </Card>
        ) : null}

        {/* Main payment card */}
        {!loading && member ? (
          <>
            <Card padding="md" className="space-y-5">
              {/* Hero amount */}
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Amount due
                </p>
                <p className="mt-2 font-mono text-5xl font-semibold tabular-nums tracking-tight text-foreground">
                  ${formatUsdcPrecise(price?.blockchainAmount ?? member.amount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">cUSD on Celo</p>
              </div>

              <Separator />

              {/* Detail rows */}
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Member wallet</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {truncateAddress(member.address)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Total session</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    ${formatUsdcPrecise(session?.total ?? "0")}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge
                      variant={alreadyPaid ? "success" : "warning"}
                      dot
                      className="text-[10px]"
                    >
                      {alreadyPaid ? "Paid" : "Pending"}
                    </Badge>
                  </dd>
                </div>
              </dl>

              {/* Two-step explainer */}
              {!alreadyPaid && !success ? (
                <div className="rounded-md bg-primary-soft/60 p-3.5 text-[13px] text-primary">
                  <p className="font-medium">Two wallet signatures</p>
                  <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-primary/90">
                    <li>Approve cUSD spend for this session</li>
                    <li>Confirm the on-chain payment</li>
                  </ol>
                </div>
              ) : null}

              {/* Wallet mismatch warning */}
              {!isConnectedMember ? (
                <Card role="alert" padding="sm" className="border-warning/30 bg-warning/5">
                  <p className="text-sm font-medium text-warning">Wrong wallet connected</p>
                  <p className="mt-0.5 text-xs text-warning/80">
                    Switch to {truncateAddress(addr)} to complete this payment.
                  </p>
                </Card>
              ) : null}

              {/* Error */}
              {error ? (
                <Card role="alert" padding="sm" className="border-danger/30 bg-danger/5 text-sm text-danger">
                  {error}
                </Card>
              ) : null}

              {/* Success */}
              {success ? (
                <Card padding="sm" className="border-success/30 bg-success/5">
                  <div className="flex items-center gap-2 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Payment recorded
                  </div>
                  {success.txHash ? (
                    <p className="mt-1.5 break-all font-mono text-[11px] text-success/80">
                      {success.txHash}
                    </p>
                  ) : null}
                </Card>
              ) : null}

              {/* CTAs */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  block
                  size="lg"
                  onClick={onPay}
                  loading={paying}
                  disabled={alreadyPaid || !isConnectedMember}
                  leftIcon={<Wallet className="h-4 w-4" />}
                >
                  {alreadyPaid ? "Already paid" : paying ? "Processing" : "Pay now"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={copyLink}
                  leftIcon={linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  className="sm:w-auto"
                >
                  {linkCopied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </Card>

            {/* Receipt summary */}
            {session?.receipt.items?.length ? (
              <Card padding="md">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Receipt summary
                </h2>
                <Separator className="my-3" />
                <ul className="space-y-1.5 text-sm">
                  {session.receipt.items.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate text-foreground">
                        {item.quantity && item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name}
                      </span>
                      <span className="font-mono tabular-nums text-foreground">${item.amount}</span>
                    </li>
                  ))}
                </ul>
                <Separator className="my-3" />
                <dl className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd className="font-mono tabular-nums">${session.receipt.subtotal}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Tax</dt>
                    <dd className="font-mono tabular-nums">${session.receipt.tax}</dd>
                  </div>
                  <div className="mt-2 flex justify-between text-sm font-semibold text-foreground">
                    <dt>Total</dt>
                    <dd className="font-mono tabular-nums">${session.receipt.total}</dd>
                  </div>
                </dl>
              </Card>
            ) : null}
          </>
        ) : null}

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <span>Powered by Splyt on Celo</span>
          <a
            href={`https://celoscan.io/address/${addr}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            View on Celoscan
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </footer>
      </div>
    </main>
  );
}
