"use client";

import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";

export default function ScanPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 pt-6">
        <Link
          href="/app"
          aria-label="Back to home"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={16} />
        </Link>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Scan</span>
        <span className="h-9 w-9" aria-hidden />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Camera size={26} />
        </div>
        <h1 className="text-2xl font-medium tracking-tight">Scan a receipt</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          The camera + receipt parser ships in the next milestone. The flow plugs into{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">POST /api/parse</code>.
        </p>
      </div>
    </div>
  );
}
