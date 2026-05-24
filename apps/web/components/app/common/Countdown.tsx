"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { formatCountdown } from "@/lib/format";

export function Countdown({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = expiresAt - now;
  const expired = remaining <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${
        expired ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      <Timer size={12} />
      {formatCountdown(remaining)}
    </span>
  );
}
