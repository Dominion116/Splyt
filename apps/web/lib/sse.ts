"use client";

import { useEffect, useRef, useState } from "react";
import { statusStreamUrl } from "./api";
import type { LiveSession } from "./types";

interface StreamState {
  data: LiveSession | null;
  error: string | null;
  connected: boolean;
}

export function useSessionStream(sessionId: string | null): StreamState {
  const [state, setState] = useState<StreamState>({
    data: null,
    error: null,
    connected: false
  });
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      source = new EventSource(statusStreamUrl(sessionId));

      source.onopen = () => {
        attemptRef.current = 0;
        if (!cancelled) setState((prev) => ({ ...prev, connected: true, error: null }));
      };

      source.onmessage = (event) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(event.data) as LiveSession & { error?: string };
          if (parsed.error) {
            setState((prev) => ({ ...prev, error: parsed.error ?? "Live updates unavailable" }));
            return;
          }
          setState({ data: parsed, error: null, connected: true });
        } catch {
          // ignore malformed event
        }
      };

      source.onerror = () => {
        if (cancelled) return;
        source?.close();
        setState((prev) => ({ ...prev, connected: false }));
        const attempt = (attemptRef.current = Math.min(attemptRef.current + 1, 5));
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
    };
  }, [sessionId]);

  return state;
}
