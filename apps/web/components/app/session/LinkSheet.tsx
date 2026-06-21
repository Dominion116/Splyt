"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  link: string;
  onClose: () => void;
}

export function LinkSheet({ link, onClose }: Props) {
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

        <canvas className="rounded-xl" />
      </motion.div>
    </div>
  );
}
