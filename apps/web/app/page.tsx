"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BarChart3, Camera, Code2, Plus, ScanLine, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CONTRACT_ADDRESS } from "@/lib/celo-contract";

const terminalLines = [
  "[agent] Receipt image received",
  "[vision] Parsing 7 line items...",
  "[agent] Total: $47.50 · Members: 4",
  "[split] Equal split: $11.88 each",
  "[chain] Session 0xabc... created on Celo",
  "[direct] Payment request → 0x1a2b...3c4d",
  "[direct] Payment request → 0x9f8e...7d6c",
  "[done] All payments completed"
];

const flow: { title: string; copy: string; Icon: typeof Camera }[] = [
  { title: "Snap", copy: "Take a photo of any receipt: paper, PDF, or screenshot.", Icon: Camera },
  { title: "Parse", copy: "Splyt's vision agent reads every line item in seconds.", Icon: ScanLine },
  { title: "Pay", copy: "Each friend pays their share in stablecoin, automatically.", Icon: Wallet }
];

const stats: { value: string; label: string; description: string; Icon: typeof Camera; size: "lg" | "sm" }[] = [
  {
    label: "Item-level accuracy",
    value: "98%",
    description: "Receipts parsed correctly on the first try by Splyt's vision agent.",
    Icon: ScanLine,
    size: "lg"
  },
  {
    label: "Settled on-chain",
    value: "100%",
    description: "Every share lands as cUSD in your wallet — no off-chain IOUs.",
    Icon: ShieldCheck,
    size: "sm"
  },
  {
    label: "Platform fee",
    value: "0%",
    description: "Splyt takes nothing. You pay only Celo gas, about $0.001 a transfer.",
    Icon: Wallet,
    size: "sm"
  }
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Do I need a crypto wallet to use Splyt?",
    a: "Yes. Splyt runs on Celo, so each member pays from a wallet holding cUSD. Inside MiniPay (the Opera mini-app browser) the wallet is already set up; outside MiniPay any EVM wallet like MetaMask works."
  },
  {
    q: "Why Celo and not a regular payment app?",
    a: "Celo gas is around $0.001 per transfer, settlement is sub-second, and cUSD is a stablecoin pegged to the US dollar. Splitting a $12 dinner doesn't cost you 30 cents in fees, and there's no waiting on a bank to clear."
  },
  {
    q: "What if a friend doesn't pay their share?",
    a: "Each share is held by the Splyt smart contract until everyone has paid. The host can only withdraw the full amount once every member has settled, so no one gets stuck holding the bag."
  },
  {
    q: "Is my receipt data private?",
    a: "Receipts are parsed by an AI vision model and the line items are stored with your session so members can see what they're paying for. Only your Celo address and the amount are visible on-chain."
  },
  {
    q: "How accurate is the AI receipt parser?",
    a: "Splyt's vision agent reads about 98% of receipts correctly on the first try, including multi-quantity items and tax. You can review and adjust everything before sending payment requests."
  },
  {
    q: "What does it cost to use Splyt?",
    a: "Splyt charges no platform fee. You only pay Celo network gas, which is typically a fraction of a cent per transaction. There are no subscriptions or per-split charges."
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window === "undefined") return;
    if (!window.ethereum?.request) {
      setConnectError("No wallet provider detected. Install MetaMask or open in MiniPay.");
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const list = Array.isArray(accounts) ? accounts.filter((a): a is string => typeof a === "string") : [];
      if (!list[0]) throw new Error("No wallet account returned.");
      window.localStorage.setItem("splyt.wallet", list[0]);
      router.push("/dashboard");
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <nav
        aria-label="Primary"
        className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-1.5 font-semibold tracking-tight">
            <span className="text-lg">splyt</span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="#how"
              className="hidden h-9 items-center rounded-full px-4 text-sm font-medium text-foreground hover:bg-surface-muted sm:inline-flex"
            >
              How it works
            </a>
            <ThemeToggle />
            <Button onClick={connectWallet} loading={connecting} size="sm">
              Connect wallet
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div aria-hidden="true" className="aurora pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden="true" className="grid-overlay pointer-events-none absolute inset-0 -z-10 opacity-50" />

        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-32">
          <div className="min-w-0 animate-fade-in-up">
            <Badge variant="primary" dot className="mb-6">
              Built on Celo · MiniPay native
            </Badge>
            <h1 id="hero-title" className="text-display-xl text-foreground">
              Bills shouldn&apos;t
              <br />
              be <span className="text-primary">awkward</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Snap a receipt. Splyt&apos;s AI parses every line. Friends pay their share in
              stablecoin: instantly, automatically, on-chain.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={connectWallet}
                loading={connecting}
              >
                {connecting ? "Connecting" : "Get started"}
              </Button>
              <a
                href="https://github.com/Dominion116/Splyt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-surface px-7 text-base font-medium text-foreground transition-colors hover:bg-surface-muted"
              >
                <Code2 className="h-4 w-4" aria-hidden="true" />
                View on GitHub
              </a>
            </div>
            {connectError ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {connectError}
              </p>
            ) : null}

            {/* Trust row */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["Ada", "Mei", "Jonah", "Rae"].map((n) => (
                  <Avatar key={n} name={n} size="sm" className="ring-2 ring-background" />
                ))}
              </div>
              <span>Trusted by groups splitting brunch, rent, and trips.</span>
            </div>
          </div>

          {/* Phone-style preview */}
          <div className="relative min-w-0 animate-fade-in-up [animation-delay:120ms]">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-4 -z-10 rounded-[36px] bg-gradient-to-br from-primary/15 via-transparent to-accent/15 blur-2xl sm:-inset-6" />
            <Card padding="none" className="overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">splyt-agent</span>
                <Badge variant="success" dot className="text-[10px]">live</Badge>
              </div>

              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Tonight&apos;s dinner</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">$47.50</p>
                  </div>
                  <Badge variant="primary">4 friends</Badge>
                </div>
                <Separator />
                <ul className="min-w-0 space-y-2 overflow-hidden font-mono text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
                  {terminalLines.map((line, i) => (
                    <li
                      key={line}
                      className="terminal-line max-w-full"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-primary-soft p-3">
                    <p className="text-[11px] uppercase tracking-wider text-primary/80">Each pays</p>
                    <p className="mt-1 font-semibold text-primary">$11.88</p>
                  </div>
                  <div className="rounded-md bg-accent-soft p-3">
                    <p className="text-[11px] uppercase tracking-wider text-accent/80">Settled</p>
                    <p className="mt-1 font-semibold text-accent">on-chain</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" aria-labelledby="how-title" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">How it works</p>
          <h2 id="how-title" className="mt-3 text-display-md">Three steps. Zero awkwardness.</h2>
          <p className="mt-3 text-muted-foreground">
            From scribbled receipts to settled payments in under a minute. No spreadsheets,
            no Venmo nudges, no &quot;I&apos;ll get you back later.&quot;
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {flow.map(({ title, copy, Icon }, i) => (
            <Card key={title} padding="lg" className="group transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats — bento layout */}
      <section aria-labelledby="stats-title" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Left: heading + supporting copy */}
          <div className="lg:py-6">
            <Badge variant="primary" className="mb-5 inline-flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
              Performance stats
            </Badge>
            <h2 id="stats-title" className="text-display-md text-foreground">
              Proven by groups
              <br />
              that actually settle.
            </h2>
            <p className="mt-5 max-w-md text-base text-muted-foreground">
              Faster checkouts, smaller bills, zero awkward reminders — the numbers behind
              every Splyt session.
            </p>
            <a
              href="#how"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Explore the full flow
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>

            {/* Trust row */}
            <div className="mt-12 hidden items-center gap-3 lg:flex">
              <div className="flex -space-x-2">
                {["Ada", "Mei", "Jonah", "Rae"].map((n) => (
                  <Avatar key={n} name={n} size="sm" className="ring-2 ring-background" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Loved by groups</span> splitting brunch, rent, and trips.
              </span>
            </div>
          </div>

          {/* Right: bento grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {stats.map((stat) => {
              const { Icon } = stat;
              return (
                <Card
                  key={stat.label}
                  padding="none"
                  variant="muted"
                  className={`flex flex-col justify-between p-6 sm:p-7 ${
                    stat.size === "lg" ? "col-span-2 min-h-[220px]" : "min-h-[200px]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {stat.label}
                  </div>
                  <div>
                    <p className="text-display-lg font-semibold tracking-tight text-foreground">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{stat.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">FAQ</p>
          <h2 id="faq-title" className="mt-3 text-display-md">Questions, answered.</h2>
          <p className="mt-3 text-muted-foreground">
            Everything you might wonder before splitting your first bill on Splyt.
          </p>
        </div>
        <ul className="space-y-3">
          {faqs.map((faq) => (
            <li key={faq.q}>
              <details className="group rounded-xl border border-border bg-surface p-5 transition-colors open:bg-surface-muted">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-foreground">
                  <span>{faq.q}</span>
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground transition-transform group-open:rotate-45 group-open:bg-primary-soft group-open:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <Separator />
      <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold tracking-tight text-foreground">splyt</span>
          <span>· {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-5">
          <a className="hover:text-foreground" href="https://github.com/Dominion116/Splyt" target="_blank" rel="noreferrer">GitHub</a>
          <a className="hover:text-foreground" href="#">Docs</a>
          <a
            className="hover:text-foreground"
            href={`https://celoscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            Celoscan
          </a>
        </div>
      </footer>
    </main>
  );
}
