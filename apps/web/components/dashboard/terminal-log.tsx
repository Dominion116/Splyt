"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TerminalLine {
  tag: string;
  tagColor: string;
  text: string;
}

export function TerminalLog({ lines, animateIn = false, live = false, className }: { lines: TerminalLine[]; animateIn?: boolean; live?: boolean; className?: string }) {
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
    <div ref={scrollRef} className={cn("overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] text-zinc-400", className)}>
      <div className="mb-3 flex items-center gap-2 border-b border-zinc-800 pb-3">
        <span className="h-2.5 w-2.5 rounded-md bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-md bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-md bg-zinc-700" />
        <span className={cn("ml-2 text-zinc-500", live ? "flex items-center gap-1" : "")}>{live ? <span className="inline-block h-2 w-2 rounded-md bg-green-500" /> : null}splyt-agent</span>
      </div>
      <div className="space-y-2">
        {visibleLines.map((line) => (
          <p key={`${line.tag}-${line.text}`} className="flex gap-2 opacity-100 transition-all duration-300">
            <span className={cn("shrink-0", line.tagColor)}>{line.tag}</span>
            <span className="text-zinc-400">{line.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
