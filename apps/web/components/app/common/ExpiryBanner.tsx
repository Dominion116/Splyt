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

  return null;
}
