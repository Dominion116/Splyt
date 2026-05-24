"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const STEPS = ["scan", "review", "members", "split"] as const;
export type FlowStep = (typeof STEPS)[number];

interface Props {
  step: FlowStep;
  label?: string;
}

export function FlowHeader({ step, label }: Props) {
  const router = useRouter();
  const idx = STEPS.indexOf(step);
  const percent = ((idx + 1) / STEPS.length) * 100;

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 bg-background/80 px-5 pt-6 pb-3 backdrop-blur-lg">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label ?? step}
        </span>
        <span className="h-9 w-9" aria-hidden />
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </header>
  );
}
