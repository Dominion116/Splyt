"use client";

import { useEffect, useState } from "react";

interface Props {
  expiresAt: number;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function ExpiryBanner({ expiresAt }: Props) {
  const [remaining, setRemaining] = useState(expiresAt - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(expiresAt - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining > TEN_MINUTES_MS || remaining <= 0) return null;

  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400 animate-pulse"
    >
      <span className="font-medium">⚠ Session closes in {formatted}</span>
      <span className="text-amber-500/70">— share payment links now.</span>
    </div>
  );
}
