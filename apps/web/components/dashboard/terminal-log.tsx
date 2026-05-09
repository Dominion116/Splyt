"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TerminalLine {
  tag: string;
  tagColor: string;
  text: string;
}

export function TerminalLog({
  lines,
  animateIn = false,
  live = false,
  className
}: {
  lines: TerminalLine[];
  animateIn?: boolean;
  live?: boolean;
  className?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(animateIn ? 0 : lines.length);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!animateIn) {
      setVisibleCount(lines.length);
      return;
    }

    setVisibleCount(0);
    const timers = lines.map((_, index) =>
      window.setTimeout(() => {
        setVisibleCount((current) => Math.max(current, index + 1));
      }, index * 300)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [animateIn, lines]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleCount, lines.length]);

  const visibleLines = useMemo(() => lines.slice(0, visibleCount), [lines, visibleCount]);

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface text-[11px] text-muted-foreground shadow-xs",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-2.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-danger/60" />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-2 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          {live ? (
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          ) : null}
          splyt-agent
        </span>
      </div>
      <div className="space-y-1.5 p-4 font-mono">
        {visibleLines.map((line) => (
          <p key={`${line.tag}-${line.text}`} className="flex gap-2">
            <span className={cn("shrink-0", line.tagColor)}>{line.tag}</span>
            <span className="text-foreground/80">{line.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
