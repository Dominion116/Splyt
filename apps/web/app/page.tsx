"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const terminalLines = [
  "[agent] Receipt image received",
  "[vision] Parsing 7 line items...",
  "[agent] Total: $47.50 | Members: 4",
  "[split] Equal split: $11.88 each",
  "[chain] Session 0xabc... created on Celo",
  "[direct] Payment request sent to 0x1a2b...3c4d",
  "[direct] Payment request sent to 0x9f8e...7d6c",
  "[done] All payments completed"
];

export default function LandingPage() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window === "undefined") return;

    if (!window.ethereum?.request) {
      setConnectError("No wallet provider detected.");
      return;
    }

    setConnecting(true);
    setConnectError(null);

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const list = Array.isArray(accounts) ? accounts.filter((account): account is string => typeof account === "string") : [];

      if (!list[0]) {
        throw new Error("No wallet account returned.");
      }

      window.localStorage.setItem("splyt.wallet", list[0]);
      router.push("/dashboard");
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <span className="font-mono text-xl font-semibold tracking-tight text-indigo-400">splyt</span>
          <Button variant="outline" size="sm" className="font-mono text-xs">
            Connect Wallet
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16">
        <Badge variant="outline" className="mb-8 border-indigo-500/30 bg-indigo-500/10 font-mono text-xs text-indigo-300">
          Built on Celo  •  Direct Payments  •  MiniPay Native
        </Badge>
        <h1 className="mb-6 text-5xl font-medium tracking-tight sm:text-6xl">
          Split the bill.
          <br />
          Not the friendship.
        </h1>
        <p className="mb-10 max-w-md text-zinc-400">
          Snap a receipt. AI parses it. Everyone pays their share via stablecoin — automatically.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button className="font-mono" onClick={connectWallet} disabled={connecting}>
            {connecting ? "Connecting..." : "Connect Wallet"}
          </Button>
          <Button variant="outline" className="font-mono">
            View on GitHub
          </Button>
        </div>
        {connectError ? <p className="mt-3 font-mono text-xs text-red-400">{connectError}</p> : null}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Snap", desc: "Photo your receipt" },
            { title: "Parse", desc: "AI extracts every line item" },
            { title: "Splyt", desc: "Everyone pays on-chain" }
          ].map((step, index) => (
            <div key={step.title} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <p className="mb-3 font-mono text-xs text-zinc-600">0{index + 1}</p>
              <p className="mb-2 font-medium">{step.title}</p>
              <p className="text-sm text-zinc-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-zinc-700" />
            <span className="h-3 w-3 rounded-full bg-zinc-700" />
            <span className="h-3 w-3 rounded-full bg-zinc-700" />
            <span className="ml-2 font-mono text-xs text-zinc-500">splyt-agent</span>
          </div>
          <div className="space-y-2 bg-zinc-950 p-6 font-mono text-sm text-zinc-400">
            {terminalLines.map((line, index) => (
              <p key={line} className="terminal-line" style={{ animationDelay: `${index * 0.2}s` }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-3 divide-x divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
          {[
            { value: "$0.001", label: "gas per tx" },
            { value: "~1s", label: "finality" },
            { value: "$0.00", label: "platform fee" }
          ].map((stat) => (
            <div key={stat.label} className="bg-zinc-900 p-6 text-center">
              <p className="font-mono text-3xl text-indigo-400">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-6 font-medium">Built with the right tools</h2>
        <div className="flex flex-wrap gap-2">
          {["Celo L2", "Direct Payments", "MiniPay", "Groq AI", "Solidity", "Next.js"].map((t) => (
            <Badge key={t} className="rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-300">
              {t}
            </Badge>
          ))}
        </div>
      </section>

      <Separator />
      <footer className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-xs font-mono text-zinc-600">
        <span className="text-sm font-semibold tracking-tight text-zinc-300">splyt</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-zinc-400">
            GitHub
          </a>
          <a href="#" className="hover:text-zinc-400">
            Docs
          </a>
          <a href="#" className="hover:text-zinc-400">
            Celoscan
          </a>
        </div>
      </footer>
    </main>
  );
}
