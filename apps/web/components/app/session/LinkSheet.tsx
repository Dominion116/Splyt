"use client";

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
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">Pay link</h2>
        </div>
      </motion.div>
    </div>
  );
}
