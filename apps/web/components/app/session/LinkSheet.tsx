"use client";

import { Check, Copy, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  link: string;
  onClose: () => void;
}

export function LinkSheet({ link, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, link, { width: 200 }).catch(() => {});
    }
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex w-full max-w-[420px] flex-col gap-5 rounded-2xl border border-border/40 bg-card p-6"
        role="dialog"
        aria-label="Payment link"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">Pay link</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-muted-foreground transition hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Payment link</span>
          <p className="break-all rounded-xl border border-border/40 bg-background px-3 py-2.5 font-mono text-xs">
            {link}
          </p>
        </div>

        <div className="flex justify-center">
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
