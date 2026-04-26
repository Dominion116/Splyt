"use client";

import { use, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBadge } from "@/components/dashboard/badge";
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

export default function PayPage({ params }: { params: Promise<{ id: string; addr: string }> }) {
  const { id: sessionId, addr } = use(params);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [price, setPrice] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txHash: string } | null>(null);

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

      const response = await fetch(`${backendUrl}/api/pay/${sessionId}/${addr}`);
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
  };

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">member payment</div>
        <h1 className="text-2xl font-medium text-zinc-100">Pay your share</h1>
        <p className="font-mono text-xs text-zinc-500">Session {truncateAddress(sessionId, 10, 6)}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Payment details</CardTitle>
            <DashboardBadge variant={member?.paid ? "paid" : "pending"}>{member?.paid ? "paid" : "pending"}</DashboardBadge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payment details...
            </div>
          ) : null}

          {!loading && member ? (
            <>
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
                  <span>Member wallet</span>
                  <span>{truncateAddress(member.address)}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
                  <span>Amount due</span>
                  <span className="text-zinc-100">${formatUsdcPrecise(price?.blockchainAmount ?? member.amount)}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
                  <span>Total session</span>
                  <span className="text-zinc-100">${formatUsdcPrecise(session?.total ?? "0")}</span>
                </div>
              </div>

              {session?.receipt.items?.length ? (
                <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Receipt summary</div>
                  {session.receipt.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-center justify-between font-mono text-xs text-zinc-300">
                      <span>{item.quantity && item.quantity > 1 ? `${item.quantity} x ${item.name}` : item.name}</span>
                      <span>${item.amount}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {error ? <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}

              {success ? (
                <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Payment recorded successfully.
                  </div>
                  {success.txHash ? <div className="mt-2 font-mono text-xs break-all text-green-200">{success.txHash}</div> : null}
                </div>
              ) : null}

              <div className="flex gap-3">
                <Button type="button" className="flex-1" onClick={onPay} disabled={paying || !!member.paid}>
                  {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {member.paid ? "Already paid" : paying ? "Processing..." : "Pay now"}
                </Button>
                <Button type="button" variant="outline" onClick={copyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </>
          ) : null}

          {!loading && !member && !error ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              This payment link does not match a member in the session.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
